import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSignedUrl } from "@/lib/supabase/storage";
import { File as FileIcon, X } from "@/components/cr-icons";
import { ApproveButton } from "./approve-button";

export default async function ReviewerAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: asset } = await supabase
    .from("assets")
    .select(
      "id, name, type, status, deadline, current_version_id, projects(id, name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!asset) notFound();

  if (!asset.current_version_id) {
    return (
      <EmptyState>
        This asset hasn&apos;t been uploaded yet. Come back once the admin
        publishes a version.
      </EmptyState>
    );
  }

  const { data: version } = await supabase
    .from("asset_versions")
    .select("id, version_number, storage_path, external_url, upload_note, uploaded_at")
    .eq("id", asset.current_version_id)
    .maybeSingle();
  if (!version) notFound();

  const signed = version.storage_path
    ? await createSignedUrl(supabase, version.storage_path)
    : null;
  const previewUrl = signed ?? version.external_url;

  const project = asset.projects as { id: string; name: string } | null;
  const isDecided = asset.status === "approved" || asset.status === "rejected";
  const imageRenderable = isImagePreview(asset.type, version.storage_path);

  return (
    <div className="mx-auto max-w-[1240px]">
      <Link
        href="/review/my-reviews"
        className="cr-link mb-4 inline-block text-[14px]"
      >
        ← My reviews
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="cr-eyebrow mb-2">
            {project?.name ?? "—"} · v{version.version_number}
          </p>
          <h1
            className="cr-display"
            style={{
              fontFamily: "var(--font-display), serif",
              fontWeight: 800,
              fontSize: 48,
              letterSpacing: "-0.02em",
            }}
          >
            {asset.name}
          </h1>
        </div>
        <StatusBadge status={asset.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div
          className="cr-card-raised"
          style={{ padding: 24, background: "var(--cr-paper-2)" }}
        >
          {previewUrl && imageRenderable ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={asset.name}
              className="h-full w-full object-contain"
              style={{
                borderRadius: "var(--cr-radius)",
                border: "1px solid var(--cr-line)",
                background: "var(--cr-card)",
              }}
            />
          ) : previewUrl ? (
            <div
              className="flex flex-col items-center justify-center gap-3 py-16 text-center"
              style={{
                border: "1px dashed var(--cr-line-strong)",
                borderRadius: "var(--cr-radius)",
                background: "var(--cr-card)",
                aspectRatio: "8.5 / 11",
                width: "100%",
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
              <div
                className="mt-1 text-[12px]"
                style={{ color: "var(--cr-muted)" }}
              >
                PDFs are text-only feedback. Add your note below.
              </div>
            </div>
          ) : (
            <div
              className="py-16 text-center text-[14px]"
              style={{ color: "var(--cr-muted)" }}
            >
              No preview available
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          {version.upload_note ? (
            <div className="cr-card p-5">
              <p className="cr-eyebrow mb-2">Note from the team</p>
              <p className="text-[16px]" style={{ color: "var(--cr-ink)" }}>
                {version.upload_note}
              </p>
            </div>
          ) : null}

          <div className="cr-card p-5">
            <div className="flex flex-col gap-2">
              <MetaRow label="Type" value={asset.type} />
              <MetaRow label="Version" value={`v${version.version_number}`} />
              <MetaRow
                label="Uploaded"
                value={new Date(version.uploaded_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              />
              {asset.deadline ? (
                <MetaRow
                  label="Deadline"
                  value={formatShortDate(asset.deadline)}
                  valueStyle={{ color: "var(--cr-destructive-ink)" }}
                />
              ) : null}
            </div>
          </div>

          {isDecided ? (
            <div className="cr-card p-5">
              <StatusBadge status={asset.status} />
              <p
                className="mt-3 text-[13px]"
                style={{ color: "var(--cr-muted)" }}
              >
                This version has a decision. New versions from the team will
                show up on your inbox.
              </p>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 20 }}>
              <ApproveButton assetId={asset.id} versionId={version.id} />
              <Link
                href={`/review/assets/${asset.id}/request-changes`}
                className="cr-btn cr-btn-destructive cr-btn-lg"
                style={{ width: "100%" }}
              >
                <X /> Request changes
              </Link>
              <p
                className="text-[13px]"
                style={{ color: "var(--cr-muted)", lineHeight: 1.5 }}
              >
                Approving means no changes are needed. If you want to leave
                notes, choose &ldquo;Request changes&rdquo; instead.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div className="flex items-center justify-between text-[14px]">
      <span style={{ color: "var(--cr-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "var(--cr-ink)", ...valueStyle }}>
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span
        className="cr-badge cr-badge-approved"
        style={{ fontSize: 14, padding: "6px 12px" }}
      >
        <span className="cr-badge-dot" />
        Approved
      </span>
    );
  }
  if (status === "rejected" || status === "revision_submitted") {
    return (
      <span
        className="cr-badge cr-badge-changes"
        style={{ fontSize: 14, padding: "6px 12px" }}
      >
        <span className="cr-badge-dot" />
        {status === "rejected" ? "Changes requested" : "Revision submitted"}
      </span>
    );
  }
  return (
    <span
      className="cr-badge"
      style={{ fontSize: 14, padding: "6px 12px" }}
    >
      <span className="cr-badge-dot" />
      Pending your review
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="cr-card flex flex-col items-center gap-2 py-14 text-center">
      <p className="text-[15px]" style={{ color: "var(--cr-muted)" }}>
        {children}
      </p>
    </div>
  );
}

function isImagePreview(type: string, storagePath: string | null): boolean {
  if (!storagePath) return false;
  return type === "image" || type === "design" || type === "wireframe";
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
