import Link from "next/link";
import { createAdminClient } from "@/server/admin-client";
import { CreativeReviewLogo } from "@/components/creative-review-logo";
import { continueAdminInviteAction } from "./actions";

// Invite redemption has two phases:
//   1. GET /admin-invite/[token] — validates the token against admin_invites,
//      renders an interstitial with a Continue button. Safe for email
//      clients / safe-link scanners to prefetch, since no Supabase auth
//      state changes on a bare GET.
//   2. POST continueAdminInviteAction — only fires when the real user
//      clicks Continue. This is the step that mints a one-shot Supabase
//      magic link and redirects the browser to it. Because scanners
//      don't POST, the link can no longer be consumed before the user
//      sees it.
//
// Known error states are surfaced either by the action's fall-through
// redirect (`?err=…`) or by the validation branches below.

export default async function AdminInviteRedemptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const { token } = await params;
  const { err } = await searchParams;
  if (!token || token.length < 8) {
    return <InviteFailure reason="invalid" />;
  }

  const admin = createAdminClient();
  const { data: invite, error: lookupError } = await admin
    .from("admin_invites")
    .select(
      "id, workspace_id, email, invite_expires_at, workspaces(name)",
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

  if (err === "invalid" || err === "expired" || err === "server" || err === "other-workspace") {
    return <InviteFailure reason={err} />;
  }

  const workspaceName =
    (invite.workspaces as unknown as { name: string } | null)?.name ??
    "this workspace";

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
          Join {workspaceName} on Creative Review.
        </h1>
        <p
          className="mt-4 text-[17px] leading-[1.55]"
          style={{ color: "var(--cr-ink-2)" }}
        >
          You&apos;re signing in as{" "}
          <span style={{ fontWeight: 600, color: "var(--cr-ink)" }}>
            {invite.email}
          </span>
          . Click Continue to confirm and finish setting up your account.
        </p>

        <form action={continueAdminInviteAction} className="mt-8">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="cr-btn cr-btn-primary cr-btn-lg">
            Continue to sign in
          </button>
        </form>

        <p
          className="mt-6 text-[13px]"
          style={{ color: "var(--cr-muted)" }}
        >
          We&apos;ll email you a fresh sign-in link only when you click this
          button — so link-preview scanners in your inbox can&apos;t use it
          up before you do.
        </p>
      </main>
    </div>
  );
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
