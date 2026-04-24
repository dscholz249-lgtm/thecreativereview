"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import ReviewerInviteEmail from "@/emails/reviewer-invite";

const InviteReviewerSchema = z.object({
  client_id: z.string().uuid(),
  email: z.string().trim().email(),
  name: z.string().trim().max(120).optional(),
});

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// How long our invite links stay clickable. Supabase's OTP caps at ~24h on
// the cloud tier; we use our own token layer so 30-day invites work without
// waiting for Supabase Dashboard config. /invite/[token] mints a fresh
// short-lived Supabase magic link at click time, so Supabase's cap only
// applies to the last-mile auth hop.
const INVITE_TOKEN_TTL_DAYS = 30;

export async function inviteReviewerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = InviteReviewerSchema.safeParse({
    client_id: formData.get("client_id"),
    email: formData.get("email"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  // RLS-scoped client loads the surrounding context so the email carries
  // workspace + inviter name. The actual invite token goes into the same
  // client_reviewers row — no service-role needed at send time.
  const supabase = await createClient();
  const {
    data: { user: inviter },
  } = await supabase.auth.getUser();
  if (!inviter) return { ok: false, error: "Not authenticated." };

  const { data: ctx } = await supabase
    .from("clients")
    .select("id, name, workspace_id, workspaces(name), projects(id, name)")
    .eq("id", parsed.data.client_id)
    .maybeSingle();
  if (!ctx) return { ok: false, error: "Client not found in your workspace." };

  const { data: inviterProfile } = await supabase
    .from("admin_profiles")
    .select("name")
    .eq("user_id", inviter.id)
    .maybeSingle();

  const workspaceName =
    (ctx.workspaces as { name: string } | null)?.name ?? "Creative Review";
  const firstProject =
    (ctx.projects as Array<{ id: string; name: string }> | null)?.[0] ?? null;

  // Mint our own invite token — 30-day expiry. Upsert the client_reviewers
  // row so re-invites refresh the token and extend the window.
  const inviteToken = randomBytes(24).toString("base64url");
  const inviteExpiresAt = new Date(
    Date.now() + INVITE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error: upsertError } = await supabase
    .from("client_reviewers")
    .upsert(
      {
        client_id: parsed.data.client_id,
        email: parsed.data.email,
        name: parsed.data.name ?? null,
        invite_token: inviteToken,
        invite_expires_at: inviteExpiresAt,
      },
      { onConflict: "client_id,email" },
    );
  if (upsertError) return { ok: false, error: upsertError.message };

  // The invite URL goes through OUR route, not Supabase's OTP directly.
  // /invite/[token] verifies the token + expiry and mints a fresh
  // short-lived Supabase magic link per click.
  const signInUrl = `${env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`;

  const emailResult = await sendEmail({
    to: parsed.data.email,
    subject: `${workspaceName} invited you to review`,
    react: ReviewerInviteEmail({
      workspaceName,
      inviterName: inviterProfile?.name ?? null,
      signInUrl,
      firstProjectName: firstProject?.name ?? null,
    }),
  });

  if (!emailResult.ok) {
    return { ok: false, error: `Could not send invite email: ${emailResult.error}` };
  }

  revalidatePath(`/clients/${parsed.data.client_id}/reviewers`);
  revalidatePath(`/clients/${parsed.data.client_id}`);
  return { ok: true, message: `Invite sent to ${parsed.data.email}.` };
}

export async function removeReviewerAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().parse(formData.get("id"));
  const clientId = z.string().uuid().parse(formData.get("client_id"));
  const supabase = await createClient();
  await supabase.from("client_reviewers").delete().eq("id", id);
  revalidatePath(`/clients/${clientId}/reviewers`);
}
