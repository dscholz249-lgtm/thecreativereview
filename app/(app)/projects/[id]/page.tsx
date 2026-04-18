import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeading, LinkButton } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description, status, deadline, client_id, clients(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, type, status, deadline, archived")
    .eq("project_id", id)
    .eq("archived", false)
    .order("created_at", { ascending: false });

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
          <LinkButton href={`/projects/${id}/assets/new`}>New asset</LinkButton>
        }
      />

      <div className="mb-6 flex items-center gap-3 text-xs text-neutral-600">
        <Badge variant="secondary">{project.status}</Badge>
        {project.deadline ? <span>Deadline {project.deadline}</span> : null}
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Assets
      </h2>

      {!assets || assets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-neutral-600">
            No assets yet.{" "}
            <Link
              href={`/projects/${id}/assets/new`}
              className="font-medium underline"
            >
              Upload the first one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {assets.map((a) => (
            <Link key={a.id} href={`/assets/${a.id}`}>
              <Card className="transition-colors hover:border-neutral-400">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-neutral-500">{a.type}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {a.deadline ? (
                      <span className="text-neutral-500">Due {a.deadline}</span>
                    ) : null}
                    <Badge variant={assetStatusVariant(a.status)}>{a.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
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
