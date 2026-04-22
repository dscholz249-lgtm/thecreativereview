import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSignedUrl } from "@/lib/supabase/storage";
import { RequestChangesForm } from "./request-changes-form";

export default async function RequestChangesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: asset } = await supabase
    .from("assets")
    .select(
      "id, name, type, status, current_version_id, projects(id, name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!asset) notFound();

  if (!asset.current_version_id || asset.status !== "pending") {
    // Can only request changes on a pending asset.
    redirect(`/review/assets/${asset.id}`);
  }

  const { data: version } = await supabase
    .from("asset_versions")
    .select("id, version_number, storage_path, external_url, upload_note")
    .eq("id", asset.current_version_id)
    .maybeSingle();
  if (!version) notFound();

  const signed = version.storage_path
    ? await createSignedUrl(supabase, version.storage_path)
    : null;
  const previewUrl = signed ?? version.external_url;
  const project = asset.projects as { id: string; name: string } | null;

  const isImageFlow =
    version.storage_path !== null &&
    (asset.type === "image" || asset.type === "design" || asset.type === "wireframe");

  return (
    <div className="mx-auto max-w-[1240px]">
      <Link
        href={`/review/assets/${asset.id}`}
        className="cr-link mb-4 inline-block text-[14px]"
      >
        ← Back to review
      </Link>

      <div className="mb-8">
        <p className="cr-eyebrow mb-2">
          {project?.name ?? "—"} · v{version.version_number}
        </p>
        <h1
          className="cr-display"
          style={{
            fontFamily: "var(--font-display), serif",
            fontWeight: 800,
            fontSize: 44,
            letterSpacing: "-0.02em",
          }}
        >
          Request changes · {asset.name}
        </h1>
      </div>

      {version.upload_note ? (
        <div className="mb-6 cr-card p-5">
          <p className="cr-eyebrow mb-2">Note from the team</p>
          <p className="text-[15px]" style={{ color: "var(--cr-ink)" }}>
            {version.upload_note}
          </p>
        </div>
      ) : null}

      <RequestChangesForm
        assetId={asset.id}
        versionId={version.id}
        imageUrl={isImageFlow ? previewUrl : null}
        nonImageFallbackUrl={!isImageFlow ? previewUrl : null}
        assetName={asset.name}
        flow={isImageFlow ? "image" : "non_image"}
      />
    </div>
  );
}
