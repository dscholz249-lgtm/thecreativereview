import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/page-heading";
import { PLAN_LABELS } from "@/lib/stripe/config";
import type { WorkspacePlan } from "@/lib/database.types";
import {
  createCheckoutSessionAction,
  createPortalSessionAction,
} from "./actions";

type PaidPlan = Exclude<WorkspacePlan, "oss">;

const PAID_PLANS: Array<{ id: PaidPlan; tagline: string; featured: boolean }> = [
  { id: "solo", tagline: "Solo freelancers — 1 seat, 5 clients.", featured: false },
  { id: "studio", tagline: "Small studios — 3 seats, 25 clients.", featured: true },
  { id: "agency", tagline: "Agencies — 10 seats, unlimited clients.", featured: false },
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; plan?: string; changed?: string }>;
}) {
  const { checkout, plan: changedTo, changed } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, plan, stripe_customer_id, stripe_subscription_id")
    .eq("id", profile.workspace_id)
    .maybeSingle();
  if (!workspace) redirect("/login");

  const currentPlan = workspace.plan;
  const hasCustomer = Boolean(workspace.stripe_customer_id);

  return (
    <>
      <PageHeading
        title="Billing"
        description="Manage your Creative Review subscription."
      />

      {checkout === "success" ? (
        <Banner tone="constructive">
          Thanks — your subscription is being provisioned. Plan usually updates
          within a few seconds.
        </Banner>
      ) : null}
      {checkout === "cancelled" ? (
        <Banner tone="warn">
          Checkout was cancelled. Your plan is unchanged.
        </Banner>
      ) : null}
      {changed === "1" && changedTo ? (
        <Banner tone="constructive">
          Plan updated to {PLAN_LABELS[changedTo as WorkspacePlan] ?? changedTo}.
          Stripe will prorate the difference on your next invoice.
        </Banner>
      ) : null}

      <div className="cr-card mb-8 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="cr-eyebrow">Current plan</p>
          <p
            className="mt-2 flex items-center gap-2.5"
            style={{
              fontFamily: "var(--font-display), serif",
              fontWeight: 800,
              fontSize: 32,
              letterSpacing: "-0.02em",
            }}
          >
            {PLAN_LABELS[currentPlan]}
            {currentPlan === "oss" ? (
              <span className="cr-badge">
                <span
                  className="cr-badge-dot"
                  style={{ background: "var(--cr-line-strong)" }}
                />
                Free
              </span>
            ) : (
              <span className="cr-badge cr-badge-approved">
                <span className="cr-badge-dot" />
                Active
              </span>
            )}
          </p>
        </div>
        {hasCustomer ? (
          <form action={createPortalSessionAction}>
            <button type="submit" className="cr-btn cr-btn-sm">
              Manage in Stripe
            </button>
          </form>
        ) : null}
      </div>

      <div className="mb-4 flex items-center">
        <h3
          className="cr-display"
          style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}
        >
          Available plans
        </h3>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PAID_PLANS.map((p) => {
          const isCurrent = currentPlan === p.id;
          return (
            <div
              key={p.id}
              className={p.featured ? "cr-card-raised p-6" : "cr-card p-6"}
            >
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontFamily: "var(--font-display), serif",
                    fontWeight: 800,
                    fontSize: 22,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {PLAN_LABELS[p.id]}
                </span>
                {p.featured ? (
                  <span
                    className="cr-badge"
                    style={{
                      background: "var(--cr-ink)",
                      color: "white",
                      borderColor: "var(--cr-ink)",
                    }}
                  >
                    Most popular
                  </span>
                ) : null}
              </div>
              <p
                className="mt-1 text-[14px]"
                style={{ color: "var(--cr-muted)" }}
              >
                {p.tagline}
              </p>
              <div className="mt-6">
                {isCurrent ? (
                  <button
                    className="cr-btn cr-btn-sm cr-btn-ghost w-full"
                    disabled
                  >
                    Current plan
                  </button>
                ) : (
                  <form action={createCheckoutSessionAction}>
                    <input type="hidden" name="plan" value={p.id} />
                    <button
                      type="submit"
                      className={
                        p.featured
                          ? "cr-btn cr-btn-primary w-full"
                          : "cr-btn w-full"
                      }
                    >
                      {currentPlan === "oss"
                        ? `Subscribe to ${PLAN_LABELS[p.id]}`
                        : `Switch to ${PLAN_LABELS[p.id]}`}
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "constructive" | "warn";
  children: React.ReactNode;
}) {
  const bg =
    tone === "constructive"
      ? "var(--cr-constructive-soft)"
      : "var(--cr-destructive-soft)";
  const border =
    tone === "constructive"
      ? "var(--cr-constructive)"
      : "var(--cr-destructive-ink)";
  const color =
    tone === "constructive"
      ? "var(--cr-constructive)"
      : "var(--cr-destructive-ink)";
  return (
    <div
      className="mb-6 px-4 py-3 text-[14px] font-semibold"
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: "var(--cr-radius)",
        color,
      }}
    >
      {children}
    </div>
  );
}
