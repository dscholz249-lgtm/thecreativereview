"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/admin-client";
import { stripe } from "@/server/stripe";
import { getPlanPrices } from "@/lib/stripe/config";
import { env } from "@/lib/env";

const PaidPlanSchema = z.enum(["solo", "studio", "agency"]);

// Subscription statuses that allow in-place plan changes. A `canceled` or
// `incomplete_expired` sub can't be updated — we fall through to Checkout
// and let the user start fresh.
const REUSABLE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);

async function getCurrentAdminWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return null;
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, plan, stripe_customer_id, stripe_subscription_id")
    .eq("id", profile.workspace_id)
    .maybeSingle();
  if (!workspace) return null;
  return { supabase, user, workspace };
}

// Unified plan-selection action. Two paths:
//
//   1. No active subscription yet → hosted Checkout. Customer enters
//      payment details, Stripe creates customer + subscription, webhook
//      fires checkout.session.completed and flips workspaces.plan.
//
//   2. Active subscription → in-place update via subscriptions.update.
//      No second trip through Checkout, no card re-entry, no new
//      customer. Stripe prorates by default and fires
//      customer.subscription.updated, which our webhook uses to sync
//      workspaces.plan. We also sync the DB synchronously here so the
//      billing page reflects the change on the immediate reload rather
//      than waiting for the webhook round-trip.
//
// Form actions return void — on happy path redirect() unwinds, on
// failure we throw and Next renders the error boundary.
export async function createCheckoutSessionAction(
  formData: FormData,
): Promise<void> {
  const parsed = PaidPlanSchema.safeParse(formData.get("plan"));
  if (!parsed.success) throw new Error("Invalid plan selection.");
  const plan = parsed.data;

  const ctx = await getCurrentAdminWorkspace();
  if (!ctx) throw new Error("Not authenticated.");
  const { user, workspace } = ctx;

  // If there's an active subscription already, switch its item in place
  // instead of starting a new Checkout (which would stack subscriptions).
  if (workspace.stripe_subscription_id) {
    const existing = await stripe().subscriptions.retrieve(
      workspace.stripe_subscription_id,
    );
    if (REUSABLE_STATUSES.has(existing.status)) {
      await switchPlanInPlace({
        workspaceId: workspace.id,
        existing,
        plan,
      });
      revalidatePath("/billing");
      redirect(`/billing?plan=${plan}&changed=1`);
    }
    // Fall through to Checkout if the sub is canceled / expired.
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: getPlanPrices()[plan], quantity: 1 }],
    customer_email: workspace.stripe_customer_id ? undefined : user.email,
    customer: workspace.stripe_customer_id ?? undefined,
    client_reference_id: workspace.id,
    subscription_data: {
      metadata: { workspace_id: workspace.id, plan },
    },
    metadata: { workspace_id: workspace.id, plan },
    allow_promotion_codes: true,
    success_url: `${env.NEXT_PUBLIC_APP_URL}/billing?checkout=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/billing?checkout=cancelled`,
  });

  if (!session.url) throw new Error("Stripe did not return a URL.");
  redirect(session.url);
}

// Change the item on an existing subscription to the new plan's price.
// Stripe prorates by default (create_prorations) so the customer is
// credited unused time on the old plan and charged for the new one.
async function switchPlanInPlace(params: {
  workspaceId: string;
  existing: import("stripe").Stripe.Subscription;
  plan: "solo" | "studio" | "agency";
}): Promise<void> {
  const { workspaceId, existing, plan } = params;
  const itemId = existing.items.data[0]?.id;
  if (!itemId) {
    throw new Error(`Subscription ${existing.id} has no items to update.`);
  }

  const updated = await stripe().subscriptions.update(existing.id, {
    items: [{ id: itemId, price: getPlanPrices()[plan] }],
    // Keep workspace_id on the metadata so the webhook can resolve us
    // even if Supabase loses the subscription_id somehow.
    metadata: {
      ...(existing.metadata ?? {}),
      workspace_id: workspaceId,
      plan,
    },
  });

  // Sync DB synchronously — don't rely on the webhook to update the UI
  // within the current request. Webhook remains the authoritative path
  // for out-of-band changes (Stripe portal, CLI, Stripe dashboard).
  const admin = createAdminClient();
  const { error } = await admin
    .from("workspaces")
    .update({
      plan,
      stripe_subscription_id: updated.id,
    })
    .eq("id", workspaceId);
  if (error) {
    console.error(
      `[billing] switchPlanInPlace: failed to update workspace ${workspaceId}`,
      error,
    );
    throw new Error("Plan updated in Stripe but workspace sync failed.");
  }
}

// Creates a Billing Portal session so admins can update payment methods,
// change plans, or cancel. Portal is the source of truth for anything
// beyond the first upgrade.
export async function createPortalSessionAction(): Promise<void> {
  const ctx = await getCurrentAdminWorkspace();
  if (!ctx) throw new Error("Not authenticated.");
  const { workspace } = ctx;
  if (!workspace.stripe_customer_id) {
    throw new Error("No Stripe customer yet — subscribe to a plan first.");
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: workspace.stripe_customer_id,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/billing`,
  });
  redirect(session.url);
}
