"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/server/stripe";
import { getPlanPrices } from "@/lib/stripe/config";
import { env } from "@/lib/env";

const PaidPlanSchema = z.enum(["solo", "studio", "agency"]);

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

// Creates a Checkout Session for the selected paid plan. `client_reference_id`
// and subscription metadata both carry workspace_id so the webhook can link
// the customer + subscription back regardless of which event arrives first.
//
// These form actions return void — on happy path Next's redirect() unwinds,
// and on failure we throw, which Next renders via the error boundary.
export async function createCheckoutSessionAction(
  formData: FormData,
): Promise<void> {
  const parsed = PaidPlanSchema.safeParse(formData.get("plan"));
  if (!parsed.success) throw new Error("Invalid plan selection.");
  const plan = parsed.data;

  const ctx = await getCurrentAdminWorkspace();
  if (!ctx) throw new Error("Not authenticated.");
  const { user, workspace } = ctx;

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
