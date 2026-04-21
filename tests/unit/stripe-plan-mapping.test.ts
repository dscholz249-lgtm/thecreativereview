import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getPlanPrices,
  PLAN_LABELS,
  planFromPriceId,
  planFromSubscription,
} from "@/lib/stripe/config";

describe("stripe plan mapping", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips every paid plan through planFromPriceId", () => {
    const prices = getPlanPrices();
    for (const plan of ["solo", "studio", "agency"] as const) {
      expect(prices[plan]).toMatch(/^price_/);
      expect(planFromPriceId(prices[plan])).toBe(plan);
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

  it("env var overrides beat committed defaults", () => {
    // Launch-day behaviour: production sets STRIPE_PRICE_* on Railway to the
    // live-mode IDs, code keeps test-mode defaults. This guards against a
    // future refactor accidentally hard-wiring the defaults.
    vi.stubEnv("STRIPE_PRICE_SOLO", "price_live_solo_override");
    expect(getPlanPrices().solo).toBe("price_live_solo_override");
    expect(planFromPriceId("price_live_solo_override")).toBe("solo");
  });

  it("falls back to defaults when env var is empty string", () => {
    vi.stubEnv("STRIPE_PRICE_STUDIO", "");
    expect(getPlanPrices().studio).toMatch(/^price_/);
    expect(getPlanPrices().studio).not.toBe("");
  });
});

describe("planFromSubscription", () => {
  it("upgrades solo → studio when the price id changes", () => {
    // The DoD says "a test Stripe webhook upgrades a workspace from solo to
    // studio". The DB update itself lives in handleSubscriptionUpsert (tested
    // in the integration suite). Here we verify the pure plan resolution so
    // both legs of that test have unit coverage.
    const studioSub = {
      items: { data: [{ price: { id: getPlanPrices().studio } }] },
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
