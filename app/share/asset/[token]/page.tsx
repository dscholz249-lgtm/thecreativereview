import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/server/admin-client";
import { createSignedUrl } from "@/lib/supabase/storage";
import { CreativeReviewLogo } from "@/components/creative-review-logo";
import { File as FileIcon } from "@/components/cr-icons";

// Public, view-only asset preview. Gated by an unguessable random token;
// no user session required on the client — we look everything up via the
// service-role admin client.
//
// What the visitor CAN do: see the asset preview, the uploader's note, and
// basic metadata (version, uploaded date, deadline).
//
// What the visitor CANNOT do: approve, reject, leave pins, add comments,
// or see other reviewers' activity on the asset. There's no form element
// on this page that would let them — the UI is the enforcement, and since
// there's no authenticated session, RLS would reject any attempted write
// even if a form existed.

export const metadata: Metadata = {
  title: "The Creative Review — shared asset",
  robots: { index: false, follow: false },
};

type ShareTokenRow = {
  id: string;
  asset_id: string;
  asset_version_id: string | null;
  expires_at: string;
  revoked_at: string | null;
};

type AssetRow = {
  id: string;
  name: string;
  type: string;
  deadline: string | null;
  current_version_id: string | null;
  projects: { id: string; name: string } | null;
};

type VersionRow = {
  id: string;
  version_number: number;
  storage_path: string | null;
  external_url: string | null;
  upload_note: string | null;
  uploaded_at: string;
};

export default async function SharedAssetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return <Failure reason="invalid" />;
  }

  const admin = createAdminClient();

  const { data: shareRow, error: shareError } = await admin
    .from("asset_share_tokens")
    .select("id, asset_id, asset_version_id, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();
  if (shareError) {
    console.error("[share] token lookup failed", shareError);
    return <Failure reason="server" />;
  }
  if (!shareRow) return <Failure reason="invalid" />;

  const share = shareRow as ShareTokenRow;
  if (share.revoked_at) return <Failure reason="revoked" />;
  // Per-request Date.now() in a Server Component — deterministic for
  // this request. react-hooks/purity aims at client components.
  // eslint-disable-next-line react-hooks/purity
  if (new Date(share.expires_at).getTime() < Date.now()) {
    return <Failure reason="expired" />;
  }

  const { data: assetRaw } = await admin
    .from("assets")
    .select(
      "id, name, type, deadline, current_version_id, projects(id, name)",
    )
    .eq("id", share.asset_id)
    .maybeSingle();
  if (!assetRaw) return <Failure reason="invalid" />;
  const asset = assetRaw as unknown as AssetRow;

  // If the share was pinned to a specific version, use it. Otherwise follow
  // the asset's current version — the reviewer who minted the link opted in
  // to "always-latest" by not passing a version id.
  const targetVersionId =
    share.asset_version_id ?? asset.current_version_id;
  if (!targetVersionId) return <Failure reason="invalid" />;

  const { data: versionRaw } = await admin
    .from("asset_versions")
    .select(
      "id, version_number, storage_path, external_url, upload_note, uploaded_at",
    )
    .eq("id", targetVersionId)
    .maybeSingle();
  if (!versionRaw) return <Failure reason="invalid" />;
  const version = versionRaw as VersionRow;

  const signed = version.storage_path
    ? await createSignedUrl(admin, version.storage_path)
    : null;
  const previewUrl = signed ?? version.external_url;
  const imageRenderable =
    !!version.storage_path &&
    (asset.type === "image" ||
      asset.type === "design" ||
      asset.type === "wireframe");

  return (
    <div className="cr-surface flex min-h-screen flex-col">
      <header
        className="bg-[var(--cr-card)]"
        style={{ borderBottom: "2px solid var(--cr-ink)" }}
      >
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-3 sm:px-10">
          <Link href="/" aria-label="The Creative Review — home">
            <CreativeReviewLogo fontSize={16} />
          </Link>
          <span
            className="cr-badge"
            style={{ fontSize: 12, padding: "4px 10px" }}
          >
            <span className="cr-badge-dot" />
            View-only
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 py-9 sm:px-10 sm:py-10">
        <div className="mb-8">
          <p className="cr-eyebrow mb-2">
            {asset.projects?.name ?? "—"} · v{version.version_number}
          </p>
          <h1
            className="cr-display"
            style={{
              fontFamily: "var(--font-display), serif",
              fontWeight: 800,
              fontSize: 44,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            {asset.name}
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: "var(--cr-muted)" }}>
            Shared preview. No decisions or comments from this view.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
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
                <span className="text-[14px] font-semibold">{asset.name}</span>
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
              <div
                className="py-16 text-center text-[14px]"
                style={{ color: "var(--cr-muted)" }}
              >
                No preview available.
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
              <div className="flex flex-col gap-2 text-[14px]">
                <MetaRow label="Type" value={asset.type} />
                <MetaRow
                  label="Version"
                  value={`v${version.version_number}`}
                />
                <MetaRow
                  label="Uploaded"
                  value={new Date(version.uploaded_at).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                />
                {asset.deadline ? (
                  <MetaRow
                    label="Deadline"
                    value={new Date(asset.deadline).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  />
                ) : null}
              </div>
            </div>

            <p className="text-[13px]" style={{ color: "var(--cr-muted)" }}>
              This link is view-only. Decisions and feedback can only be
              submitted by the invited reviewer.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: "var(--cr-muted)" }}>{label}</span>
      <span style={{ color: "var(--cr-ink)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Failure({
  reason,
}: {
  reason: "invalid" | "expired" | "revoked" | "server";
}) {
  const copy =
    reason === "expired"
      ? {
          title: "This share link has expired.",
          body: "Share links stay live for 30 days. Ask the person who sent it to generate a fresh one from their review.",
        }
      : reason === "revoked"
        ? {
            title: "This share link was revoked.",
            body: "The reviewer who shared this asset turned off the link. Get in touch with them if you still need access.",
          }
        : reason === "invalid"
          ? {
              title: "Link not found.",
              body: "The URL looks malformed or points at an asset that no longer exists.",
            }
          : {
              title: "Something went wrong.",
              body: "We couldn't load the asset just now. Try the link again in a minute.",
            };

  return (
    <div className="cr-surface flex min-h-screen flex-col">
      <header
        className="bg-[var(--cr-card)]"
        style={{ borderBottom: "2px solid var(--cr-ink)" }}
      >
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-3 sm:px-10">
          <Link href="/" aria-label="The Creative Review — home">
            <CreativeReviewLogo fontSize={16} />
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16 sm:px-10">
        <p className="cr-eyebrow mb-4">Share link</p>
        <h1
          className="cr-display"
          style={{
            fontFamily: "var(--font-display), serif",
            fontWeight: 800,
            fontSize: 40,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          {copy.title}
        </h1>
        <p
          className="mt-4 text-[17px] leading-[1.55]"
          style={{ color: "var(--cr-ink-2)" }}
        >
          {copy.body}
        </p>
      </main>
    </div>
  );
}
