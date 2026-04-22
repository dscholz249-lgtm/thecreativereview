import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/page-heading";
import { Avatar, avatarVariantFor } from "@/components/cr-avatar";
import { ArrowRight } from "@/components/cr-icons";

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  deadline: string | null;
  clients: { name: string } | null;
  assets: Array<{ id: string; status: string; archived: boolean }>;
};

// Admin "Reviews" view — every non-archived project across every client,
// sorted by how much attention they need (pending desc, then deadline asc).
// This is the /projects index the topbar "Reviews" link points at; per-
// project drilldowns live at /projects/[id].
export default async function ProjectsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const activeFilter: "active" | "pending" | "completed" =
    filter === "pending"
      ? "pending"
      : filter === "completed"
        ? "completed"
        : "active";

  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("projects")
    .select(
      "id, name, status, deadline, clients(name), assets(id, status, archived)",
    )
    .neq("status", "archived")
    .order("deadline", { ascending: true, nullsFirst: false });

  let projects = ((raw ?? []) as unknown as ProjectRow[]).map((p) => {
    const active = p.assets.filter((a) => !a.archived);
    const pending = active.filter((a) => a.status === "pending").length;
    const approved = active.filter((a) => a.status === "approved").length;
    return { ...p, _pending: pending, _approved: approved, _total: active.length };
  });

  const counts = {
    active: projects.filter((p) => p.status !== "completed").length,
    pending: projects.filter((p) => p._pending > 0).length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  if (activeFilter === "pending") {
    projects = projects.filter((p) => p._pending > 0);
  } else if (activeFilter === "completed") {
    projects = projects.filter((p) => p.status === "completed");
  } else {
    projects = projects.filter((p) => p.status !== "completed");
  }

  // Within the filtered view, show the most urgent first: pending desc,
  // then deadline asc (nulls last). Stable — relies on the query order.
  projects.sort((a, b) => {
    if (b._pending !== a._pending) return b._pending - a._pending;
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeading
        title="Reviews"
        description="Every project that needs your attention, across clients."
      />

      <nav
        className="mb-6 flex items-center gap-1"
        style={{ borderBottom: "1px solid var(--cr-line)" }}
      >
        <TabLink filter="active" active={activeFilter} count={counts.active} label="Active" />
        <TabLink filter="pending" active={activeFilter} count={counts.pending} label="With pending" />
        <TabLink filter="completed" active={activeFilter} count={counts.completed} label="Completed" />
      </nav>

      {projects.length === 0 ? (
        <div className="cr-card flex flex-col items-center gap-2 py-14 text-center">
          <p className="text-[15px]" style={{ color: "var(--cr-muted)" }}>
            Nothing in this view.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((p) => {
            const clientName = p.clients?.name ?? "—";
            const isOverdue = p.deadline ? p.deadline < today : false;
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
                  style={{ color: "var(--cr-muted)", minWidth: 160 }}
                >
                  {p._total} {p._total === 1 ? "asset" : "assets"} ·{" "}
                  {p._pending} pending
                  {p._approved > 0 ? `, ${p._approved} approved` : ""}
                </div>
                <span
                  className={
                    p._pending > 0
                      ? "cr-badge cr-badge-changes"
                      : p.status === "completed"
                        ? "cr-badge cr-badge-approved"
                        : "cr-badge"
                  }
                  style={{ minWidth: 112, justifyContent: "center" }}
                >
                  <span className="cr-badge-dot" />
                  {p._pending > 0
                    ? `${p._pending} pending`
                    : p.status === "completed"
                      ? "Completed"
                      : p.deadline
                        ? `Due ${formatShortDate(p.deadline)}`
                        : "Active"}
                </span>
                {p.deadline && p._pending > 0 ? (
                  <span
                    className="text-[13px]"
                    style={{
                      color: isOverdue
                        ? "var(--cr-destructive-ink)"
                        : "var(--cr-muted)",
                      fontWeight: isOverdue ? 700 : 500,
                      minWidth: 96,
                      textAlign: "right",
                    }}
                  >
                    {isOverdue ? "Overdue" : `Due ${formatShortDate(p.deadline)}`}
                  </span>
                ) : null}
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

function TabLink({
  filter,
  active,
  count,
  label,
}: {
  filter: "active" | "pending" | "completed";
  active: "active" | "pending" | "completed";
  count: number;
  label: string;
}) {
  const isActive = filter === active;
  return (
    <Link
      href={`/projects?filter=${filter}`}
      className="px-4 py-3 text-[15px] font-semibold transition-colors"
      style={{
        color: isActive ? "var(--cr-ink)" : "var(--cr-muted)",
        borderBottom: isActive
          ? "3px solid var(--cr-ink)"
          : "3px solid transparent",
        marginBottom: -1,
      }}
    >
      {label}{" "}
      <span
        className="ml-1 inline-block rounded-md px-2 py-0.5 text-[13px] font-bold"
        style={{
          background: isActive ? "var(--cr-accent-green)" : "var(--cr-paper-2)",
          color: isActive ? "var(--cr-accent-green-ink)" : "var(--cr-muted)",
        }}
      >
        {count}
      </span>
    </Link>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
