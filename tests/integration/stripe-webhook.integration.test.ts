// Milestone 4 DoD: "a test Stripe webhook upgrades a workspace from solo
// to studio." We had unit coverage for plan resolution, never the round
// trip — which is where we hit the bug in the first place. This suite
// seeds a workspace, posts a signed customer.subscription.updated event
// to the real route handler, and asserts workspaces.plan flips.
//
// Doesn't touch Stripe's API — the subscription payload is fully
// constructed locally and signed with the Stripe SDK's test-header
// helper. Same crypto the real handler validates against.
//
// Env vars are overridden BEFORE the route handler is imported so
// lib/env.server's Proxy caches our test values instead of whatever's
// in .env.local.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Pin secrets used throughout the test. STRIPE_SECRET_KEY has to be set
// to something non-empty because server/stripe.ts throws without it, but
// the test never calls out to Stripe — we only need the SDK locally.
const TEST_STRIPE_SECRET = "sk_test_webhook_integration_dummy";
const TEST_WEBHOOK_SECRET = "whsec_test_integration_dummy";

process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET;
process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

const describeIfReady = SERVICE_ROLE ? describe : describe.skip;

describeIfReady("stripe webhook — subscription upgrade flips workspace.plan", () => {
  const nonce = Math.random().toString(36).slice(2, 8);
  let service: SupabaseClient<Database>;
  let workspaceId: string;
  const subscriptionId = `sub_test_${nonce}`;
  const customerId = `cus_test_${nonce}`;

  beforeAll(async () => {
    service = createClient<Database>(URL_ENV, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: ws, error } = await service
      .from("workspaces")
      .insert({
        name: `stripe-ws-${nonce}`,
        plan: "solo",
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
      })
      .select("id")
      .single();
    if (error || !ws) throw error ?? new Error("no workspace");
    workspaceId = ws.id;
  });

  afterAll(async () => {
    await service.from("workspaces").delete().eq("id", workspaceId);
  });

  it("customer.subscription.updated with studio price flips plan to studio", async () => {
    // Dynamic imports — env vars set above must be in place before
    // lib/env.server caches them, and before @/app/api/stripe/webhook/route
    // pulls in @/server/stripe (which reads STRIPE_SECRET_KEY at first use).
    const Stripe = (await import("stripe")).default;
    const { getPlanPrices } = await import("@/lib/stripe/config");
    const { POST } = await import("@/app/api/stripe/webhook/route");

    const studioPriceId = getPlanPrices().studio;

    // Minimal subscription payload — only the fields our handler touches.
    // Metadata carries workspace_id so resolveWorkspaceId short-circuits
    // without hitting the DB (though it would fall back to stripe_subscription_id
    // which we also seeded).
    const subscription = {
      id: subscriptionId,
      object: "subscription",
      customer: customerId,
      status: "active",
      metadata: { workspace_id: workspaceId, plan: "studio" },
      items: {
        object: "list",
        data: [
          {
            id: `si_test_${nonce}`,
            object: "subscription_item",
            price: { id: studioPriceId, object: "price" },
          },
        ],
      },
    };

    const event = {
      id: `evt_test_${nonce}`,
      object: "event",
      type: "customer.subscription.updated",
      data: { object: subscription },
      created: Math.floor(Date.now() / 1000),
      livemode: false,
    };

    const payload = JSON.stringify(event);
    const stripe = new Stripe(TEST_STRIPE_SECRET, {
      apiVersion: "2026-03-25.dahlia",
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: TEST_WEBHOOK_SECRET,
    });

    // Build a Next-compatible request directly. NextRequest extends the
    // Web Request spec; the route handler accepts anything with .headers,
    // .text(), and the standard surface.
    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": signature,
        "content-type": "application/json",
      },
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const { data: updated } = await service
      .from("workspaces")
      .select("plan, stripe_subscription_id")
      .eq("id", workspaceId)
      .single();
    expect(updated?.plan).toBe("studio");
    expect(updated?.stripe_subscription_id).toBe(subscriptionId);
  });

  it("invalid signature returns 400 and does not mutate the workspace", async () => {
    // Reset plan to a known state for a clean assertion.
    await service
      .from("workspaces")
      .update({ plan: "solo" })
      .eq("id", workspaceId);

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": "t=0,v1=deadbeef",
        "content-type": "application/json",
      },
      body: JSON.stringify({ id: "evt_tampered" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const { data: row } = await service
      .from("workspaces")
      .select("plan")
      .eq("id", workspaceId)
      .single();
    expect(row?.plan).toBe("solo");
  });
});
