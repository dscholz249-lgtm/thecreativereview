import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InviteReviewerForm } from "./invite-reviewer-form";
import { removeReviewerAction } from "./actions";

export default async function ReviewersPage({
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

  const { data: reviewers } = await supabase
    .from("client_reviewers")
    .select("id, email, name, auth_user_id, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeading
        title="Reviewers"
        description={`Clients who can review assets for ${client.name}.`}
        breadcrumbs={[
          { href: "/clients", label: "Clients" },
          { href: `/clients/${client.id}`, label: client.name },
          { label: "Reviewers" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Invited reviewers
          </h2>
          {!reviewers || reviewers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-neutral-600">
                No reviewers yet. Invite the first one on the right.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {reviewers.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {r.name ?? r.email}
                      </p>
                      {r.name ? (
                        <p className="text-xs text-neutral-500">{r.email}</p>
                      ) : null}
                      <p className="text-[11px] uppercase tracking-wide text-neutral-400 mt-1">
                        {r.auth_user_id ? "Active" : "Invite pending"}
                      </p>
                    </div>
                    <form action={removeReviewerAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="client_id" value={client.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Remove
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <aside>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Invite a new reviewer
          </h2>
          <InviteReviewerForm clientId={client.id} />
        </aside>
      </div>
    </>
  );
}
