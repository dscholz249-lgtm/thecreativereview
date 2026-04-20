import type { WorkspacePlan } from "@/lib/database.types";

// Stripe Price IDs for each paid plan tier. Generated once in the Stripe
// dashboard for the Creative Review product. When we go live in milestone 5,
// we'll create a parallel set in live mode and swap via env var.

type PaidPlan = Exclude<WorkspacePlan, "oss">;

export const PLAN_PRICES: Record<PaidPlan, string> = {
  solo: "price_1TOKrHRcY6iTSaoHHvBLNaqM",
  studio: "price_1TOKrfRcY6iTSaoHozU24evT",
  agency: "price_1TOKs2RcY6iTSaoHCLS0s5wL",
};

export const PLAN_LABELS: Record<WorkspacePlan, string> = {
  oss: "Self-hosted",
  solo: "Solo",
  studio: "Studio",
  agency: "Agency",
};

export function planFromPriceId(priceId: string): PaidPlan | null {
  for (const [plan, id] of Object.entries(PLAN_PRICES) as Array<[PaidPlan, string]>) {
    if (id === priceId) return plan;
  }
  return null;
}
