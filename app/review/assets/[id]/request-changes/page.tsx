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
    <>
      <header className="mb-5">
        <Link
          href={`/assets/${asset.id}`}
          className="text-xs text-neutral-500 hover:text-neutral-800"
        >
          ← Back to review
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Request changes · {asset.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {project?.name ?? "—"} · v{version.version_number}
        </p>
      </header>

      {version.upload_note ? (
        <div className="mb-5 rounded-md border border-neutral-200 bg-white p-3 text-sm text-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
            Note from the team
          </p>
          {version.upload_note}
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
    </>
  );
}
