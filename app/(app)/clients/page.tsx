import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeading, LinkButton } from "@/components/page-heading";
import { Avatar, avatarVariantFor } from "@/components/cr-avatar";
import { ArrowRight, Plus } from "@/components/cr-icons";
import { PLAN_LIMITS, formatLimit } from "@/lib/plans";
import { PLAN_LABELS } from "@/lib/stripe/config";

type ClientRow = {
  id: string;
  name: string;
  primary_email: string;
  archived: boolean;
  projects: Array<{
    id: string;
    assets: Array<{ id: string; status: string; archived: boolean }>;
  }>;
};

export default async function ClientsIndexPage() {
  const supabase = await createClient();
  // Pull the join all the way to assets so the list can show pending counts
  // without N+1 queries. Still cheap at beta scale (single round-trip to
  // PostgREST, filtered via RLS).
  const { data } = await supabase
    .from("clients")
    .select("id, name, primary_email, archived, projects(id, assets(id, status, archived))")
    .order("created_at", { ascending: false });

  const clients = ((data ?? []) as unknown as ClientRow[]).filter((c) => !c.archived);

  // Plan tier + cap, so the "3 of 5 clients" counter + upgrade hint stays
  // honest if an admin ships a new plan mid-session. Looked up per render
  // rather than cached — clients list isn't a hot path.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("admin_profiles")
        .select("workspaces(plan)")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  const plan =
    (profile?.workspaces as { plan: keyof typeof PLAN_LIMITS } | null)?.plan ??
    "oss";
  const cap = PLAN_LIMITS[plan].activeClients;
  const atCap = clients.length >= cap;

  return (
    <>
      <PageHeading
        title="Clients"
        description="Manage clients, reviewers, and the work in flight."
        actions={
          <>
            <LinkButton href="/clients" variant="outline">
              Invite reviewer
            </LinkButton>
            <LinkButton href="/clients/new">
              <Plus /> New client
            </LinkButton>
          </>
        }
      />

      <UsageCounter
        count={clients.length}
        cap={cap}
        planLabel={PLAN_LABELS[plan]}
        atCap={atCap}
      />

      {clients.length === 0 ? (
        <EmptyClients />
      ) : (
        <div className="flex flex-col gap-3">
          {clients.map((c) => {
            const pending = c.projects
              .flatMap((p) => p.assets)
              .filter((a) => !a.archived && a.status === "pending").length;
            const projectCount = c.projects.length;
            return (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="cr-card flex items-center gap-5 p-6 transition-colors hover:border-[var(--cr-line-strong)]"
              >
                <Avatar label={c.name} variant={avatarVariantFor(c.name)} />
                <div className="min-w-0" style={{ width: 260 }}>
                  <div
                    className="truncate"
                    style={{
                      fontFamily: "var(--font-display), serif",
                      fontWeight: 700,
                      fontSize: 22,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    className="truncate text-[14px]"
                    style={{ color: "var(--cr-muted)" }}
                  >
                    {c.primary_email}
                  </div>
                </div>
                <span className="flex-1" />
                <span
                  className="text-[14px]"
                  style={{ color: "var(--cr-muted)" }}
                >
                  {projectCount} {projectCount === 1 ? "project" : "projects"}
                </span>
                {pending > 0 ? (
                  <span className="cr-badge cr-badge-changes">
                    <span className="cr-badge-dot" />
                    {pending} pending
                  </span>
                ) : (
                  <span className="cr-badge cr-badge-approved">
                    <span className="cr-badge-dot" />
                    All clear
                  </span>
                )}
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

function EmptyClients() {
  return (
    <div className="cr-card flex flex-col items-center gap-3 py-14 text-center">
      <p className="text-[15px]" style={{ color: "var(--cr-muted)" }}>
        No clients yet.
      </p>
      <Link href="/clients/new" className="cr-btn cr-btn-primary">
        <Plus /> Create your first client
      </Link>
    </div>
  );
}

// Row above the clients list showing "N of M clients." Only rendered when
// the plan has a finite cap (OSS + Agency skip this — unlimited). Turns
// destructive-ink when at the cap and links to Billing with upsell copy.
function UsageCounter({
  count,
  cap,
  planLabel,
  atCap,
}: {
  count: number;
  cap: number;
  planLabel: string;
  atCap: boolean;
}) {
  if (!Number.isFinite(cap)) return null;
  const near = !atCap && count >= cap - 1;
  return (
    <div
      className="mb-5 flex flex-wrap items-center gap-3 text-[14px]"
      style={{ color: atCap ? "var(--cr-destructive-ink)" : "var(--cr-muted)" }}
    >
      <span style={{ fontWeight: atCap || near ? 700 : 500 }}>
        {count} of {formatLimit(cap)} clients
      </span>
      <span style={{ color: "var(--cr-line-strong)" }}>·</span>
      <span>{planLabel} plan</span>
      {atCap ? (
        <>
          <span style={{ color: "var(--cr-line-strong)" }}>·</span>
          <Link href="/billing" className="cr-link">
            Upgrade for more
          </Link>
        </>
      ) : null}
    </div>
  );
}
