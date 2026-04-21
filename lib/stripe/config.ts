import type { WorkspacePlan } from "@/lib/database.types";

// Stripe Price IDs per plan tier.
//
// Resolution order: Railway env var → committed default. This lets the same
// code serve test mode (defaults below) and live mode (env vars set on Railway)
// without a deploy — and makes adding a new tier a config change plus a
// PaidPlan enum entry, not a secrets rotation.
//
// Set on Railway at launch:
//   STRIPE_PRICE_SOLO, STRIPE_PRICE_STUDIO, STRIPE_PRICE_AGENCY  (live-mode IDs)
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET                     (live-mode keys)
//
// Defaults are *test mode* IDs from Dan's Stripe dashboard — safe to commit
// because test-mode prices never bill anything.

type PaidPlan = Exclude<WorkspacePlan, "oss">;

// Test-mode defaults — used for local dev and any deploy that hasn't set the
// STRIPE_PRICE_* env vars. Swap to live-mode prices via env, not by editing here.
const DEFAULT_PLAN_PRICES: Record<PaidPlan, string> = {
  solo: "price_1TOg3pD47FlW3AuKDKGiisx7",
  studio: "price_1TOg4UD47FlW3AuKnOyqYpuS",
  agency: "price_1TOg49D47FlW3AuKgoTvXRyv",
};

const ENV_VAR_BY_PLAN: Record<PaidPlan, string> = {
  solo: "STRIPE_PRICE_SOLO",
  studio: "STRIPE_PRICE_STUDIO",
  agency: "STRIPE_PRICE_AGENCY",
};

// Resolved at call time (not at module load) so Railway env var changes take
// effect on the next request without a redeploy.
export function getPlanPrices(): Record<PaidPlan, string> {
  const out = {} as Record<PaidPlan, string>;
  for (const plan of Object.keys(DEFAULT_PLAN_PRICES) as PaidPlan[]) {
    const override = process.env[ENV_VAR_BY_PLAN[plan]];
    out[plan] = override && override.length > 0 ? override : DEFAULT_PLAN_PRICES[plan];
  }
  return out;
}

export const PLAN_LABELS: Record<WorkspacePlan, string> = {
  oss: "Self-hosted",
  solo: "Solo",
  studio: "Studio",
  agency: "Agency",
};

export function planFromPriceId(priceId: string): PaidPlan | null {
  const prices = getPlanPrices();
  for (const [plan, id] of Object.entries(prices) as Array<[PaidPlan, string]>) {
    if (id === priceId) return plan;
  }
  return null;
}

// Shape we care about from Stripe's Subscription type — keeping this narrow
// so the helper is testable without importing the Stripe SDK.
type SubscriptionLike = {
  items: { data: Array<{ price?: { id?: string | null } | null }> };
};

export function planFromSubscription(
  subscription: SubscriptionLike,
): PaidPlan | null {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return null;
  return planFromPriceId(priceId);
}
