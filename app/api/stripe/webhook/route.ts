import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/server/stripe";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/server/admin-client";
import { planFromPriceId } from "@/lib/stripe/config";
import type { WorkspacePlan } from "@/lib/database.types";

// Stripe webhook. Handles the subset of events that affect workspaces.plan:
//   * checkout.session.completed  — first-time subscribe for a workspace
//   * customer.subscription.updated / .created — plan change, trial end
//   * customer.subscription.deleted — full cancel, revert to 'oss'
//
// Uses the service-role client because there's no authenticated user on a
// webhook request — the bearer of trust is the signed payload.
//
// Node runtime: Stripe's SDK depends on Node crypto via the `req.text()` body.
// Edge would require the Web-crypto variant of constructEvent and streamed
// buffers. We don't need it for this volume.

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<Response> {
  const secret = serverEnv.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set");
    return new NextResponse("webhook not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("missing stripe-signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed", err);
    return new NextResponse("invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        // Ignore uninteresting events — no-op so Stripe marks as delivered.
        break;
    }
  } catch (err) {
    // Don't 500 on a handler bug — Stripe will retry indefinitely. Log,
    // ack, and rely on Sentry + the next subscription.updated event to
    // self-heal if this was transient.
    console.error(`[stripe-webhook] handler error for ${event.type}`, err);
    return NextResponse.json({ received: true, error: "handler_error" });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  // client_reference_id is the primary key we set on session create; the
  // subscription.metadata fallback catches sessions created outside our
  // code path (e.g. via Stripe CLI in testing).
  const workspaceId =
    session.client_reference_id ?? session.metadata?.workspace_id ?? null;
  if (!workspaceId) return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  if (!subscriptionId || !customerId) return;

  const subscription = await stripe().subscriptions.retrieve(subscriptionId);
  const plan = planFromSubscription(subscription);
  if (!plan) return;

  await updateWorkspacePlan({
    workspaceId,
    plan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
  });
}

async function handleSubscriptionUpsert(
  subscription: Stripe.Subscription,
): Promise<void> {
  const workspaceId = await resolveWorkspaceId(subscription);
  if (!workspaceId) return;

  const plan = planFromSubscription(subscription);
  if (!plan) return;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  await updateWorkspacePlan({
    workspaceId,
    plan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
  });
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const workspaceId = await resolveWorkspaceId(subscription);
  if (!workspaceId) return;

  const admin = createAdminClient();
  await admin
    .from("workspaces")
    .update({ plan: "oss", stripe_subscription_id: null })
    .eq("id", workspaceId);
}

function planFromSubscription(
  subscription: Stripe.Subscription,
): WorkspacePlan | null {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return null;
  return planFromPriceId(priceId);
}

// Resolve workspace_id by trying subscription metadata first (set on checkout
// create), then falling back to the DB index on stripe_subscription_id or
// stripe_customer_id — which covers subscriptions that originated outside our
// app (Stripe CLI, legacy imports).
async function resolveWorkspaceId(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const fromMetadata = subscription.metadata?.workspace_id;
  if (fromMetadata) return fromMetadata;

  const admin = createAdminClient();
  const { data: bySubscription } = await admin
    .from("workspaces")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (bySubscription) return bySubscription.id;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const { data: byCustomer } = await admin
    .from("workspaces")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return byCustomer?.id ?? null;
}

async function updateWorkspacePlan(params: {
  workspaceId: string;
  plan: WorkspacePlan;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("workspaces")
    .update({
      plan: params.plan,
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
    })
    .eq("id", params.workspaceId);
}
