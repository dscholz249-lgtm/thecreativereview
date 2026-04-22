import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/page-heading";
import { NewAssetForm } from "./new-asset-form";

export default async function NewAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, client_id, clients(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const client = project.clients as { id: string; name: string } | null;

  return (
    <div className="max-w-[720px]">
      <PageHeading
        title="New asset"
        breadcrumbs={[
          { href: "/clients", label: "Clients" },
          client ? { href: `/clients/${client.id}`, label: client.name } : { label: "Client" },
          { href: `/projects/${project.id}`, label: project.name },
          { label: "New asset" },
        ]}
      />
      <NewAssetForm projectId={project.id} cancelHref={`/projects/${project.id}`} />
    </div>
  );
}
