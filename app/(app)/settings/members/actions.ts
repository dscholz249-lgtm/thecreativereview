"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/admin-client";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { PLAN_LIMITS, formatLimit } from "@/lib/plans";
import { PLAN_LABELS } from "@/lib/stripe/config";
import AdminInviteEmail from "@/emails/admin-invite";

const INVITE_TOKEN_TTL_DAYS = 30;

const InviteAdminSchema = z.object({
  email: z.string().trim().email(),
});

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

// Seat cap: counts accepted admin_profiles + non-expired, non-accepted
// admin_invites. Pending invites reserve a seat (design decision) so an
// owner can't shotgun more than the plan allows and rely on churn to
// smooth it out.
async function seatsInUse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
): Promise<number> {
  const [profilesQ, invitesQ] = await Promise.all([
    supabase
      .from("admin_profiles")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("admin_invites")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("accepted_at", null)
      .gt("invite_expires_at", new Date().toISOString()),
  ]);
  return (profilesQ.count ?? 0) + (invitesQ.count ?? 0);
}

export async function inviteAdminAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = InviteAdminSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please enter a valid email." };
  }

  const supabase = await createClient();
  const {
    data: { user: inviter },
  } = await supabase.auth.getUser();
  if (!inviter) return { ok: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("workspace_id, name, workspaces(name, plan)")
    .eq("user_id", inviter.id)
    .maybeSingle();
  if (!profile) return { ok: false, error: "No workspace found." };

  const workspace = profile.workspaces as unknown as {
    name: string;
    plan: keyof typeof PLAN_LIMITS;
  } | null;
  const plan = workspace?.plan ?? "oss";
  const seatCap = PLAN_LIMITS[plan].adminSeats;

  if (Number.isFinite(seatCap)) {
    const inUse = await seatsInUse(supabase, profile.workspace_id);
    if (inUse >= seatCap) {
      return {
        ok: false,
        error: `Your ${PLAN_LABELS[plan]} plan includes ${formatLimit(seatCap)} admin ${seatCap === 1 ? "seat" : "seats"}. Upgrade from Billing to add more.`,
      };
    }
  }

  const existingEmail = parsed.data.email.toLowerCase();

  // Reject re-inviting someone who already has an admin_profile — the
  // current schema (admin_profiles.user_id PRIMARY KEY) enforces one
  // workspace per user. Bounces back with a clear message instead of a
  // FK constraint violation after they click the magic link.
  const admin = createAdminClient();
  const { data: userList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existingUser = (userList?.users ?? []).find(
    (u) => u.email?.toLowerCase() === existingEmail,
  );
  if (existingUser) {
    const { data: otherProfile } = await supabase
      .from("admin_profiles")
      .select("workspace_id")
      .eq("user_id", existingUser.id)
      .maybeSingle();
    if (otherProfile) {
      if (otherProfile.workspace_id === profile.workspace_id) {
        return {
          ok: false,
          error: "That email is already an admin on this workspace.",
        };
      }
      return {
        ok: false,
        error:
          "That email already owns a different workspace. They'll need a different email for a second workspace, or ask them to delete theirs first.",
      };
    }
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(
    Date.now() + INVITE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error: upsertError } = await supabase
    .from("admin_invites")
    .upsert(
      {
        workspace_id: profile.workspace_id,
        email: existingEmail,
        role: "member",
        invite_token: token,
        invite_expires_at: expiresAt,
        invited_by_user_id: inviter.id,
        accepted_at: null,
      },
      { onConflict: "workspace_id,email" },
    );
  if (upsertError) return { ok: false, error: upsertError.message };

  const signInUrl = `${env.NEXT_PUBLIC_APP_URL}/admin-invite/${token}`;

  const emailResult = await sendEmail({
    to: existingEmail,
    subject: `${workspace?.name ?? "Creative Review"} invited you as an admin`,
    react: AdminInviteEmail({
      workspaceName: workspace?.name ?? "Creative Review",
      inviterName: profile.name ?? null,
      signInUrl,
    }),
  });

  if (!emailResult.ok) {
    return { ok: false, error: `Could not send invite email: ${emailResult.error}` };
  }

  revalidatePath("/settings/members");
  return { ok: true, message: `Invite sent to ${existingEmail}.` };
}

export async function revokeAdminInviteAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("admin_invites").delete().eq("id", id);
  revalidatePath("/settings/members");
}

export async function removeAdminAction(formData: FormData): Promise<void> {
  const userId = z.string().uuid().parse(formData.get("user_id"));
  const supabase = await createClient();

  // Can't remove the last owner of a workspace — leaves an orphan.
  // RLS scopes both queries to the caller's workspace.
  const { data: target } = await supabase
    .from("admin_profiles")
    .select("role, workspace_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) return;

  if (target.role === "owner") {
    const { count: ownerCount } = await supabase
      .from("admin_profiles")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", target.workspace_id)
      .eq("role", "owner");
    if ((ownerCount ?? 0) <= 1) {
      // Silent no-op — UI keeps the Remove button disabled on the last
      // owner, but defense-in-depth here in case a crafted FormData
      // sneaks through.
      return;
    }
  }

  await supabase.from("admin_profiles").delete().eq("user_id", userId);
  revalidatePath("/settings/members");
}
