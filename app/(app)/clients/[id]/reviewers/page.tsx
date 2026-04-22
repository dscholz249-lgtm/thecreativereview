import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/page-heading";
import { Avatar, avatarVariantFor } from "@/components/cr-avatar";
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
          <h3
            className="cr-display mb-4"
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            Invited reviewers
          </h3>
          {!reviewers || reviewers.length === 0 ? (
            <div className="cr-card flex flex-col items-center py-14 text-center">
              <p className="text-[15px]" style={{ color: "var(--cr-muted)" }}>
                No reviewers yet. Invite the first one on the right.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reviewers.map((r) => {
                const display = r.name ?? r.email;
                return (
                  <div
                    key={r.id}
                    className="cr-card flex items-center gap-4 p-5"
                  >
                    <Avatar
                      label={display}
                      variant={avatarVariantFor(display)}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate"
                        style={{
                          fontFamily: "var(--font-display), serif",
                          fontWeight: 700,
                          fontSize: 18,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {display}
                      </p>
                      {r.name ? (
                        <p
                          className="truncate text-[13px]"
                          style={{ color: "var(--cr-muted)" }}
                        >
                          {r.email}
                        </p>
                      ) : null}
                      <p
                        className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em]"
                        style={{
                          color: r.auth_user_id
                            ? "var(--cr-constructive)"
                            : "var(--cr-muted)",
                        }}
                      >
                        {r.auth_user_id ? "Active" : "Invite pending"}
                      </p>
                    </div>
                    <form action={removeReviewerAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="client_id" value={client.id} />
                      <button
                        type="submit"
                        className="cr-btn cr-btn-sm cr-btn-ghost"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside>
          <h3
            className="cr-display mb-4"
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            Invite a new reviewer
          </h3>
          <InviteReviewerForm clientId={client.id} />
        </aside>
      </div>
    </>
  );
}
