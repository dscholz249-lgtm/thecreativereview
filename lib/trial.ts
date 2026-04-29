import type { WorkspacePlan } from "@/lib/database.types";

// Pure helpers describing the hosted-product trial state machine. Kept
// out of the layout so they're trivially testable + reusable from the
// /billing page (which needs to know "lapsed" too).
//
// State machine on a workspace:
//   * trialing — !sub_id && trial_ends_at && trial_ends_at > now
//   * active   — sub_id present
//   * lapsed   — !sub_id && plan != 'oss' && (no trial OR trial expired)
//   * oss      — plan === 'oss' (self-hosted only — never assigned by
//                hosted code paths post-launch)

export type WorkspaceBillingState =
  | { kind: "active" }
  | { kind: "trialing"; daysLeft: number; endsAt: Date }
  | { kind: "lapsed" }
  | { kind: "oss" };

export type TrialFields = {
  plan: WorkspacePlan;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
};

export function getBillingState(
  ws: TrialFields,
  now: Date = new Date(),
): WorkspaceBillingState {
  if (ws.plan === "oss") return { kind: "oss" };
  if (ws.stripe_subscription_id) return { kind: "active" };

  if (ws.trial_ends_at) {
    const endsAt = new Date(ws.trial_ends_at);
    if (endsAt > now) {
      // Round up so a 6.4-day remainder reads as "7 days" — friendlier
      // than telling someone they have 6 days when 6h25m remain.
      const daysLeft = Math.ceil(
        (endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      return { kind: "trialing", daysLeft, endsAt };
    }
  }

  return { kind: "lapsed" };
}

// Routes the layout still allows for a lapsed user — billing (so they
// can subscribe), and any auth/error subtree (so logout, /not-found etc.
// don't break).
export function isLapsedAllowedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/billing") ||
    pathname.startsWith("/api/stripe") ||
    pathname.startsWith("/auth") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/_next")
  );
}
