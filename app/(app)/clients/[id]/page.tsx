import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeading, LinkButton } from "@/components/page-heading";
import { Avatar, avatarVariantFor } from "@/components/cr-avatar";
import { ArrowRight, Folder, Plus } from "@/components/cr-icons";

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  deadline: string | null;
  description: string | null;
  assets: Array<{ id: string; status: string; archived: boolean }>;
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, primary_email")
    .eq("id", id)
    .maybeSingle();
  if (!client) notFound();

  const { data: projectsRaw } = await supabase
    .from("projects")
    .select("id, name, status, deadline, description, assets(id, status, archived)")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const projects = (projectsRaw ?? []) as unknown as ProjectRow[];
  const pendingAcrossProjects = projects
    .flatMap((p) => p.assets)
    .filter((a) => !a.archived && a.status === "pending").length;

  return (
    <>
      <PageHeading
        title={client.name}
        description={`${client.primary_email} · ${projects.length} ${projects.length === 1 ? "project" : "projects"} · ${pendingAcrossProjects} pending`}
        breadcrumbs={[{ href: "/clients", label: "Clients" }, { label: client.name }]}
        leading={
          <Avatar label={client.name} variant={avatarVariantFor(client.name)} size="lg" />
        }
        actions={
          <>
            <LinkButton href={`/clients/${id}/reviewers`} variant="outline">
              Manage reviewers
            </LinkButton>
            <LinkButton href={`/clients/${id}/projects/new`}>
              <Plus /> New project
            </LinkButton>
          </>
        }
      />

      <div className="mb-4 flex items-center">
        <h3
          className="cr-display"
          style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}
        >
          Projects
        </h3>
        <span className="flex-1" />
        <span className="text-[14px]" style={{ color: "var(--cr-muted)" }}>
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </span>
      </div>

      {projects.length === 0 ? (
        <div className="cr-card flex flex-col items-center gap-3 py-14 text-center">
          <p className="text-[15px]" style={{ color: "var(--cr-muted)" }}>
            No projects yet for {client.name}.
          </p>
          <Link
            href={`/clients/${id}/projects/new`}
            className="cr-btn cr-btn-primary"
          >
            <Plus /> Create the first project
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((p) => {
            const active = p.assets.filter((a) => !a.archived);
            const pending = active.filter((a) => a.status === "pending").length;
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="cr-card flex items-center gap-5 p-6 transition-colors hover:border-[var(--cr-line-strong)]"
              >
                <div
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center"
                  style={{
                    background: "var(--cr-paper-2)",
                    border: "1px solid var(--cr-line)",
                    borderRadius: "var(--cr-radius)",
                    color: "var(--cr-ink)",
                  }}
                >
                  <Folder size={18} />
                </div>
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
                    {p.name}
                  </div>
                  {p.description ? (
                    <div
                      className="truncate text-[14px]"
                      style={{ color: "var(--cr-muted)" }}
                    >
                      {p.description}
                    </div>
                  ) : null}
                </div>
                <span className="flex-1" />
                <span
                  className="text-[14px]"
                  style={{ color: "var(--cr-muted)" }}
                >
                  {active.length} {active.length === 1 ? "asset" : "assets"} ·{" "}
                  {pending} pending
                </span>
                {p.deadline ? (
                  <span className="cr-badge">
                    <span
                      className="cr-badge-dot"
                      style={{ background: "var(--cr-muted)" }}
                    />
                    Due {formatShortDate(p.deadline)}
                  </span>
                ) : null}
                <ProjectStatusBadge status={p.status} />
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

function ProjectStatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="cr-badge cr-badge-approved">
        <span className="cr-badge-dot" />
        Completed
      </span>
    );
  }
  if (status === "in_review") {
    return (
      <span className="cr-badge">
        <span className="cr-badge-dot" />
        In review
      </span>
    );
  }
  if (status === "archived") {
    return (
      <span
        className="cr-badge"
        style={{ background: "var(--cr-paper-2)", color: "var(--cr-muted)" }}
      >
        <span
          className="cr-badge-dot"
          style={{ background: "var(--cr-line-strong)" }}
        />
        Archived
      </span>
    );
  }
  return (
    <span
      className="cr-badge"
      style={{ color: "var(--cr-muted)" }}
    >
      <span
        className="cr-badge-dot"
        style={{ background: "var(--cr-line-strong)" }}
      />
      Draft
    </span>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
