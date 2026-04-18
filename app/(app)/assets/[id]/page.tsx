import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createSignedUrl, ASSET_BUCKET } from "@/lib/supabase/storage";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const currentVersion =
    versions.find((v) => v.id === asset.current_version_id) ?? versions[0] ?? null;

  // Signed URL for the current version's preview (if stored). 5-minute TTL.
  const previewSignedUrl = currentVersion?.storage_path
    ? await createSignedUrl(supabase, currentVersion.storage_path)
    : null;
  const previewUrl = previewSignedUrl ?? currentVersion?.external_url ?? null;

  const project = asset.projects as {
    id: string;
    name: string;
    client_id: string;
    clients: { id: string; name: string } | null;
  } | null;
  const client = project?.clients ?? null;

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Preview + version history */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="flex aspect-[4/3] items-center justify-center bg-neutral-100 p-0">
              {previewUrl ? (
                isRenderableImage(asset.type, currentVersion) ? (
                  <Image
                    src={previewUrl}
                    alt={asset.name}
                    fill={false}
                    width={1200}
                    height={900}
                    unoptimized
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Link
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-700 underline"
                  >
                    Open {asset.type} in new tab
                  </Link>
                )
              ) : (
                <span className="text-sm text-neutral-500">No preview available</span>
              )}
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Versions
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {versions.map((v) => (
                <Card
                  key={v.id}
                  className={
                    v.id === asset.current_version_id
                      ? "border-blue-600 bg-blue-50"
                      : ""
                  }
                >
                  <CardContent className="py-3">
                    <p className="text-sm font-medium">
                      v{v.version_number}
                      {v.id === asset.current_version_id ? " · current" : ""}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {new Date(v.uploaded_at).toLocaleDateString()}
                      {" · "}
                      {v.storage_path ? "file" : "external link"}
                    </p>
                    {v.upload_note ? (
                      <p className="mt-2 text-xs italic text-neutral-700 line-clamp-2">
                        “{v.upload_note}”
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail: status + activity */}
        <aside className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={assetStatusVariant(asset.status)}>
              {labelFor(asset.status)}
            </Badge>
            {asset.deadline ? (
              <span className="text-xs text-neutral-600">Deadline {asset.deadline}</span>
            ) : null}
          </div>

          {currentVersion?.upload_note ? (
            <Card>
              <CardContent className="py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Note from uploader
                </p>
                <p className="mt-2 text-sm text-neutral-800">
                  {currentVersion.upload_note}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Review activity
            </h2>
            <Card>
              <CardContent className="py-8 text-center text-sm text-neutral-500">
                No activity yet. Once reviewers decide, their feedback shows here.
              </CardContent>
            </Card>
          </div>

          <Separator />

          <Button variant="outline" size="sm" disabled className="w-full">
            Send reminder to reviewers
          </Button>
          <p className="text-xs text-neutral-500">Reminders ship in milestone 4.</p>
        </aside>
      </div>
    </>
  );
}

function isRenderableImage(
  type: string,
  version: Version | null,
): boolean {
  if (!version?.storage_path) return false;
  return type === "image" || type === "design" || type === "wireframe";
}

function assetStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "approved":
      return "default";
    case "rejected":
      return "destructive";
    case "revision_submitted":
      return "secondary";
    default:
      return "outline";
  }
}

function labelFor(status: string): string {
  switch (status) {
    case "pending":
      return "Pending review";
    case "revision_submitted":
      return "Revision submitted";
    case "approved":
      return "Approved";
    case "rejected":
      return "Changes requested";
    default:
      return status;
  }
}

// Avoid unused-import warning on Link when previewUrl is null.
void Link;
// Next/Image optimizer config note: unoptimized lets us use signed URLs
// without an allowlist. See next.config.ts for the remotePatterns when we
// enable the optimizer in production.
void ASSET_BUCKET;
