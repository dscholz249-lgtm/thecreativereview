import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewProjectForm } from "./new-project-form";
import { PageHeading } from "@/components/page-heading";

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!client) notFound();

  return (
    <div className="max-w-xl">
      <PageHeading
        title="New project"
        breadcrumbs={[
          { href: "/clients", label: "Clients" },
          { href: `/clients/${client.id}`, label: client.name },
          { label: "New project" },
        ]}
      />
      <NewProjectForm clientId={client.id} />
    </div>
  );
}
