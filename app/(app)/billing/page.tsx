import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLAN_LABELS } from "@/lib/stripe/config";
import type { WorkspacePlan } from "@/lib/database.types";
import {
  createCheckoutSessionAction,
  createPortalSessionAction,
} from "./actions";
import { Button } from "@/components/ui/button";

type PaidPlan = Exclude<WorkspacePlan, "oss">;

const PAID_PLANS: Array<{ id: PaidPlan; tagline: string }> = [
  { id: "solo", tagline: "Solo freelancers — 1 seat, 5 clients." },
  { id: "studio", tagline: "Small studios — 3 seats, 25 clients." },
  { id: "agency", tagline: "Agencies — 10 seats, unlimited clients." },
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
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
        <Card className="mb-6 border-emerald-200 bg-emerald-50">
          <CardContent className="py-4 text-sm text-emerald-900">
            Thanks — your subscription is being provisioned. Plan usually
            updates within a few seconds.
          </CardContent>
        </Card>
      ) : null}
      {checkout === "cancelled" ? (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-900">
            Checkout was cancelled. Your plan is unchanged.
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-8">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Current plan
            </p>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
              {PLAN_LABELS[currentPlan]}
              <Badge variant={currentPlan === "oss" ? "outline" : "default"}>
                {currentPlan === "oss" ? "free" : "paid"}
              </Badge>
            </p>
          </div>
          {hasCustomer ? (
            <form action={createPortalSessionAction}>
              <Button type="submit" variant="outline" size="sm">
                Manage in Stripe
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Available plans
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        {PAID_PLANS.map((p) => {
          const isCurrent = currentPlan === p.id;
          return (
            <Card
              key={p.id}
              className={isCurrent ? "border-neutral-900" : undefined}
            >
              <CardContent className="flex h-full flex-col gap-3 py-5">
                <div>
                  <p className="text-sm font-semibold">{PLAN_LABELS[p.id]}</p>
                  <p className="mt-1 text-xs text-neutral-600">{p.tagline}</p>
                </div>
                <div className="mt-auto">
                  {isCurrent ? (
                    <Button size="sm" variant="outline" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <form action={createCheckoutSessionAction}>
                      <input type="hidden" name="plan" value={p.id} />
                      <Button size="sm" type="submit">
                        {currentPlan === "oss"
                          ? `Subscribe to ${PLAN_LABELS[p.id]}`
                          : `Switch to ${PLAN_LABELS[p.id]}`}
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
