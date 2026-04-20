import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createSignedUrl } from "@/lib/supabase/storage";
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

  // Activity for the current version — decisions + annotations. Display
  // numbers on annotations are derived from creation order, per PRD 7.9.
  const [{ data: decisionsData }, { data: annotationsData }] = currentVersion
    ? await Promise.all([
        supabase
          .from("decisions")
          .select(
            "id, verdict, feedback_text, created_at, reviewer_id, client_reviewers(email, name)",
          )
          .eq("asset_version_id", currentVersion.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("annotations")
          .select(
            "id, x_pct, y_pct, comment_text, created_at, reviewer_id, client_reviewers(email, name)",
          )
          .eq("asset_version_id", currentVersion.id)
          .order("created_at", { ascending: true }),
      ])
    : [{ data: [] as Decision[] }, { data: [] as Annotation[] }];

  const decisions = (decisionsData ?? []) as Decision[];
  const annotations = (annotationsData ?? []) as Annotation[];
  const numberedAnnotations = annotations.map((a, i) => ({ ...a, number: i + 1 }));

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
  const imageRenderable = isRenderableImage(asset.type, currentVersion);

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
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="relative flex aspect-[4/3] items-center justify-center bg-neutral-100 p-0">
              {previewUrl && imageRenderable ? (
                <>
                  <Image
                    src={previewUrl}
                    alt={asset.name}
                    fill={false}
                    width={1200}
                    height={900}
                    unoptimized
                    className="h-full w-full object-contain"
                  />
                  {numberedAnnotations.map((a) => (
                    <span
                      key={a.id}
                      style={{
                        left: `${a.x_pct * 100}%`,
                        top: `${a.y_pct * 100}%`,
                      }}
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-700 text-xs font-semibold text-white shadow"
                      aria-label={`Pin ${a.number}`}
                    >
                      {a.number}
                    </span>
                  ))}
                </>
              ) : previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-700 underline"
                >
                  Open {asset.type} in new tab
                </a>
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
            {decisions.length === 0 && numberedAnnotations.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-neutral-500">
                  No activity yet. Once reviewers decide, their feedback shows here.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {decisions.map((d) => (
                  <DecisionCard
                    key={d.id}
                    decision={d}
                    versionNumber={currentVersion?.version_number ?? null}
                  />
                ))}
                {numberedAnnotations.map((a) => (
                  <AnnotationCard
                    key={a.id}
                    annotation={a}
                    versionNumber={currentVersion?.version_number ?? null}
                  />
                ))}
              </div>
            )}
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

function DecisionCard({
  decision,
  versionNumber,
}: {
  decision: Decision;
  versionNumber: number | null;
}) {
  const reviewerLabel = reviewerDisplay(decision.client_reviewers);
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar label={reviewerLabel} />
            <span className="text-sm font-medium">{reviewerLabel}</span>
            {versionNumber !== null ? (
              <span className="text-xs text-neutral-400">on v{versionNumber}</span>
            ) : null}
          </div>
          <Badge variant={decision.verdict === "approve" ? "default" : "destructive"}>
            {decision.verdict === "approve" ? "Approved" : "Changes requested"}
          </Badge>
        </div>
        {decision.feedback_text ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
            {decision.feedback_text}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-neutral-400">
          {new Date(decision.created_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar label={reviewerLabel} />
            <span className="text-sm font-medium">{reviewerLabel}</span>
            {versionNumber !== null ? (
              <span className="text-xs text-neutral-400">on v{versionNumber}</span>
            ) : null}
          </div>
          <span className="flex h-6 items-center gap-1 rounded-md bg-blue-50 px-2 text-xs font-medium text-blue-700">
            Pin {annotation.number}
          </span>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
          {annotation.comment_text}
        </p>
        <p className="mt-2 text-xs text-neutral-400">
          {new Date(annotation.created_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

function Avatar({ label }: { label: string }) {
  const initials = label
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
      {initials}
    </span>
  );
}

function reviewerDisplay(
  reviewer: { email: string; name: string | null } | null,
): string {
  if (!reviewer) return "Reviewer";
  return reviewer.name?.trim() || reviewer.email;
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
