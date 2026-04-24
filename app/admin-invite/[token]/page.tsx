import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/server/admin-client";
import { env } from "@/lib/env";
import { CreativeReviewLogo } from "@/components/creative-review-logo";

// Admin-seat invite redemption. Mirrors /invite/[token] (reviewer flow):
// our 30-day token, fresh Supabase magic link minted per click.
//
// Extra checks beyond the reviewer flow:
//   - Schema constraint (admin_profiles.user_id PRIMARY KEY) means one
//     auth user → one workspace. If the invitee already has an
//     admin_profile elsewhere, we reject here with a clear message
//     before taking them to Supabase. Prevents a successful magic-link
//     sign-in followed by a confusing FK error downstream.
//   - accepted_at gets stamped the FIRST time the link is redeemed.
//     Subsequent clicks within the 30-day window still work (re-issue a
//     magic link) but don't re-invite — useful when the user loses their
//     session and re-opens the email.
//
// When the invitee lands on /auth/callback post-auth, a trigger we'll
// add in the same migration creates the admin_profiles row if the email
// matches a pending invite. For now we rely on the accept step to
// insert it from here (service-role), right before handing off to
// Supabase.

export default async function AdminInviteRedemptionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return <InviteFailure reason="invalid" />;
  }

  const admin = createAdminClient();

  const { data: invite, error: lookupError } = await admin
    .from("admin_invites")
    .select(
      "id, workspace_id, email, role, invite_expires_at, accepted_at, workspaces(name)",
    )
    .eq("invite_token", token)
    .maybeSingle();
  if (lookupError) {
    console.error("[admin-invite] lookup failed", lookupError);
    return <InviteFailure reason="server" />;
  }
  if (!invite) return <InviteFailure reason="invalid" />;

  // eslint-disable-next-line react-hooks/purity
  if (new Date(invite.invite_expires_at).getTime() < Date.now()) {
    return <InviteFailure reason="expired" />;
  }

  // Check whether an auth user with this email already exists AND
  // already has an admin_profile elsewhere. If so, reject — the schema
  // won't let us add a second admin_profile for them anyway.
  const { data: userList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existingUser = (userList?.users ?? []).find(
    (u) => u.email?.toLowerCase() === invite.email.toLowerCase(),
  );
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
      return <InviteFailure reason="other-workspace" />;
    }
    // If they already have a profile IN THIS workspace, invite is a
    // no-op — just sign them in.
    if (existingProfile?.workspace_id === invite.workspace_id) {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: invite.email,
        options: {
          redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      });
      if (!linkData?.properties?.action_link) {
        return <InviteFailure reason="server" />;
      }
      redirect(linkData.properties.action_link);
    }
  }

  // If there's no existing user OR the existing user has no profile,
  // pre-create the admin_profile so post-auth the user lands on a
  // dashboard that already knows about them. Service-role bypasses the
  // foreign key check from admin_profiles.user_id → auth.users when
  // the user doesn't exist yet, so we defer the profile row to a
  // post-signup trigger. For now, if there's no user, we send the
  // invitee to /signup with the invite token so signup can pick it up.
  if (!existingUser) {
    // User needs to create an auth record first. We'll bounce them
    // through Supabase's passwordless signup via generateLink(type=invite)
    // which creates an unconfirmed auth.users row, then confirms it on
    // link click. The link_admin_on_accept trigger (in the same
    // migration) fills in admin_profiles after the user confirms.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email: invite.email,
      options: {
        redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });
    if (linkError || !linkData?.properties?.action_link) {
      console.error("[admin-invite] generateLink(invite) failed", linkError);
      return <InviteFailure reason="server" />;
    }

    // Stamp accepted_at so subsequent clicks don't re-invoke
    // generateLink(invite) after the first successful confirmation.
    // (Token remains valid within the 30-day window for re-auth if
    // they lose session — we just don't double-create.)
    await admin
      .from("admin_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id)
      .is("accepted_at", null);

    redirect(linkData.properties.action_link);
  }

  // Existing user, no profile anywhere → insert profile now and sign in.
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

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: invite.email,
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
  if (linkError || !linkData?.properties?.action_link) {
    console.error("[admin-invite] generateLink(magiclink) failed", linkError);
    return <InviteFailure reason="server" />;
  }

  redirect(linkData.properties.action_link);
}

function InviteFailure({
  reason,
}: {
  reason: "invalid" | "expired" | "server" | "other-workspace";
}) {
  const copy =
    reason === "expired"
      ? {
          title: "This invite has expired.",
          body: "Admin invites stay valid for 30 days. Ask the workspace owner to resend you a fresh one.",
        }
      : reason === "other-workspace"
        ? {
            title: "This email already has a workspace.",
            body: "Our current setup allows one workspace per email. Either use a different email for this invite, or have the owner of your existing workspace delete it first.",
          }
        : reason === "invalid"
          ? {
              title: "Invite not found.",
              body: "The link looks malformed or has been replaced by a newer invite. Ask the team to resend you a fresh one.",
            }
          : {
              title: "Something went wrong.",
              body: "We couldn't redeem your invite just now. Try the link again in a minute; if it keeps failing, reach out to the team that invited you.",
            };

  return (
    <div className="cr-surface flex min-h-screen flex-col">
      <header
        className="bg-[var(--cr-card)]"
        style={{ borderBottom: "2px solid var(--cr-ink)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 sm:px-10">
          <Link href="/" aria-label="The Creative Review — home">
            <CreativeReviewLogo fontSize={16} />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16 sm:px-10">
        <p className="cr-eyebrow mb-4">Admin invite</p>
        <h1
          className="cr-display"
          style={{
            fontFamily: "var(--font-display), serif",
            fontWeight: 800,
            fontSize: 40,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          {copy.title}
        </h1>
        <p
          className="mt-4 text-[17px] leading-[1.55]"
          style={{ color: "var(--cr-ink-2)" }}
        >
          {copy.body}
        </p>
      </main>
    </div>
  );
}
