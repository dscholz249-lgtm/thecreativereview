import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/admin-client";
import { PageHeading } from "@/components/page-heading";
import { Avatar, avatarVariantFor } from "@/components/cr-avatar";
import { PLAN_LIMITS, formatLimit } from "@/lib/plans";
import { PLAN_LABELS } from "@/lib/stripe/config";
import { InviteAdminForm } from "./invite-admin-form";
import { revokeAdminInviteAction, removeAdminAction } from "./actions";

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("workspace_id, workspaces(name, plan)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) redirect("/login");

  const workspace = profile.workspaces as unknown as {
    name: string;
    plan: keyof typeof PLAN_LIMITS;
  } | null;
  const plan = workspace?.plan ?? "oss";
  const seatCap = PLAN_LIMITS[plan].adminSeats;

  // RLS scopes both queries to the caller's workspace. We pull the
  // pending-invite list alongside so the page renders in one round-trip.
  const [{ data: admins }, { data: invites }] = await Promise.all([
    supabase
      .from("admin_profiles")
      .select("user_id, name, role, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("admin_invites")
      .select("id, email, role, invite_expires_at, accepted_at, created_at")
      .is("accepted_at", null)
      .gt("invite_expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  // auth.users lives outside the public schema. We hit it through the
  // service-role client (admin-only page, so this is appropriate) to
  // decorate each admin row with its email address.
  const admin = createAdminClient();
  const { data: userList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emailByUserId = new Map<string, string>();
  for (const u of userList?.users ?? []) {
    if (u.email) emailByUserId.set(u.id, u.email);
  }

  const activeCount = admins?.length ?? 0;
  const pendingCount = invites?.length ?? 0;
  const seatsInUse = activeCount + pendingCount;
  const atCap = Number.isFinite(seatCap) && seatsInUse >= seatCap;

  const ownerCount = (admins ?? []).filter((a) => a.role === "owner").length;

  return (
    <>
      <PageHeading
        title="Members"
        description={`Who can administer ${workspace?.name ?? "your workspace"}.`}
        breadcrumbs={[{ label: "Members" }]}
      />

      <SeatCounter
        inUse={seatsInUse}
        cap={seatCap}
        planLabel={PLAN_LABELS[plan]}
        atCap={atCap}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-8">
          <section>
            <h3
              className="cr-display mb-4"
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              Active admins
            </h3>
            <div className="flex flex-col gap-3">
              {(admins ?? []).map((a) => {
                const email = emailByUserId.get(a.user_id) ?? "—";
                const display = a.name ?? email;
                const isSelf = a.user_id === user.id;
                const isLastOwner = a.role === "owner" && ownerCount <= 1;
                return (
                  <div
                    key={a.user_id}
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
                        {isSelf ? (
                          <span
                            className="ml-2 text-[11px] font-bold uppercase tracking-[0.08em]"
                            style={{ color: "var(--cr-muted)" }}
                          >
                            You
                          </span>
                        ) : null}
                      </p>
                      {a.name ? (
                        <p
                          className="truncate text-[13px]"
                          style={{ color: "var(--cr-muted)" }}
                        >
                          {email}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className="cr-badge"
                      style={{
                        background:
                          a.role === "owner"
                            ? "var(--cr-ink)"
                            : "var(--cr-card)",
                        color: a.role === "owner" ? "white" : "var(--cr-ink)",
                        borderColor: "var(--cr-ink)",
                      }}
                    >
                      {a.role === "owner" ? "Owner" : "Admin"}
                    </span>
                    {isSelf || isLastOwner ? (
                      <span
                        className="text-[12px]"
                        style={{ color: "var(--cr-muted)" }}
                      >
                        {isSelf ? "Can't remove yourself" : "Only owner"}
                      </span>
                    ) : (
                      <form action={removeAdminAction}>
                        <input type="hidden" name="user_id" value={a.user_id} />
                        <button
                          type="submit"
                          className="cr-btn cr-btn-sm cr-btn-ghost"
                        >
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3
              className="cr-display mb-4"
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              Pending invites
            </h3>
            {pendingCount === 0 ? (
              <div className="cr-card flex flex-col items-center py-10 text-center">
                <p className="text-[15px]" style={{ color: "var(--cr-muted)" }}>
                  No pending invites. New ones show up here until they&apos;re
                  accepted or they expire.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {(invites ?? []).map((inv) => (
                  <div
                    key={inv.id}
                    className="cr-card flex items-center gap-4 p-5"
                  >
                    <Avatar
                      label={inv.email}
                      variant={avatarVariantFor(inv.email)}
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
                        {inv.email}
                      </p>
                      <p
                        className="mt-1 text-[12px]"
                        style={{ color: "var(--cr-muted)" }}
                      >
                        Link expires{" "}
                        {new Date(inv.invite_expires_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                    <span
                      className="cr-badge"
                      style={{
                        background: "var(--cr-card)",
                        color: "var(--cr-muted)",
                      }}
                    >
                      Pending
                    </span>
                    <form action={revokeAdminInviteAction}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button
                        type="submit"
                        className="cr-btn cr-btn-sm cr-btn-ghost"
                      >
                        Revoke
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>
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
            Invite a new admin
          </h3>
          {atCap ? (
            <div
              className="cr-card p-5 text-[14px]"
              style={{ color: "var(--cr-destructive-ink)" }}
            >
              <p className="mb-2 font-semibold">
                You&apos;re at your {PLAN_LABELS[plan]} plan&apos;s seat limit.
              </p>
              <p style={{ color: "var(--cr-muted)" }}>
                Remove an admin, revoke a pending invite, or{" "}
                <Link href="/billing" className="cr-link">
                  upgrade from Billing
                </Link>{" "}
                to add more.
              </p>
            </div>
          ) : (
            <InviteAdminForm atCap={false} />
          )}
        </aside>
      </div>
    </>
  );
}

// Mirrors the UsageCounter on the clients list. Hidden when the plan has
// no finite seat cap (OSS / Agency beyond their max don't fit this shape,
// but Agency's 10 still renders — we only skip it for truly unlimited).
function SeatCounter({
  inUse,
  cap,
  planLabel,
  atCap,
}: {
  inUse: number;
  cap: number;
  planLabel: string;
  atCap: boolean;
}) {
  if (!Number.isFinite(cap)) return null;
  const near = !atCap && inUse >= cap - 1;
  return (
    <div
      className="mb-5 flex flex-wrap items-center gap-3 text-[14px]"
      style={{
        color: atCap ? "var(--cr-destructive-ink)" : "var(--cr-muted)",
      }}
    >
      <span style={{ fontWeight: atCap || near ? 700 : 500 }}>
        {inUse} of {formatLimit(cap)} seats
      </span>
      <span style={{ color: "var(--cr-line-strong)" }}>·</span>
      <span>{planLabel} plan</span>
      <span style={{ color: "var(--cr-line-strong)" }}>·</span>
      <span style={{ color: "var(--cr-muted)" }}>
        Counts active admins + pending invites
      </span>
      {atCap ? (
        <>
          <span style={{ color: "var(--cr-line-strong)" }}>·</span>
          <Link href="/billing" className="cr-link">
            Upgrade for more
          </Link>
        </>
      ) : null}
    </div>
  );
}
