import { describe, it, expect } from "vitest";
import {
  PLAN_PRICES,
  PLAN_LABELS,
  planFromPriceId,
  planFromSubscription,
} from "@/lib/stripe/config";

describe("stripe plan mapping", () => {
  it("round-trips every paid plan through planFromPriceId", () => {
    for (const plan of ["solo", "studio", "agency"] as const) {
      const priceId = PLAN_PRICES[plan];
      expect(priceId).toMatch(/^price_/);
      expect(planFromPriceId(priceId)).toBe(plan);
    }
  });

  it("returns null for unknown price IDs (e.g. dev-mode stripe CLI prices)", () => {
    expect(planFromPriceId("price_unknown_12345")).toBeNull();
    expect(planFromPriceId("")).toBeNull();
  });

  it("has a label for every plan including the OSS tier", () => {
    expect(PLAN_LABELS.oss).toBeTruthy();
    expect(PLAN_LABELS.solo).toBeTruthy();
    expect(PLAN_LABELS.studio).toBeTruthy();
    expect(PLAN_LABELS.agency).toBeTruthy();
  });
});

describe("planFromSubscription", () => {
  it("upgrades solo → studio when the price id changes", () => {
    // The DoD says "a test Stripe webhook upgrades a workspace from solo to
    // studio". The DB update itself lives in handleSubscriptionUpsert (tested
    // in the integration suite). Here we verify the pure plan resolution so
    // both legs of that test have unit coverage.
    const studioSub = {
      items: { data: [{ price: { id: PLAN_PRICES.studio } }] },
    };
    expect(planFromSubscription(studioSub)).toBe("studio");
  });

  it("returns null when items[] is empty (can happen mid-provisioning)", () => {
    expect(planFromSubscription({ items: { data: [] } })).toBeNull();
  });

  it("returns null for an unknown price id", () => {
    expect(
      planFromSubscription({
        items: { data: [{ price: { id: "price_unknown" } }] },
      }),
    ).toBeNull();
  });
});
