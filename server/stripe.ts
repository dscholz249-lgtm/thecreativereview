import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env.server";

// Stripe server client. API version pinned so the webhook + SDK agree on
// event shapes across version bumps. Rotate intentionally.
let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = serverEnv.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — Stripe operations are unavailable.",
    );
  }
  _stripe = new Stripe(key, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });
  return _stripe;
}
