import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeading, LinkButton } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ClientsIndexPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, primary_email, archived, projects(count)")
    .order("created_at", { ascending: false });

  const visible = (clients ?? []).filter((c) => !c.archived);

  return (
    <>
      <PageHeading
        title="Clients"
        description="Everyone you review work with. Projects and assets nest under each client."
        actions={<LinkButton href="/clients/new">New client</LinkButton>}
      />

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-neutral-600">
            No clients yet. <Link href="/clients/new" className="font-medium underline">Create your first client</Link> to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {visible.map((c) => {
            const projectCount =
              Array.isArray(c.projects) && c.projects[0]
                ? (c.projects[0] as { count: number }).count
                : 0;
            return (
              <Link key={c.id} href={`/clients/${c.id}`}>
                <Card className="transition-colors hover:border-neutral-400">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-neutral-500">{c.primary_email}</p>
                    </div>
                    <Badge variant="secondary">
                      {projectCount} {projectCount === 1 ? "project" : "projects"}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
