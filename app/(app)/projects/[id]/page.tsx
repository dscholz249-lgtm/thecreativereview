import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSignedUrl } from "@/lib/supabase/storage";
import { PageHeading, LinkButton } from "@/components/page-heading";
import { ArrowRight, File as FileIcon, Plus } from "@/components/cr-icons";
import { RemindReviewersButton } from "./remind-reviewers-button";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, name, description, status, deadline, client_id, last_reminded_at, clients(id, name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const { data: assetsRaw } = await supabase
    .from("assets")
    .select(
      "id, name, type, status, deadline, archived, asset_versions!assets_current_version_id_fkey(id, storage_path)",
    )
    .eq("project_id", id)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  type AssetRow = {
    id: string;
    name: string;
    type: string;
    status: string;
    deadline: string | null;
    archived: boolean;
    asset_versions: { id: string; storage_path: string | null } | null;
  };
  const assets = (assetsRaw ?? []) as unknown as AssetRow[];

  // Signed URLs for the current version's file. Asset detail uses the same
  // helper; here we skip generation for assets whose current version is an
  // external URL (Figma etc.) or missing entirely.
  const thumbUrls = new Map<string, string>();
  for (const a of assets) {
    const path = a.asset_versions?.storage_path;
    if (!path) continue;
    const url = await createSignedUrl(supabase, path);
    if (url) thumbUrls.set(a.id, url);
  }

  const client = project.clients as { id: string; name: string } | null;

  return (
    <>
      <PageHeading
        title={project.name}
        description={project.description ?? undefined}
        breadcrumbs={[
          { href: "/clients", label: "Clients" },
          client ? { href: `/clients/${client.id}`, label: client.name } : { label: "Client" },
          { label: project.name },
        ]}
        actions={
          <>
            <RemindReviewersButton
              projectId={id}
              cooldownUntilIso={
                project.last_reminded_at
                  ? new Date(
                      new Date(project.last_reminded_at).getTime() +
                        24 * 60 * 60 * 1000,
                    ).toISOString()
                  : null
              }
            />
            <LinkButton href={`/projects/${id}/assets/new`}>
              <Plus /> New asset
            </LinkButton>
          </>
        }
      />

      <div className="mb-7 flex flex-wrap items-center gap-3">
        <ProjectStatusBadge status={project.status} />
        {project.deadline ? (
          <span
            className="text-[14px]"
            style={{ color: "var(--cr-muted)" }}
          >
            Deadline {formatShortDate(project.deadline)}
          </span>
        ) : null}
      </div>

      <div className="mb-4 flex items-center">
        <h3
          className="cr-display"
          style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}
        >
          Assets
        </h3>
        <span className="flex-1" />
        <span className="text-[14px]" style={{ color: "var(--cr-muted)" }}>
          {(assets ?? []).length} {(assets ?? []).length === 1 ? "asset" : "assets"}
        </span>
      </div>

      {!assets || assets.length === 0 ? (
        <div className="cr-card flex flex-col items-center gap-3 py-14 text-center">
          <p className="text-[15px]" style={{ color: "var(--cr-muted)" }}>
            No assets yet.
          </p>
          <Link
            href={`/projects/${id}/assets/new`}
            className="cr-btn cr-btn-primary"
          >
            <Plus /> Upload the first one
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {assets.map((a) => {
            const thumb = thumbUrls.get(a.id);
            const isImage =
              a.type === "image" || a.type === "design" || a.type === "wireframe";
            return (
              <Link
                key={a.id}
                href={`/assets/${a.id}`}
                className="cr-card flex items-center gap-5 p-5 transition-colors hover:border-[var(--cr-line-strong)]"
              >
                <div
                  className="flex size-[72px] shrink-0 items-center justify-center overflow-hidden"
                  style={{
                    background: "var(--cr-paper-2)",
                    border: "1px dashed var(--cr-line-strong)",
                    borderRadius: "var(--cr-radius)",
                    color: "var(--cr-muted)",
                  }}
                >
                  {thumb && isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : thumb ? (
                    // PDFs / non-image files with a storage path — show file
                    // glyph rather than attempt a raster preview.
                    <FileIcon size={22} />
                  ) : (
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em]">
                      {thumbLabel(a.type)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate"
                    style={{
                      fontFamily: "var(--font-display), serif",
                      fontWeight: 700,
                      fontSize: 20,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {a.name}
                  </div>
                  <div
                    className="mt-0.5 text-[13px] font-semibold uppercase tracking-[0.04em]"
                    style={{ color: "var(--cr-muted)" }}
                  >
                    {a.type}
                  </div>
                </div>
                {a.deadline ? (
                  <span
                    className="text-[14px]"
                    style={{ color: "var(--cr-muted)" }}
                  >
                    Due {formatShortDate(a.deadline)}
                  </span>
                ) : null}
                <AssetStatusBadge status={a.status} />
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
    <span className="cr-badge" style={{ color: "var(--cr-muted)" }}>
      <span
        className="cr-badge-dot"
        style={{ background: "var(--cr-line-strong)" }}
      />
      Draft
    </span>
  );
}

function AssetStatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span className="cr-badge cr-badge-approved">
        <span className="cr-badge-dot" />
        Approved
      </span>
    );
  }
  if (status === "rejected" || status === "revision_submitted") {
    return (
      <span className="cr-badge cr-badge-changes">
        <span className="cr-badge-dot" />
        {status === "rejected" ? "Changes requested" : "Revision submitted"}
      </span>
    );
  }
  return (
    <span className="cr-badge">
      <span className="cr-badge-dot" />
      Pending
    </span>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function thumbLabel(type: string): string {
  switch (type) {
    case "image":
      return "IMG";
    case "document":
      return "PDF";
    case "wireframe":
      return "WIRE";
    case "design":
      return "DSN";
    default:
      return type.slice(0, 3).toUpperCase();
  }
}
