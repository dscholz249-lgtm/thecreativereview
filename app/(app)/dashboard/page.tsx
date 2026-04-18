import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeading, LinkButton } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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

  return (
    <>
      <PageHeading
        title="Dashboard"
        description="Everything on your plate across clients and projects."
        actions={<LinkButton href="/clients">New asset →</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Pending review" value={pendingCount.count ?? 0} />
        <MetricCard
          label="Overdue"
          value={overdueCount.count ?? 0}
          tone={(overdueCount.count ?? 0) > 0 ? "alert" : "default"}
        />
        <MetricCard
          label="Approved this week"
          value={approvedThisWeekCount.count ?? 0}
        />
        <MetricCard label="Active projects" value={activeProjectsCount.count ?? 0} />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-sm font-semibold">Active projects</h2>
          <span className="text-xs text-neutral-500">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-neutral-600">
              No active projects yet.{" "}
              <Link href="/clients" className="font-medium underline">
                Create a client
              </Link>{" "}
              to get started.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                    <th className="px-4 py-3 text-left font-medium">Project</th>
                    <th className="px-4 py-3 text-left font-medium">Client</th>
                    <th className="px-4 py-3 text-left font-medium">Progress</th>
                    <th className="px-4 py-3 text-left font-medium">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => {
                    const active = p.assets.filter((a) => !a.archived);
                    const approved = active.filter((a) => a.status === "approved").length;
                    const total = active.length;
                    const pct = total === 0 ? 0 : Math.round((approved / total) * 100);
                    const overdue = p.deadline ? p.deadline < today : false;
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/projects/${p.id}`}
                            className="font-medium hover:underline"
                          >
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">
                          {p.clients?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Progress value={pct} className="h-1.5 w-40" />
                          <p className="mt-1 text-xs text-neutral-500">
                            {approved} / {total} approved
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {p.deadline ? (
                            <span
                              className={
                                overdue
                                  ? "text-red-700 font-medium"
                                  : "text-neutral-700"
                              }
                            >
                              {p.deadline}
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "alert";
}) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-xs text-neutral-600">{label}</p>
        <p
          className={`mt-2 text-3xl font-semibold ${tone === "alert" ? "text-red-700" : "text-neutral-900"}`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// Status pill helper (unused here, kept for nearby reuse).
void Badge;
