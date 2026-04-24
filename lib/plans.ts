import type { WorkspacePlan } from "@/lib/database.types";

// Plan limits — the product-side interpretation of what each pricing tier
// gets. Shipped fields are enforced; unshipped fields are documented as
// Infinity / "not enforced" so it's clear what we've committed to.
//
// Keep this file in sync with the marketing pricing cards in
// components/landing/pricing.tsx. Those copy exists to tell customers
// what they're buying; this file is what the product actually checks.

type PlanLimits = {
  // Non-archived clients per workspace.
  activeClients: number;
  // Admin seats per workspace. Counts accepted admin_profiles plus any
  // non-expired, non-accepted admin_invites (design decision: pending
  // invites reserve a seat, so an owner can't shotgun more than the tier
  // allows and count on churn to smooth it out).
  adminSeats: number;
};

export const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  oss: { activeClients: Infinity, adminSeats: Infinity },
  solo: { activeClients: 5, adminSeats: 1 },
  studio: { activeClients: 25, adminSeats: 3 },
  agency: { activeClients: Infinity, adminSeats: 10 },
};

// Compact helper used by form actions + UI. Returns "Unlimited" rather than
// rendering "Infinity" to customers.
export function formatLimit(n: number): string {
  return Number.isFinite(n) ? String(n) : "Unlimited";
}
