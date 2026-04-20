import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSignedUrl } from "@/lib/supabase/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  return (
    <>
      <header className="mb-5">
        <Link
          href="/review/my-reviews"
          className="text-xs text-neutral-500 hover:text-neutral-800"
        >
          ← My reviews
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{asset.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {project?.name ?? "—"} · v{version.version_number}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <Card className="overflow-hidden">
            <CardContent className="flex aspect-[4/3] items-center justify-center bg-neutral-100 p-0">
              {previewUrl ? (
                isImagePreview(asset.type, version.storage_path) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={asset.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-700 underline"
                  >
                    Open {asset.type} in a new tab
                  </a>
                )
              ) : (
                <span className="text-sm text-neutral-500">No preview available</span>
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="flex flex-col gap-4">
          {version.upload_note ? (
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Note from the team
                </p>
                <p className="mt-2 text-sm text-neutral-800">{version.upload_note}</p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="py-4 text-xs text-neutral-600">
              <p>
                <span className="font-medium text-neutral-800">Type:</span>{" "}
                {asset.type}
              </p>
              <p className="mt-1">
                <span className="font-medium text-neutral-800">Version:</span> v
                {version.version_number}
              </p>
              <p className="mt-1">
                <span className="font-medium text-neutral-800">Uploaded:</span>{" "}
                {new Date(version.uploaded_at).toLocaleString()}
              </p>
              {asset.deadline ? (
                <p className="mt-1">
                  <span className="font-medium text-neutral-800">Deadline:</span>{" "}
                  {asset.deadline}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {isDecided ? (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={asset.status === "approved" ? "default" : "destructive"}
                  >
                    {asset.status === "approved" ? "Approved" : "Changes requested"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-neutral-600">
                  This version has a decision. New versions from the team will
                  show up on your inbox.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              <ApproveButton assetId={asset.id} versionId={version.id} />
              <Link
                href={`/review/assets/${asset.id}/request-changes`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Request changes
              </Link>
              <p className="text-xs text-neutral-500 text-center">
                Approving means no changes are needed. If you want to leave
                notes, choose &ldquo;Request changes&rdquo; instead.
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-neutral-600">
        {children}
      </CardContent>
    </Card>
  );
}

function isImagePreview(
  type: string,
  storagePath: string | null,
): boolean {
  if (!storagePath) return false;
  return type === "image" || type === "design" || type === "wireframe";
}
