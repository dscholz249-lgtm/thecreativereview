import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createSignedUrl } from "@/lib/supabase/storage";
import { PageHeading } from "@/components/page-heading";
import { Avatar as CrAvatar, avatarVariantFor } from "@/components/cr-avatar";
import { Archive, File as FileIcon, Pin } from "@/components/cr-icons";
import { UploadVersionDialog } from "./upload-version-dialog";
import { ArchiveAssetForm } from "./archive-asset-form";

type Version = {
  id: string;
  version_number: number;
  storage_path: string | null;
  external_url: string | null;
  upload_note: string | null;
  uploaded_at: string;
};

type Decision = {
  id: string;
  verdict: "approve" | "reject";
  feedback_text: string | null;
  created_at: string;
  reviewer_id: string;
  client_reviewers: { email: string; name: string | null } | null;
};

type Annotation = {
  id: string;
  x_pct: number;
  y_pct: number;
  comment_text: string;
  created_at: string;
  reviewer_id: string;
  client_reviewers: { email: string; name: string | null } | null;
};

export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { id } = await params;
  const { v } = await searchParams;
  const supabase = await createClient();

  const { data: asset } = await supabase
    .from("assets")
    .select(
      "id, name, type, status, deadline, current_version_id, project_id, projects(id, name, client_id, clients(id, name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!asset) notFound();

  const { data: versionsData } = await supabase
    .from("asset_versions")
    .select("id, version_number, storage_path, external_url, upload_note, uploaded_at")
    .eq("asset_id", id)
    .order("version_number", { ascending: false });
  const versions = (versionsData ?? []) as Version[];

  // Resolve which version the page is viewing. Explicit ?v=N takes
  // priority; otherwise show the asset's current version.
  const requestedVersionNumber = v ? Number.parseInt(v, 10) : NaN;
  const viewedVersion =
    (Number.isFinite(requestedVersionNumber)
      ? versions.find((ver) => ver.version_number === requestedVersionNumber)
      : undefined) ??
    versions.find((ver) => ver.id === asset.current_version_id) ??
    versions[0] ??
    null;
  const isViewingCurrent = viewedVersion?.id === asset.current_version_id;

  const [{ data: decisionsData }, { data: annotationsData }] = viewedVersion
    ? await Promise.all([
        supabase
          .from("decisions")
          .select(
            "id, verdict, feedback_text, created_at, reviewer_id, client_reviewers(email, name)",
          )
          .eq("asset_version_id", viewedVersion.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("annotations")
          .select(
            "id, x_pct, y_pct, comment_text, created_at, reviewer_id, client_reviewers(email, name)",
          )
          .eq("asset_version_id", viewedVersion.id)
          .order("created_at", { ascending: true }),
      ])
    : [{ data: [] as Decision[] }, { data: [] as Annotation[] }];

  const decisions = (decisionsData ?? []) as Decision[];
  const annotations = (annotationsData ?? []) as Annotation[];
  const numberedAnnotations = annotations.map((a, i) => ({ ...a, number: i + 1 }));

  const previewSignedUrl = viewedVersion?.storage_path
    ? await createSignedUrl(supabase, viewedVersion.storage_path)
    : null;
  const previewUrl = previewSignedUrl ?? viewedVersion?.external_url ?? null;

  const project = asset.projects as {
    id: string;
    name: string;
    client_id: string;
    clients: { id: string; name: string } | null;
  } | null;
  const client = project?.clients ?? null;
  const imageRenderable = isRenderableImage(asset.type, viewedVersion);
  const basePath = `/assets/${asset.id}`;

  return (
    <>
      <PageHeading
        title={asset.name}
        breadcrumbs={[
          { href: "/clients", label: "Clients" },
          client ? { href: `/clients/${client.id}`, label: client.name } : { label: "Client" },
          project ? { href: `/projects/${project.id}`, label: project.name } : { label: "Project" },
          { label: asset.name },
        ]}
        actions={
          <>
            <UploadVersionDialog assetId={asset.id} assetType={asset.type} />
            <ArchiveAssetForm assetId={asset.id} />
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-[14px]">
        <AssetStatusBadge status={asset.status} />
        <span style={{ color: "var(--cr-muted)" }}>
          {viewedVersion ? `v${viewedVersion.version_number}` : "—"}
          {viewedVersion
            ? ` · uploaded ${new Date(viewedVersion.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            : ""}
          {asset.deadline ? ` · due ${formatShortDate(asset.deadline)}` : ""}
        </span>
      </div>

      {!isViewingCurrent && viewedVersion ? (
        <div
          className="mb-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[14px] font-semibold"
          style={{
            background: "var(--cr-destructive-soft)",
            border: "1.5px solid var(--cr-destructive-ink)",
            borderRadius: "var(--cr-radius)",
            color: "var(--cr-destructive-ink)",
          }}
        >
          <span>
            Viewing v{viewedVersion.version_number} (read-only). The current
            version is different.
          </span>
          <Link href={basePath} className="cr-link">
            Back to current
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <div className="cr-card-raised overflow-hidden">
            <div
              className="flex items-center px-4 py-3.5"
              style={{ borderBottom: "1px solid var(--cr-line)" }}
            >
              <span className="cr-eyebrow">
                Preview {viewedVersion ? `· v${viewedVersion.version_number}` : ""}
              </span>
              <span className="flex-1" />
              <span className="text-[13px]" style={{ color: "var(--cr-muted)" }}>
                {numberedAnnotations.length}{" "}
                {numberedAnnotations.length === 1 ? "pin" : "pins"}
              </span>
            </div>
            <div
              className="relative flex aspect-[4/3] items-center justify-center"
              style={{ background: "var(--cr-paper)", padding: 28 }}
            >
              {previewUrl && imageRenderable ? (
                <div className="relative h-full w-full">
                  <Image
                    src={previewUrl}
                    alt={asset.name}
                    fill={false}
                    width={1200}
                    height={900}
                    unoptimized
                    className="h-full w-full object-contain"
                    style={{
                      borderRadius: "var(--cr-radius)",
                      border: "1px solid var(--cr-line)",
                    }}
                  />
                  {numberedAnnotations.map((a) => (
                    <span
                      key={a.id}
                      style={{
                        left: `${a.x_pct * 100}%`,
                        top: `${a.y_pct * 100}%`,
                        transform: "translate(-50%, -50%)",
                        background: "var(--cr-ink)",
                        border: "2px solid white",
                        boxShadow: "0 2px 0 var(--cr-ink), 0 0 0 1px var(--cr-ink)",
                        fontFamily: "var(--font-display), serif",
                        fontWeight: 800,
                      }}
                      className="pointer-events-none absolute flex size-7 items-center justify-center rounded-full text-[13px] text-white"
                      aria-label={`Pin ${a.number}`}
                    >
                      {a.number}
                    </span>
                  ))}
                </div>
              ) : previewUrl ? (
                <div
                  className="flex w-full flex-col items-center justify-center gap-3 py-16 text-center"
                  style={{
                    border: "1px dashed var(--cr-line-strong)",
                    borderRadius: "var(--cr-radius)",
                    background: "var(--cr-paper-2)",
                    backgroundImage:
                      "repeating-linear-gradient(45deg, transparent 0 12px, rgba(10, 10, 10, 0.04) 12px 13px)",
                  }}
                >
                  <FileIcon size={32} />
                  <span
                    className="text-[14px] font-semibold"
                    style={{ color: "var(--cr-ink)" }}
                  >
                    {asset.name}
                  </span>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cr-btn cr-btn-sm"
                  >
                    Open in new tab
                  </a>
                </div>
              ) : (
                <span
                  className="text-[14px]"
                  style={{ color: "var(--cr-muted)" }}
                >
                  No preview available
                </span>
              )}
            </div>

            <div
              className="px-4 py-4"
              style={{ borderTop: "1px solid var(--cr-line)" }}
            >
              <div className="mb-3 flex items-center">
                <span className="cr-eyebrow">Versions</span>
                <span className="flex-1" />
              </div>
              <div className="flex flex-wrap gap-3">
                {versions.map((ver) => {
                  const isCurrent = ver.id === asset.current_version_id;
                  const isViewed = ver.id === viewedVersion?.id;
                  const href = isCurrent
                    ? basePath
                    : `${basePath}?v=${ver.version_number}`;
                  return (
                    <Link
                      key={ver.id}
                      href={href}
                      className="block min-w-[200px] flex-1 basis-[240px]"
                      style={{
                        padding: "14px 16px",
                        borderRadius: "var(--cr-radius)",
                        border: isViewed
                          ? "1.5px solid var(--cr-ink)"
                          : "1px solid var(--cr-line-strong)",
                        background: isViewed ? "var(--cr-paper-2)" : "var(--cr-card)",
                        boxShadow: isViewed ? "2px 2px 0 var(--cr-ink)" : "none",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            fontFamily: "var(--font-display), serif",
                            fontWeight: 800,
                            fontSize: 18,
                          }}
                        >
                          v{ver.version_number}
                        </span>
                        {isCurrent ? (
                          <span
                            className="cr-badge"
                            style={{
                              background: "var(--cr-ink)",
                              color: "white",
                              borderColor: "var(--cr-ink)",
                            }}
                          >
                            current
                          </span>
                        ) : null}
                      </div>
                      <p
                        className="mt-1 text-[13px]"
                        style={{ color: "var(--cr-muted)" }}
                      >
                        {new Date(ver.uploaded_at).toLocaleDateString()} ·{" "}
                        {ver.storage_path ? "file" : "external link"}
                      </p>
                      {ver.upload_note ? (
                        <p
                          className="mt-2 line-clamp-2 text-[13px] italic"
                          style={{ color: "var(--cr-ink-2)" }}
                        >
                          “{ver.upload_note}”
                        </p>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          {viewedVersion?.upload_note ? (
            <div className="cr-card p-5">
              <p className="cr-eyebrow mb-2">Note from uploader</p>
              <p className="text-[15px]" style={{ color: "var(--cr-ink)" }}>
                {viewedVersion.upload_note}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            <div className="flex items-center">
              <span className="cr-eyebrow">
                Review activity{" "}
                {viewedVersion ? `· v${viewedVersion.version_number}` : ""}
              </span>
              <span className="flex-1" />
              <span
                className="text-[13px]"
                style={{ color: "var(--cr-muted)" }}
              >
                {decisions.length + numberedAnnotations.length}{" "}
                {decisions.length + numberedAnnotations.length === 1
                  ? "item"
                  : "items"}
              </span>
            </div>

            {decisions.length === 0 && numberedAnnotations.length === 0 ? (
              <div className="cr-card flex flex-col items-center gap-1 py-10 text-center">
                <p
                  className="text-[14px]"
                  style={{ color: "var(--cr-muted)" }}
                >
                  {isViewingCurrent
                    ? "No activity yet. Once reviewers decide, their feedback shows here."
                    : "No activity recorded on this version."}
                </p>
              </div>
            ) : (
              <>
                {decisions.map((d) => (
                  <DecisionCard
                    key={d.id}
                    decision={d}
                    versionNumber={viewedVersion?.version_number ?? null}
                  />
                ))}
                {numberedAnnotations.map((a) => (
                  <AnnotationCard
                    key={a.id}
                    annotation={a}
                    versionNumber={viewedVersion?.version_number ?? null}
                  />
                ))}
              </>
            )}
          </div>

          <div
            className="mt-2 text-[13px]"
            style={{ color: "var(--cr-muted)" }}
          >
            <Archive size={14} className="mr-1 inline-block" /> Reminders now
            live on the project page.
          </div>
        </aside>
      </div>
    </>
  );
}

function DecisionCard({
  decision,
  versionNumber,
}: {
  decision: Decision;
  versionNumber: number | null;
}) {
  const reviewerLabel = reviewerDisplay(decision.client_reviewers);
  return (
    <div className="cr-card p-4">
      <div className="mb-2 flex items-center gap-2.5">
        <CrAvatar
          label={reviewerLabel}
          variant={avatarVariantFor(reviewerLabel)}
          size="sm"
        />
        <span
          className="text-[13px] font-bold uppercase tracking-[0.06em]"
          style={{ color: "var(--cr-ink)" }}
        >
          {reviewerLabel}
        </span>
        <span className="flex-1" />
        {decision.verdict === "approve" ? (
          <span className="cr-badge cr-badge-approved">
            <span className="cr-badge-dot" />
            Approved
          </span>
        ) : (
          <span className="cr-badge cr-badge-changes">
            <span className="cr-badge-dot" />
            Changes
          </span>
        )}
      </div>
      {decision.feedback_text ? (
        <p
          className="whitespace-pre-wrap text-[15px]"
          style={{ color: "var(--cr-ink-2)" }}
        >
          {decision.feedback_text}
        </p>
      ) : (
        <p
          className="text-[14px] italic"
          style={{ color: "var(--cr-muted)" }}
        >
          Approved{versionNumber !== null ? ` on v${versionNumber}` : ""}.
        </p>
      )}
      <p
        className="mt-2 text-[12px]"
        style={{ color: "var(--cr-muted)" }}
      >
        {new Date(decision.created_at).toLocaleString()}
      </p>
    </div>
  );
}

function AnnotationCard({
  annotation,
  versionNumber,
}: {
  annotation: Annotation & { number: number };
  versionNumber: number | null;
}) {
  const reviewerLabel = reviewerDisplay(annotation.client_reviewers);
  return (
    <div className="cr-card p-4">
      <div className="mb-2 flex items-center gap-2.5">
        <CrAvatar
          label={reviewerLabel}
          variant={avatarVariantFor(reviewerLabel)}
          size="sm"
        />
        <span
          className="text-[13px] font-bold uppercase tracking-[0.06em]"
          style={{ color: "var(--cr-ink)" }}
        >
          {reviewerLabel}
        </span>
        <span className="flex-1" />
        <span
          className="cr-badge"
          style={{
            background: "var(--cr-ink)",
            color: "white",
            borderColor: "var(--cr-ink)",
          }}
        >
          <Pin size={11} /> Pin {annotation.number}
        </span>
      </div>
      <p
        className="whitespace-pre-wrap text-[15px]"
        style={{ color: "var(--cr-ink-2)" }}
      >
        {annotation.comment_text}
      </p>
      <p className="mt-2 text-[12px]" style={{ color: "var(--cr-muted)" }}>
        {new Date(annotation.created_at).toLocaleString()}
        {versionNumber !== null ? ` · v${versionNumber}` : ""}
      </p>
    </div>
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
      Pending review
    </span>
  );
}

function reviewerDisplay(
  reviewer: { email: string; name: string | null } | null,
): string {
  if (!reviewer) return "Reviewer";
  return reviewer.name?.trim() || reviewer.email;
}

function isRenderableImage(type: string, version: Version | null): boolean {
  if (!version?.storage_path) return false;
  return type === "image" || type === "design" || type === "wireframe";
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
