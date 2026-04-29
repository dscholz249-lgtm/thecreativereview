import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/server/stripe";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/server/admin-client";
import { planFromSubscription } from "@/lib/stripe/config";
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
//
// Every code path logs a [stripe-webhook] line so silent drops surface in
// Railway logs. "I got a 200 from Stripe but my plan didn't update" was a
// real failure mode — early-returns weren't observable.

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

  console.log(`[stripe-webhook] received ${event.type} id=${event.id}`);

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
        console.log(`[stripe-webhook] ignored ${event.type}`);
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
  if (!workspaceId) {
    console.warn(
      `[stripe-webhook] checkout.completed missing workspace_id (session=${session.id})`,
    );
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  if (!subscriptionId || !customerId) {
    console.warn(
      `[stripe-webhook] checkout.completed missing subscription or customer (session=${session.id}, sub=${subscriptionId}, cust=${customerId})`,
    );
    return;
  }

  const subscription = await stripe().subscriptions.retrieve(subscriptionId);
  const plan = planFromSubscription(subscription);
  if (!plan) {
    const priceId = subscription.items.data[0]?.price?.id ?? "<none>";
    console.warn(
      `[stripe-webhook] checkout.completed unknown price_id=${priceId} (sub=${subscriptionId}). Check STRIPE_PRICE_* env vars match the live/test mode you're in.`,
    );
    return;
  }

  await updateWorkspacePlan({
    workspaceId,
    plan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    trigger: "checkout.session.completed",
  });
}

async function handleSubscriptionUpsert(
  subscription: Stripe.Subscription,
): Promise<void> {
  const workspaceId = await resolveWorkspaceId(subscription);
  if (!workspaceId) {
    console.warn(
      `[stripe-webhook] subscription.upsert could not resolve workspace_id (sub=${subscription.id})`,
    );
    return;
  }

  const plan = planFromSubscription(subscription);
  if (!plan) {
    const priceId = subscription.items.data[0]?.price?.id ?? "<none>";
    console.warn(
      `[stripe-webhook] subscription.upsert unknown price_id=${priceId} (sub=${subscription.id})`,
    );
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  await updateWorkspacePlan({
    workspaceId,
    plan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    trigger: "subscription.upsert",
  });
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const workspaceId = await resolveWorkspaceId(subscription);
  if (!workspaceId) {
    console.warn(
      `[stripe-webhook] subscription.deleted could not resolve workspace_id (sub=${subscription.id})`,
    );
    return;
  }

  // Don't revert to 'oss' — that value is reserved for self-hosted
  // forks now. Just clear the subscription ID; the (app) layout's
  // paywall picks up the lapsed state from `stripe_subscription_id IS
  // NULL && plan != 'oss' && trial expired`. Keeping the plan as-is
  // means a re-subscribe on the same tier is a no-op for the rest of
  // the app (cap math etc.).
  const admin = createAdminClient();
  const { error } = await admin
    .from("workspaces")
    .update({ stripe_subscription_id: null })
    .eq("id", workspaceId);
  if (error) {
    console.error(
      `[stripe-webhook] subscription.deleted failed to clear sub_id for workspace ${workspaceId}`,
      error,
    );
    return;
  }
  console.log(
    `[stripe-webhook] subscription.deleted cleared sub_id for workspace=${workspaceId} (paywall engages on next request)`,
  );
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
  const { data: bySubscription, error: subErr } = await admin
    .from("workspaces")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (subErr) {
    console.error("[stripe-webhook] workspace lookup by subscription failed", subErr);
  }
  if (bySubscription) return bySubscription.id;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const { data: byCustomer, error: custErr } = await admin
    .from("workspaces")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (custErr) {
    console.error("[stripe-webhook] workspace lookup by customer failed", custErr);
  }
  return byCustomer?.id ?? null;
}

async function updateWorkspacePlan(params: {
  workspaceId: string;
  plan: WorkspacePlan;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  trigger: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("workspaces")
    .update({
      plan: params.plan,
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
    })
    .eq("id", params.workspaceId);
  if (error) {
    console.error(
      `[stripe-webhook] ${params.trigger} failed to update workspace=${params.workspaceId}`,
      error,
    );
    return;
  }
  console.log(
    `[stripe-webhook] ${params.trigger} updated workspace=${params.workspaceId} → plan=${params.plan}`,
  );
}
