import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/admin-client";
import { serverEnv } from "@/lib/env.server";
import { PageHeading } from "@/components/page-heading";
import { PLAN_LABELS } from "@/lib/stripe/config";
import { getBillingState } from "@/lib/trial";
import {
  buildWorkspaceSummaries,
  type WorkspaceSummary,
} from "@/lib/superadmin";

// Cross-workspace admin overview for the operator running the hosted
// product. Gated by SUPER_ADMIN_EMAIL — if the env var is unset or the
// caller's email doesn't match, the route is invisible (404). No nav
// link anywhere; reach it by typing the URL.
//
// All queries use the service-role client to bypass RLS. The (app)
// layout already ran the regular auth + admin_profile gate, so the
// user is at minimum an authenticated admin of *some* workspace before
// this page even renders.

export const dynamic = "force-dynamic";

export default async function SuperadminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowedEmail = serverEnv.SUPER_ADMIN_EMAIL;
  const callerEmail = user?.email?.trim().toLowerCase() ?? null;
  if (!allowedEmail || !callerEmail || callerEmail !== allowedEmail) {
    // 404 — not 403. Don't leak that the route exists to other admins.
    notFound();
  }

  const admin = createAdminClient();

  const [workspacesQ, profilesQ, clientsQ, usersQ] = await Promise.all([
    admin
      .from("workspaces")
      .select(
        "id, name, plan, trial_ends_at, stripe_subscription_id, created_at",
      ),
    admin.from("admin_profiles").select("user_id, workspace_id, role, name"),
    admin.from("clients").select("workspace_id, archived"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (workspacesQ.error || profilesQ.error || clientsQ.error) {
    console.error("[superadmin] query failed", {
      workspaces: workspacesQ.error,
      profiles: profilesQ.error,
      clients: clientsQ.error,
    });
    throw new Error("Superadmin data load failed");
  }

  const summaries = buildWorkspaceSummaries({
    workspaces: workspacesQ.data ?? [],
    adminProfiles: profilesQ.data ?? [],
    clients: clientsQ.data ?? [],
    authUsers: (usersQ.data?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? null,
    })),
  });

  const totals = {
    workspaces: summaries.length,
    admins: summaries.reduce((acc, w) => acc + w.admin_count, 0),
    activeClients: summaries.reduce(
      (acc, w) => acc + w.active_client_count,
      0,
    ),
    paid: summaries.filter((w) => w.has_subscription).length,
    trialing: summaries.filter(
      (w) => getBillingState(stateInputFromSummary(w)).kind === "trialing",
    ).length,
    lapsed: summaries.filter(
      (w) => getBillingState(stateInputFromSummary(w)).kind === "lapsed",
    ).length,
  };

  return (
    <>
      <PageHeading
        title="Superadmin"
        description="Every workspace on the platform. Read-only."
      />

      <div className="mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Workspaces" value={totals.workspaces} />
        <Stat label="Admins" value={totals.admins} />
        <Stat label="Active clients" value={totals.activeClients} />
        <Stat label="Paid" value={totals.paid} />
        <Stat label="Trialing" value={totals.trialing} />
        <Stat
          label="Lapsed"
          value={totals.lapsed}
          tone={totals.lapsed > 0 ? "warn" : "default"}
        />
      </div>

      <div className="flex flex-col gap-3">
        {summaries.map((w) => (
          <WorkspaceRow key={w.id} workspace={w} />
        ))}
      </div>
    </>
  );
}

function stateInputFromSummary(w: WorkspaceSummary) {
  return {
    plan: w.plan,
    stripe_subscription_id: w.has_subscription ? "_" : null,
    trial_ends_at: w.trial_ends_at,
  };
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn";
}) {
  const color =
    tone === "warn" && value > 0
      ? "var(--cr-destructive-ink)"
      : "var(--cr-ink)";
  return (
    <div className="cr-card p-4">
      <p className="cr-eyebrow">{label}</p>
      <p
        className="mt-1"
        style={{
          fontFamily: "var(--font-display), serif",
          fontWeight: 800,
          fontSize: 28,
          letterSpacing: "-0.02em",
          color,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function WorkspaceRow({ workspace: w }: { workspace: WorkspaceSummary }) {
  const state = getBillingState(stateInputFromSummary(w));
  return (
    <div className="cr-card p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          style={{
            fontFamily: "var(--font-display), serif",
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: "-0.01em",
          }}
        >
          {w.name}
        </span>
        <span
          className="text-[13px]"
          style={{ color: "var(--cr-muted)" }}
        >
          {PLAN_LABELS[w.plan]}
        </span>
        <StatePill state={state} trialEndsAt={w.trial_ends_at} />
        <span
          className="ml-auto text-[12px]"
          style={{ color: "var(--cr-muted)" }}
        >
          Created {formatDate(w.created_at)}
        </span>
      </div>

      <div
        className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[14px]"
        style={{ color: "var(--cr-muted)" }}
      >
        <span>
          <span style={{ color: "var(--cr-ink)", fontWeight: 700 }}>
            {w.admin_count}
          </span>{" "}
          {w.admin_count === 1 ? "admin" : "admins"}
        </span>
        <span>
          <span style={{ color: "var(--cr-ink)", fontWeight: 700 }}>
            {w.active_client_count}
          </span>{" "}
          active {w.active_client_count === 1 ? "client" : "clients"}
        </span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12 }}>
          {w.id}
        </span>
      </div>

      {w.admins.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1 text-[13px]">
          {w.admins.map((a) => (
            <li key={a.user_id} className="flex flex-wrap items-baseline gap-2">
              <span style={{ color: "var(--cr-ink)" }}>
                {a.email ?? "(no email on file)"}
              </span>
              <span
                className="text-[11px] uppercase tracking-[0.08em]"
                style={{
                  color:
                    a.role === "owner"
                      ? "var(--cr-ink)"
                      : "var(--cr-muted)",
                  fontWeight: 700,
                }}
              >
                {a.role}
              </span>
              {a.name ? (
                <span style={{ color: "var(--cr-muted)" }}>· {a.name}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p
          className="mt-3 text-[13px]"
          style={{ color: "var(--cr-muted)" }}
        >
          No admins linked — orphaned workspace.
        </p>
      )}
    </div>
  );
}

function StatePill({
  state,
  trialEndsAt,
}: {
  state: ReturnType<typeof getBillingState>;
  trialEndsAt: string | null;
}) {
  if (state.kind === "active") {
    return (
      <span className="cr-badge cr-badge-approved">
        <span className="cr-badge-dot" />
        Paid
      </span>
    );
  }
  if (state.kind === "trialing") {
    return (
      <span className="cr-badge">
        <span
          className="cr-badge-dot"
          style={{ background: "var(--cr-accent-green)" }}
        />
        Trial · {state.daysLeft}d
      </span>
    );
  }
  if (state.kind === "lapsed") {
    return (
      <span
        className="cr-badge"
        style={{
          background: "var(--cr-destructive-soft)",
          color: "var(--cr-destructive-ink)",
          borderColor: "var(--cr-destructive-ink)",
        }}
      >
        <span
          className="cr-badge-dot"
          style={{ background: "var(--cr-destructive-ink)" }}
        />
        Lapsed{trialEndsAt ? ` since ${formatDate(trialEndsAt)}` : ""}
      </span>
    );
  }
  return (
    <span className="cr-badge">
      <span
        className="cr-badge-dot"
        style={{ background: "var(--cr-line-strong)" }}
      />
      Self-hosted
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
