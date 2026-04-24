"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/server/admin-client";
import { env } from "@/lib/env";

// Shared cookie name used by the password-setup modal in the app shell.
// Kept in sync with components/password-setup-modal.tsx + (auth)/actions.ts.
const NEEDS_PASSWORD_COOKIE = "cr_needs_password";

// Decoupling the "click Continue" work from the page render solves a real
// problem: email clients and corporate safe-link scanners prefetch the
// URL in the invite email the second it arrives. If the page eagerly
// called generateLink() in its RSC body and redirected, the scanner
// consumed the one-shot Supabase magic link before the user ever saw it,
// leaving them with an "expired link" error on their very first click.
//
// Putting the Supabase mint behind a POST-only Server Action means only
// an actual button click mints a fresh link. Scanners GET the page,
// nothing happens, the user clicks Continue, we mint + redirect.
export async function continueAdminInviteAction(
  formData: FormData,
): Promise<void> {
  const token = z.string().min(8).parse(formData.get("token"));
  const admin = createAdminClient();

  const { data: invite, error: lookupError } = await admin
    .from("admin_invites")
    .select(
      "id, workspace_id, email, role, invite_expires_at, accepted_at",
    )
    .eq("invite_token", token)
    .maybeSingle();
  if (lookupError) {
    console.error("[admin-invite.continue] lookup failed", lookupError);
    redirect(`/admin-invite/${token}?err=server`);
  }
  if (!invite) redirect(`/admin-invite/${token}?err=invalid`);

  if (new Date(invite.invite_expires_at).getTime() < Date.now()) {
    redirect(`/admin-invite/${token}?err=expired`);
  }

  const { data: userList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existingUser = (userList?.users ?? []).find(
    (u) => u.email?.toLowerCase() === invite.email.toLowerCase(),
  );

  // User exists and already has a profile — three sub-cases.
  if (existingUser) {
    const { data: existingProfile } = await admin
      .from("admin_profiles")
      .select("workspace_id")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (
      existingProfile &&
      existingProfile.workspace_id !== invite.workspace_id
    ) {
      redirect(`/admin-invite/${token}?err=other-workspace`);
    }

    if (existingProfile?.workspace_id === invite.workspace_id) {
      // Already on this workspace — signing them in is enough.
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: invite.email,
        options: {
          redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      });
      if (!linkData?.properties?.action_link) {
        redirect(`/admin-invite/${token}?err=server`);
      }
      redirect(linkData.properties.action_link);
    }

    // Existing auth user with no profile anywhere — insert profile, sign
    // them in. They already have a password, so no setup prompt.
    await admin.from("admin_profiles").insert({
      user_id: existingUser.id,
      workspace_id: invite.workspace_id,
      role: invite.role,
    });
    await admin
      .from("admin_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id)
      .is("accepted_at", null);

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: invite.email,
        options: {
          redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      });
    if (linkError || !linkData?.properties?.action_link) {
      console.error(
        "[admin-invite.continue] generateLink(magiclink) failed",
        linkError,
      );
      redirect(`/admin-invite/${token}?err=server`);
    }
    redirect(linkData.properties.action_link);
  }

  // Brand new user — mint the Supabase invite link, flag the session so
  // the shell prompts for a password on first paint. The
  // link_admin_on_accept trigger (migration 20260424140000) wires up
  // admin_profiles once the user confirms.
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "invite",
      email: invite.email,
      options: {
        redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });
  if (linkError || !linkData?.properties?.action_link) {
    console.error(
      "[admin-invite.continue] generateLink(invite) failed",
      linkError,
    );
    redirect(`/admin-invite/${token}?err=server`);
  }

  await admin
    .from("admin_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id)
    .is("accepted_at", null);

  const jar = await cookies();
  jar.set(NEEDS_PASSWORD_COOKIE, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(linkData.properties.action_link);
}
