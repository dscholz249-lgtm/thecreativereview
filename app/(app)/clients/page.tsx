import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeading, LinkButton } from "@/components/page-heading";
import { Avatar, avatarVariantFor } from "@/components/cr-avatar";
import { ArrowRight, Plus } from "@/components/cr-icons";

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
