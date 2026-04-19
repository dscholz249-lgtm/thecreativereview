"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/admin-client";
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

  // Authenticated server client (RLS-scoped) loads the surrounding context so
  // the email has a real workspace + inviter name. The service-role client
  // is used only for operations the reviewer flow genuinely requires
  // (creating/linking auth.users via generateLink).
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

  // Upsert the client_reviewers row. The unique (client_id, email) constraint
  // means re-inviting the same email updates rather than duplicates.
  const { error: upsertError } = await supabase
    .from("client_reviewers")
    .upsert(
      { client_id: parsed.data.client_id, email: parsed.data.email, name: parsed.data.name ?? null },
      { onConflict: "client_id,email" },
    );
  if (upsertError) return { ok: false, error: upsertError.message };

  // Generate a magic link via the admin client. For brand-new reviewers we
  // use 'invite' (creates unconfirmed user + confirmation link); for existing
  // users we use 'magiclink'. The client_reviewers → auth.users linking
  // happens via the link_reviewer_on_auth_user trigger from milestone 3's
  // migration, so we don't wire the auth_user_id here.
  const admin = createAdminClient();
  const {
    data: existingUsers,
  } = await admin.auth.admin.listUsers({ perPage: 1, page: 1 });
  // listUsers doesn't filter by email directly, so we scan. For a small beta
  // this is fine; if it grows, switch to a dedicated lookup table.
  const allUsers = await admin.auth.admin.listUsers({ perPage: 1000, page: 1 });
  void existingUsers;
  const alreadyExists = allUsers.data.users.some(
    (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase(),
  );

  const redirectTo = `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/review/my-reviews`;
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: alreadyExists ? "magiclink" : "invite",
    email: parsed.data.email,
    options: { redirectTo },
  });
  if (linkError || !linkData) {
    return { ok: false, error: linkError?.message ?? "Failed to generate sign-in link." };
  }

  const signInUrl = linkData.properties.action_link;

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
