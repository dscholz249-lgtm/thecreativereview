import { describe, it, expect } from "vitest";
import { getBillingState, isLapsedAllowedPath } from "@/lib/trial";

const NOW = new Date("2026-04-29T12:00:00Z");
const PAST = new Date("2026-04-22T12:00:00Z").toISOString(); // 7 days ago
const FUTURE_3D = new Date("2026-05-02T12:00:00Z").toISOString(); // +3 days
const FUTURE_1H = new Date("2026-04-29T13:00:00Z").toISOString(); // +1h

describe("getBillingState", () => {
  it("returns 'oss' for self-hosted plan regardless of other fields", () => {
    expect(
      getBillingState(
        {
          plan: "oss",
          stripe_subscription_id: null,
          trial_ends_at: PAST,
        },
        NOW,
      ),
    ).toEqual({ kind: "oss" });
  });

  it("returns 'active' when a Stripe subscription is present", () => {
    expect(
      getBillingState(
        {
          plan: "solo",
          stripe_subscription_id: "sub_123",
          trial_ends_at: PAST,
        },
        NOW,
      ),
    ).toEqual({ kind: "active" });
  });

  it("returns 'trialing' with daysLeft when trial is in the future", () => {
    expect(
      getBillingState(
        {
          plan: "solo",
          stripe_subscription_id: null,
          trial_ends_at: FUTURE_3D,
        },
        NOW,
      ),
    ).toEqual({
      kind: "trialing",
      daysLeft: 3,
      endsAt: new Date(FUTURE_3D),
    });
  });

  it("rounds trial daysLeft up so 1-hour-left reads as 1 day", () => {
    const state = getBillingState(
      {
        plan: "solo",
        stripe_subscription_id: null,
        trial_ends_at: FUTURE_1H,
      },
      NOW,
    );
    expect(state.kind).toBe("trialing");
    expect((state as { daysLeft: number }).daysLeft).toBe(1);
  });

  it("returns 'lapsed' when trial expired and no subscription", () => {
    expect(
      getBillingState(
        {
          plan: "solo",
          stripe_subscription_id: null,
          trial_ends_at: PAST,
        },
        NOW,
      ),
    ).toEqual({ kind: "lapsed" });
  });

  it("returns 'lapsed' when there's no trial and no subscription", () => {
    // Edge case: a workspace with neither trial nor sub. Should never
    // happen post-migration but the lapse-fallback is correct behavior.
    expect(
      getBillingState(
        {
          plan: "solo",
          stripe_subscription_id: null,
          trial_ends_at: null,
        },
        NOW,
      ),
    ).toEqual({ kind: "lapsed" });
  });
});

describe("isLapsedAllowedPath", () => {
  it("allows /billing and its sub-routes", () => {
    expect(isLapsedAllowedPath("/billing")).toBe(true);
    expect(isLapsedAllowedPath("/billing/anything")).toBe(true);
  });

  it("allows the Stripe webhook so checkout flows resolve", () => {
    expect(isLapsedAllowedPath("/api/stripe/webhook")).toBe(true);
  });

  it("allows the auth callback so re-login still works mid-lapse", () => {
    expect(isLapsedAllowedPath("/auth/callback")).toBe(true);
    expect(isLapsedAllowedPath("/login")).toBe(true);
    expect(isLapsedAllowedPath("/signup")).toBe(true);
  });

  it("blocks dashboard, clients, projects, settings", () => {
    expect(isLapsedAllowedPath("/dashboard")).toBe(false);
    expect(isLapsedAllowedPath("/clients")).toBe(false);
    expect(isLapsedAllowedPath("/projects")).toBe(false);
    expect(isLapsedAllowedPath("/settings/members")).toBe(false);
  });
});
