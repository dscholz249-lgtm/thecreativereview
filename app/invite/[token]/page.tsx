import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/server/admin-client";
import { env } from "@/lib/env";
import { CreativeReviewLogo } from "@/components/creative-review-logo";

// Reviewer invite redemption. OUR token, not Supabase's OTP.
//
// The invite email points here. On click:
//   1. Look up the client_reviewers row by invite_token (service role —
//      no user session yet).
//   2. Verify the token hasn't expired (30-day window from send).
//   3. Mint a fresh short-lived Supabase magic link via admin.generateLink.
//   4. Redirect to that magic link URL — Supabase completes auth, user
//      lands at /auth/callback, existing link_reviewer_on_auth_user trigger
//      populates client_reviewers.auth_user_id.
//
// Result: our 30-day window is enforced here; Supabase's ~24h OTP cap only
// governs the final browser → Supabase auth hop, which completes in seconds.

export default async function InviteRedemptionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return <InviteFailure reason="invalid" />;
  }

  const admin = createAdminClient();

  const { data: reviewer, error } = await admin
    .from("client_reviewers")
    .select("id, email, invite_token, invite_expires_at")
    .eq("invite_token", token)
    .maybeSingle();
  if (error) {
    console.error("[invite] lookup failed", error);
    return <InviteFailure reason="server" />;
  }
  if (!reviewer) {
    return <InviteFailure reason="invalid" />;
  }

  const expiresAt = reviewer.invite_expires_at
    ? new Date(reviewer.invite_expires_at).getTime()
    : 0;
  // Per-request Date.now() in a Server Component — deterministic for
  // this request; react-hooks/purity aims at client components.
  // eslint-disable-next-line react-hooks/purity
  if (!expiresAt || expiresAt < Date.now()) {
    return <InviteFailure reason="expired" />;
  }

  // Fresh Supabase magic link — Supabase signs/redirects the user back via
  // /auth/callback. This regenerates on every click within the 30-day window.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: reviewer.email,
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
  if (linkError || !linkData?.properties?.action_link) {
    console.error("[invite] generateLink failed", linkError);
    return <InviteFailure reason="server" />;
  }

  redirect(linkData.properties.action_link);
}

function InviteFailure({
  reason,
}: {
  reason: "invalid" | "expired" | "server";
}) {
  const copy =
    reason === "expired"
      ? {
          title: "This invite has expired.",
          body: "Invite links stay valid for 30 days. Ask the team to resend your invitation — they can do it from their Creative Review workspace.",
        }
      : reason === "invalid"
        ? {
            title: "Invite not found.",
            body: "The link looks malformed or has already been replaced by a newer invite. Ask the team to resend you a fresh one.",
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
        <p className="cr-eyebrow mb-4">Invite</p>
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
