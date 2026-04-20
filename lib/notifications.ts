import "server-only";

import { createAdminClient } from "@/server/admin-client";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { track } from "@/lib/analytics";
import type { Json } from "@/lib/database.types";
import NewAssetUploadedEmail from "@/emails/new-asset-uploaded";
import DecisionSubmittedEmail from "@/emails/decision-submitted";
import ProjectCompletedEmail from "@/emails/project-completed";
import ManualReminderEmail from "@/emails/manual-reminder";

// Notification dispatch. Every notify* helper:
//   1. Uses the service-role client — the actor (admin uploading, reviewer
//      deciding) cannot read the recipients' rows under their own RLS context
//      (e.g. a reviewer cannot read admin_profiles for the workspace).
//   2. Is best-effort — a Resend failure does NOT fail the originating
//      Server Action. We log and move on; Sentry breadcrumbs surface the rest.
//   3. Inserts a `notifications` row per recipient for audit + future
//      rate-limiting/idempotency. `notifications` is service-role-only.
//
// Every helper also fires the matching Amplitude event so PRD §9 stays in sync.

export async function notifyNewAssetUploadedFromVersion(
  versionId: string,
): Promise<void> {
  const admin = createAdminClient();

  // `assets` has TWO foreign keys touching asset_versions:
  //   1. asset_versions.asset_id → assets.id           (the "belongs to" direction)
  //   2. assets.current_version_id → asset_versions.id (back-reference)
  // Without a hint, PostgREST refuses the embed with PGRST201 ("more than one
  // relationship was found"). The constraint-name hint (`asset_versions_asset_id_fkey`)
  // pins this to FK #1 explicitly. Silent until now because we were ignoring
  // `.error` — no notifications.rows after upload.
  const { data: version, error } = await admin
    .from("asset_versions")
    .select(
      `
      id,
      upload_note,
      assets!asset_versions_asset_id_fkey!inner (
        id,
        name,
        type,
        deadline,
        projects!inner (
          id,
          name,
          clients!inner (
            id,
            name,
            workspace_id,
            workspaces!inner ( id, name )
          )
        )
      )
      `,
    )
    .eq("id", versionId)
    .maybeSingle();

  if (error) {
    console.error("[notify] new-asset version lookup failed", error);
    return;
  }
  if (!version) {
    console.warn("[notify] new-asset version not found", { versionId });
    return;
  }
  const asset = version.assets as unknown as {
    id: string;
    name: string;
    type: string;
    deadline: string | null;
    projects: {
      id: string;
      name: string;
      clients: {
        id: string;
        name: string;
        workspace_id: string;
        workspaces: { id: string; name: string };
      };
    };
  };
  const project = asset.projects;
  const client = project.clients;

  const { data: reviewers } = await admin
    .from("client_reviewers")
    .select("email, name")
    .eq("client_id", client.id);

  if (!reviewers || reviewers.length === 0) return;

  const reviewUrl = `${env.NEXT_PUBLIC_APP_URL}/review/assets/${asset.id}`;

  await Promise.all(
    reviewers.map(async (r) => {
      const sendResult = await sendEmail({
        to: r.email,
        subject: `New in ${project.name}: ${asset.name} is ready for review`,
        react: NewAssetUploadedEmail({
          workspaceName: client.workspaces.name,
          projectName: project.name,
          assetName: asset.name,
          assetType: asset.type,
          deadline: asset.deadline,
          reviewUrl,
          uploadNote: version.upload_note,
        }),
      });
      await admin.from("notifications").insert({
        kind: "new_asset_uploaded",
        recipient_email: r.email,
        payload_json: {
          asset_id: asset.id,
          project_id: project.id,
          workspace_id: client.workspace_id,
          email_result: sendResult,
        } as unknown as Json,
        sent_at: sendResult.ok ? new Date().toISOString() : null,
      });
    }),
  );

  track("asset_uploaded", {
    workspace_id: client.workspace_id,
    properties: {
      asset_id: asset.id,
      project_id: project.id,
      asset_type: asset.type,
      recipient_count: reviewers.length,
    },
  });
}

export async function notifyDecisionSubmitted(params: {
  asset_version_id: string;
}): Promise<void> {
  const admin = createAdminClient();

  // Latest decision on this version is the one we just inserted (per PRD 7.9
  // decisions are immutable, and submit_decision enforces unique reviewer
  // per version — so reading max(created_at) here is safe).
  //
  // Same two-FK issue on `asset_versions → assets` as notifyNewAssetUploaded;
  // hint pins to asset_versions_asset_id_fkey. See that helper's comment.
  const { data: decision, error } = await admin
    .from("decisions")
    .select(
      `
      id,
      verdict,
      feedback_text,
      asset_version_id,
      client_reviewers!inner ( id, email, name ),
      asset_versions!inner (
        id,
        assets!asset_versions_asset_id_fkey!inner (
          id,
          name,
          projects!inner (
            id,
            name,
            clients!inner ( id, name, workspace_id )
          )
        )
      )
      `,
    )
    .eq("asset_version_id", params.asset_version_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[notify] decision lookup failed", error);
    return;
  }
  if (!decision) {
    console.warn("[notify] decision not found for version", {
      asset_version_id: params.asset_version_id,
    });
    return;
  }

  const reviewer = decision.client_reviewers as unknown as {
    id: string;
    email: string;
    name: string | null;
  };
  const asset = (decision.asset_versions as unknown as {
    assets: {
      id: string;
      name: string;
      projects: {
        id: string;
        name: string;
        clients: { id: string; name: string; workspace_id: string };
      };
    };
  }).assets;
  const project = asset.projects;
  const workspaceId = project.clients.workspace_id;

  const { count: annotationCount } = await admin
    .from("annotations")
    .select("*", { count: "exact", head: true })
    .eq("asset_version_id", decision.asset_version_id)
    .eq("reviewer_id", reviewer.id);

  const adminEmails = await loadAdminEmails(workspaceId);
  if (adminEmails.length === 0) return;

  const detailUrl = `${env.NEXT_PUBLIC_APP_URL}/assets/${asset.id}`;
  const subject = `${reviewer.name?.trim() || reviewer.email} ${
    decision.verdict === "approve" ? "approved" : "requested changes on"
  } ${asset.name}`;

  await Promise.all(
    adminEmails.map(async (email) => {
      const result = await sendEmail({
        to: email,
        subject,
        react: DecisionSubmittedEmail({
          reviewerName: reviewer.name ?? "",
          reviewerEmail: reviewer.email,
          assetName: asset.name,
          projectName: project.name,
          verdict: decision.verdict,
          feedbackText: decision.feedback_text,
          annotationCount: annotationCount ?? 0,
          detailUrl,
        }),
      });
      await admin.from("notifications").insert({
        kind: "decision_submitted",
        recipient_email: email,
        payload_json: {
          decision_id: decision.id,
          asset_id: asset.id,
          verdict: decision.verdict,
          workspace_id: workspaceId,
          email_result: result,
        } as unknown as Json,
        sent_at: result.ok ? new Date().toISOString() : null,
      });
    }),
  );

  track("decision_submitted", {
    workspace_id: workspaceId,
    properties: {
      verdict: decision.verdict,
      asset_id: asset.id,
      annotation_count: annotationCount ?? 0,
    },
  });
}

export async function notifyProjectCompletedIfNeeded(
  projectId: string,
): Promise<void> {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select(
      `
      id,
      name,
      status,
      clients!inner ( id, name, workspace_id )
      `,
    )
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.status !== "completed") return;
  const client = project.clients as unknown as {
    id: string;
    name: string;
    workspace_id: string;
  };

  const { count } = await admin
    .from("assets")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("archived", false);

  // Guard against re-sending if we already emailed for this project.
  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("kind", "project_completed")
    .contains("payload_json", { project_id: projectId })
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const adminEmails = await loadAdminEmails(client.workspace_id);
  if (adminEmails.length === 0) return;

  const projectUrl = `${env.NEXT_PUBLIC_APP_URL}/projects/${project.id}`;

  await Promise.all(
    adminEmails.map(async (email) => {
      const result = await sendEmail({
        to: email,
        subject: `${project.name} is complete`,
        react: ProjectCompletedEmail({
          projectName: project.name,
          clientName: client.name,
          approvedCount: count ?? 0,
          projectUrl,
        }),
      });
      await admin.from("notifications").insert({
        kind: "project_completed",
        recipient_email: email,
        payload_json: {
          project_id: project.id,
          workspace_id: client.workspace_id,
          approved_count: count ?? 0,
          email_result: result,
        } as unknown as Json,
        sent_at: result.ok ? new Date().toISOString() : null,
      });
    }),
  );

  track("project_completed", {
    workspace_id: client.workspace_id,
    properties: { project_id: project.id, approved_count: count ?? 0 },
  });
}

export async function sendManualReminder(params: {
  project_id: string;
  requester_user_id: string;
}): Promise<{ ok: true; sent: number } | { ok: false; error: string }> {
  const admin = createAdminClient();

  // DB-level rate limit: projects.last_reminded_at updated only when it's
  // null or older than 24h. UPDATE ... RETURNING is atomic, so two concurrent
  // requests can't both win. This is the canonical enforcement — UI disables
  // the button, but a crafted FormData would otherwise sneak through.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: claimed } = await admin
    .from("projects")
    .update({ last_reminded_at: new Date().toISOString() })
    .eq("id", params.project_id)
    .or(`last_reminded_at.is.null,last_reminded_at.lt.${since}`)
    .select(
      `
      id,
      name,
      clients!inner ( id, name, workspace_id, workspaces!inner ( id, name ) )
      `,
    )
    .maybeSingle();

  if (!claimed) {
    return {
      ok: false,
      error: "This project was reminded within the last 24 hours.",
    };
  }

  const client = claimed.clients as unknown as {
    id: string;
    name: string;
    workspace_id: string;
    workspaces: { id: string; name: string };
  };

  // Pending items = non-archived assets in the project with status 'pending'.
  const { data: pendingAssets } = await admin
    .from("assets")
    .select("id, name, deadline")
    .eq("project_id", params.project_id)
    .eq("archived", false)
    .eq("status", "pending");

  const pendingItems =
    pendingAssets?.map((a) => ({
      assetName: a.name,
      deadline: a.deadline,
    })) ?? [];

  const { data: reviewers } = await admin
    .from("client_reviewers")
    .select("email, name")
    .eq("client_id", client.id);

  if (!reviewers || reviewers.length === 0) {
    return { ok: false, error: "This client has no reviewers yet." };
  }

  const inboxUrl = `${env.NEXT_PUBLIC_APP_URL}/review/my-reviews`;

  let sent = 0;
  await Promise.all(
    reviewers.map(async (r) => {
      const result = await sendEmail({
        to: r.email,
        subject: `${client.workspaces.name} is waiting on your review`,
        react: ManualReminderEmail({
          workspaceName: client.workspaces.name,
          projectName: claimed.name,
          pendingItems,
          inboxUrl,
        }),
      });
      if (result.ok) sent += 1;
      await admin.from("notifications").insert({
        kind: "manual_reminder",
        recipient_email: r.email,
        payload_json: {
          project_id: claimed.id,
          workspace_id: client.workspace_id,
          requester_user_id: params.requester_user_id,
          email_result: result,
        } as unknown as Json,
        sent_at: result.ok ? new Date().toISOString() : null,
      });
    }),
  );

  track("reminder_sent", {
    user_id: params.requester_user_id,
    workspace_id: client.workspace_id,
    properties: {
      project_id: claimed.id,
      recipient_count: reviewers.length,
      pending_count: pendingItems.length,
    },
  });

  return { ok: true, sent };
}

// Helper — loads the email addresses of every admin in a workspace. Goes
// through admin.auth.admin to get the email (admin_profiles has no email
// column — Supabase Auth owns the canonical email).
async function loadAdminEmails(workspaceId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("admin_profiles")
    .select("user_id")
    .eq("workspace_id", workspaceId);
  if (!profiles || profiles.length === 0) return [];

  const ids = new Set(profiles.map((p) => p.user_id));
  const emails: string[] = [];

  // listUsers doesn't support filtering by id, so paginate and filter
  // client-side. For a small beta this is fine; when the list grows past a
  // few hundred admins per workspace, move to a dedicated email column.
  let page = 1;
  const perPage = 200;
  // Cap iterations so a bug can't DoS us.
  for (let i = 0; i < 50; i++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage });
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email && ids.has(u.id)) emails.push(u.email);
    }
    if (users.length < perPage) break;
    page += 1;
  }

  return emails;
}
