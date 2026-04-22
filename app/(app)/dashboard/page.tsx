import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeading, LinkButton } from "@/components/page-heading";
import { Avatar, avatarVariantFor } from "@/components/cr-avatar";
import { ArrowRight, Plus } from "@/components/cr-icons";

type ActiveProjectAsset = { id: string; status: string; archived: boolean };
type ActiveProjectRow = {
  id: string;
  name: string;
  deadline: string | null;
  status: string;
  clients: { name: string } | null;
  assets: ActiveProjectAsset[];
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // Server component renders per-request; `Date.now()` is intentional and
  // deterministic for that request. The react-hooks/purity rule is aimed at
  // client components, so we silence it here.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const weekAgo = new Date(now - 7 * 86_400_000).toISOString();

  const [
    pendingCount,
    overdueCount,
    approvedThisWeekCount,
    activeProjectsCount,
    activeProjectsData,
  ] = await Promise.all([
    supabase
      .from("assets")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("archived", false),
    supabase
      .from("assets")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("archived", false)
      .lt("deadline", today),
    supabase
      .from("decisions")
      .select("*", { count: "exact", head: true })
      .eq("verdict", "approve")
      .gte("created_at", weekAgo),
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .in("status", ["draft", "in_review"]),
    supabase
      .from("projects")
      .select(
        "id, name, deadline, status, clients(name), assets(id, status, archived)",
      )
      .in("status", ["draft", "in_review"])
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(20),
  ]);

  const projects = (activeProjectsData.data ?? []) as unknown as ActiveProjectRow[];
  const overdue = overdueCount.count ?? 0;
  const dueThisWeekCount = projects.filter((p) => {
    if (!p.deadline) return false;
    const d = new Date(p.deadline).getTime();
    return d >= now && d <= now + 7 * 86_400_000;
  }).length;

  return (
    <>
      <PageHeading
        title="Dashboard"
        description="Everything on your plate across clients and projects."
        actions={
          <LinkButton href="/clients">
            <Plus /> New asset
          </LinkButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Pending review"
          value={pendingCount.count ?? 0}
          sub={
            overdue > 0
              ? `${overdue} overdue, ${(pendingCount.count ?? 0) - overdue} on track`
              : "All on track"
          }
          featured
        />
        <StatTile
          label="Overdue"
          value={overdue}
          valueColor="var(--cr-destructive-ink)"
          sub={overdue > 0 ? "Action needed" : "Nothing overdue"}
        />
        <StatTile
          label="Approved this week"
          value={approvedThisWeekCount.count ?? 0}
          valueColor="var(--cr-constructive)"
          sub="Last 7 days"
        />
        <StatTile
          label="Active projects"
          value={activeProjectsCount.count ?? 0}
          sub={
            projects.length > 0
              ? `Across ${new Set(projects.map((p) => p.clients?.name).filter(Boolean)).size} clients`
              : "None yet"
          }
        />
      </div>

      <div className="mt-10 mb-4 flex items-center">
        <h3
          className="cr-display"
          style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}
        >
          Active projects
        </h3>
        <span className="flex-1" />
        <span className="text-[14px]" style={{ color: "var(--cr-muted)" }}>
          {projects.length} {projects.length === 1 ? "project" : "projects"}
          {dueThisWeekCount > 0 ? ` · ${dueThisWeekCount} due this week` : ""}
        </span>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          body="No active projects yet."
          ctaHref="/clients"
          ctaLabel="Create a client"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((p) => {
            const active = p.assets.filter((a) => !a.archived);
            const approved = active.filter((a) => a.status === "approved").length;
            const pending = active.filter((a) => a.status === "pending").length;
            const isOverdue = p.deadline ? p.deadline < today : false;
            const clientName = p.clients?.name ?? "—";
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="cr-card flex items-center gap-5 p-6 transition-colors hover:border-[var(--cr-line-strong)]"
              >
                <Avatar
                  label={clientName}
                  variant={avatarVariantFor(clientName)}
                />
                <div className="min-w-0" style={{ width: 240 }}>
                  <div
                    className="text-[13px] font-semibold uppercase tracking-[0.04em]"
                    style={{ color: "var(--cr-muted)" }}
                  >
                    {clientName}
                  </div>
                  <div
                    className="truncate"
                    style={{
                      fontFamily: "var(--font-display), serif",
                      fontWeight: 700,
                      fontSize: 20,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {p.name}
                  </div>
                </div>
                <span className="flex-1" />
                <div
                  className="text-right text-[14px]"
                  style={{ color: "var(--cr-muted)", minWidth: 140 }}
                >
                  {active.length} {active.length === 1 ? "asset" : "assets"}
                  {" · "}
                  {pending} pending
                  {approved > 0 ? `, ${approved} approved` : ""}
                </div>
                <span
                  className="cr-badge"
                  style={{ minWidth: 112, justifyContent: "center" }}
                >
                  <span
                    className="cr-badge-dot"
                    style={{
                      background: isOverdue
                        ? "var(--cr-destructive-ink)"
                        : "var(--cr-constructive)",
                    }}
                  />
                  {p.deadline ? `Due ${formatShortDate(p.deadline)}` : "No deadline"}
                </span>
                <span className="cr-btn cr-btn-sm cr-btn-ghost">
                  Open <ArrowRight size={14} />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function StatTile({
  label,
  value,
  sub,
  valueColor = "var(--cr-ink)",
  featured = false,
}: {
  label: string;
  value: number;
  sub?: string;
  valueColor?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={featured ? "cr-card-raised" : "cr-card"}
      style={{ padding: "20px 22px 22px" }}
    >
      <div className="flex flex-col gap-2.5">
        <span
          className="text-[13px] font-bold uppercase tracking-[0.08em]"
          style={{ color: "var(--cr-muted)" }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display), serif",
            fontWeight: 800,
            fontSize: 56,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: valueColor,
          }}
        >
          {value}
        </span>
        {sub ? (
          <span className="text-[13px]" style={{ color: "var(--cr-muted)" }}>
            {sub}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({
  body,
  ctaHref,
  ctaLabel,
}: {
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="cr-card flex flex-col items-center gap-3 py-12">
      <p className="text-[15px]" style={{ color: "var(--cr-muted)" }}>
        {body}
      </p>
      <Link href={ctaHref} className="cr-btn cr-btn-sm">
        {ctaLabel}
      </Link>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
