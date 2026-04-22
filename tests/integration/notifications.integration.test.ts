import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Covers the class of silent-drop bug we've already shipped twice:
//   - the asset_versions ↔ assets ambiguous FK embed (PR #19)
//   - the Stripe webhook early-return without logging (PR #21)
// Neither would have escaped to prod with a test that exercised the
// notifier helpers end-to-end against a real DB. This suite is that test.
//
// Flow:
//   1. Seed a workspace with an admin + client + reviewer + project + asset
//      + current version, all via service role.
//   2. Call notifyNewAssetUploadedFromVersion(versionId) directly — no
//      need to go through the Server Action; we're verifying the notifier,
//      not the upload path.
//   3. Assert a `new_asset_uploaded` row landed in `notifications`, keyed
//      to the reviewer's email.
//   4. Insert a decision row directly (service role bypasses the submit_decision
//      RPC's auth.uid() requirement), then call notifyDecisionSubmitted and
//      assert a `decision_submitted` row lands, keyed to the admin's email.
//
// Resend is intentionally not required. When RESEND_API_KEY is unset
// lib/email.ts returns a dev-noop and the row gets sent_at. When it IS
// set (local dev), Resend may refuse the fake @creativereview.test
// addresses — so we assert row existence + payload shape, NOT sent_at.
// The notifier-wiring bugs we're guarding against (silent early returns,
// ambiguous FK embeds) are all about the row failing to appear at all.

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeIfReady = SERVICE_ROLE ? describe : describe.skip;

describeIfReady("notifications — fan-out integration", () => {
  const nonce = Math.random().toString(36).slice(2, 8);
  let service: SupabaseClient<Database>;
  let workspaceId: string;
  let clientId: string;
  let projectId: string;
  let assetId: string;
  let versionId: string;
  let reviewerEmail: string;
  let adminEmail: string;
  let adminUserId: string;

  beforeAll(async () => {
    service = createClient<Database>(URL_ENV, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    adminEmail = `notify-admin-${nonce}@creativereview.test`;
    reviewerEmail = `notify-reviewer-${nonce}@creativereview.test`;

    const { data: createdUser, error: userErr } = await service.auth.admin.createUser({
      email: adminEmail,
      password: "notify-test-password-1234",
      email_confirm: true,
    });
    if (userErr || !createdUser.user) throw userErr ?? new Error("no user");
    adminUserId = createdUser.user.id;

    const { data: ws, error: wsErr } = await service
      .from("workspaces")
      .insert({ name: `notify-ws-${nonce}` })
      .select("id")
      .single();
    if (wsErr || !ws) throw wsErr ?? new Error("no workspace");
    workspaceId = ws.id;

    await service.from("admin_profiles").insert({
      user_id: adminUserId,
      workspace_id: workspaceId,
      role: "owner",
    });

    const { data: c } = await service
      .from("clients")
      .insert({
        workspace_id: workspaceId,
        name: `notify-client-${nonce}`,
        primary_email: `client-${nonce}@example.com`,
      })
      .select("id")
      .single();
    clientId = c!.id;

    await service
      .from("client_reviewers")
      .insert({
        client_id: clientId,
        email: reviewerEmail,
        name: "Notify Reviewer",
      });

    const { data: p } = await service
      .from("projects")
      .insert({ client_id: clientId, name: `notify-project-${nonce}` })
      .select("id")
      .single();
    projectId = p!.id;

    const { data: a } = await service
      .from("assets")
      .insert({
        project_id: projectId,
        name: `notify-asset-${nonce}`,
        type: "image",
      })
      .select("id")
      .single();
    assetId = a!.id;

    const { data: v } = await service
      .from("asset_versions")
      .insert({
        asset_id: assetId,
        version_number: 1,
        storage_path: `${workspaceId}/${assetId}/v1/test.png`,
      })
      .select("id")
      .single();
    versionId = v!.id;

    await service
      .from("assets")
      .update({ current_version_id: versionId })
      .eq("id", assetId);
  });

  afterAll(async () => {
    // Cascades through clients → projects → assets → versions via the
    // workspace FK; auth user has to be removed explicitly.
    await service.from("workspaces").delete().eq("id", workspaceId);
    if (adminUserId) {
      await service.auth.admin.deleteUser(adminUserId).catch(() => {});
    }
  });

  it("new asset upload → notifications row keyed to the reviewer", async () => {
    // Dynamic import so dotenv in setup.ts has a chance to populate process.env
    // before lib/env.server's Proxy caches values.
    const { notifyNewAssetUploadedFromVersion } = await import(
      "@/lib/notifications"
    );
    await notifyNewAssetUploadedFromVersion(versionId);

    const { data: rows, error } = await service
      .from("notifications")
      .select("kind, recipient_email, sent_at, payload_json")
      .eq("kind", "new_asset_uploaded")
      .eq("recipient_email", reviewerEmail);
    expect(error).toBeNull();
    expect(rows).not.toBeNull();
    expect(rows!.length).toBe(1);

    const payload = rows![0].payload_json as {
      asset_id: string;
      workspace_id: string;
    } | null;
    expect(payload?.asset_id).toBe(assetId);
    expect(payload?.workspace_id).toBe(workspaceId);
  });

  it("decision submitted → notifications row keyed to the admin", async () => {
    // Look up the seeded reviewer id so we can insert a decision attributed
    // to them. Service role bypasses RLS + we skip the submit_decision RPC
    // (which requires auth.uid()).
    const { data: reviewer } = await service
      .from("client_reviewers")
      .select("id")
      .eq("email", reviewerEmail)
      .single();

    await service.from("decisions").insert({
      asset_version_id: versionId,
      reviewer_id: reviewer!.id,
      verdict: "approve",
      feedback_text: null,
    });

    const { notifyDecisionSubmitted } = await import("@/lib/notifications");
    await notifyDecisionSubmitted({ asset_version_id: versionId });

    const { data: rows, error } = await service
      .from("notifications")
      .select("kind, recipient_email, sent_at, payload_json")
      .eq("kind", "decision_submitted")
      .eq("recipient_email", adminEmail);
    expect(error).toBeNull();
    expect(rows).not.toBeNull();
    expect(rows!.length).toBe(1);

    const payload = rows![0].payload_json as {
      asset_id: string;
      verdict: string;
    } | null;
    expect(payload?.asset_id).toBe(assetId);
    expect(payload?.verdict).toBe("approve");
  });
});
