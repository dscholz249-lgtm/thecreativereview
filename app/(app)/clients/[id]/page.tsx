import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeading, LinkButton } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, primary_email")
    .eq("id", id)
    .maybeSingle();
  if (!client) notFound();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, deadline, description")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeading
        title={client.name}
        description={client.primary_email}
        breadcrumbs={[{ href: "/clients", label: "Clients" }, { label: client.name }]}
        actions={
          <>
            <LinkButton href={`/clients/${id}/reviewers`} variant="outline">
              Manage reviewers
            </LinkButton>
            <LinkButton href={`/clients/${id}/projects/new`}>New project</LinkButton>
          </>
        }
      />

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Projects
      </h2>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-neutral-600">
            No projects yet for {client.name}.{" "}
            <Link href={`/clients/${id}/projects/new`} className="font-medium underline">
              Create one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="transition-colors hover:border-neutral-400">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    {p.description ? (
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {p.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    {p.deadline ? <span>Due {p.deadline}</span> : null}
                    <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
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

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "in_review":
      return "secondary";
    case "archived":
      return "outline";
    default:
      return "outline";
  }
}
