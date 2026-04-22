import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createSignedUrl } from "@/lib/supabase/storage";
import { ArrowRight } from "@/components/cr-icons";
import type { AssetStatus } from "@/lib/database.types";

type Tab = "pending" | "approved" | "changes_requested";
const TAB_STATUSES: Record<Tab, AssetStatus[]> = {
  pending: ["pending", "revision_submitted"],
  approved: ["approved"],
  changes_requested: ["rejected"],
};

export default async function MyReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab: Tab = (params.tab as Tab) ?? "pending";

  const supabase = await createClient();

  const [pendingCount, approvedCount, changesCount, assetsQ] = await Promise.all([
    supabase
      .from("assets")
      .select("*", { count: "exact", head: true })
      .in("status", TAB_STATUSES.pending)
      .eq("archived", false),
    supabase
      .from("assets")
      .select("*", { count: "exact", head: true })
      .in("status", TAB_STATUSES.approved)
      .eq("archived", false),
    supabase
      .from("assets")
      .select("*", { count: "exact", head: true })
      .in("status", TAB_STATUSES.changes_requested)
      .eq("archived", false),
    supabase
      .from("assets")
      .select(
        "id, name, type, deadline, status, projects(name), asset_versions!assets_current_version_id_fkey(id, storage_path)",
      )
      .in("status", TAB_STATUSES[tab])
      .eq("archived", false)
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(50),
  ]);

  const assets = (assetsQ.data ?? []) as Array<{
    id: string;
    name: string;
    type: string;
    deadline: string | null;
    status: AssetStatus;
    projects: { name: string } | null;
    asset_versions: { id: string; storage_path: string | null } | null;
  }>;

  // Generate signed URLs for thumbnails serially (signed URL creation is
  // cheap; keep it simple). If this ever becomes hot, batch with
  // createSignedUrls.
  const thumbUrls = new Map<string, string>();
  for (const a of assets) {
    const v = a.asset_versions;
    if (v?.storage_path) {
      const url = await createSignedUrl(supabase, v.storage_path);
      if (url) thumbUrls.set(a.id, url);
    }
  }

  return (
    <div className="max-w-[900px]">
      <h1
        className="cr-display"
        style={{
          fontFamily: "var(--font-display), serif",
          fontWeight: 800,
          fontSize: 44,
          letterSpacing: "-0.02em",
        }}
      >
        My reviews
      </h1>
      <p
        className="mt-2 text-[16px]"
        style={{ color: "var(--cr-muted)" }}
      >
        {pendingCount.count ?? 0} item{(pendingCount.count ?? 0) === 1 ? "" : "s"}{" "}
        waiting on your decision.
      </p>

      <nav
        className="mt-7 mb-5 flex items-center gap-1"
        style={{ borderBottom: "1px solid var(--cr-line)" }}
      >
        <TabLink tab="pending" active={tab} count={pendingCount.count ?? 0} label="Pending" />
        <TabLink tab="approved" active={tab} count={approvedCount.count ?? 0} label="Approved" />
        <TabLink
          tab="changes_requested"
          active={tab}
          count={changesCount.count ?? 0}
          label="Changes requested"
        />
      </nav>

      {assets.length === 0 ? (
        <div className="cr-card flex flex-col items-center py-14 text-center">
          <p className="text-[15px]" style={{ color: "var(--cr-muted)" }}>
            Nothing here yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {assets.map((a) => (
            <div key={a.id} className="cr-card flex items-center gap-5 p-5">
              <div
                className="flex size-[72px] shrink-0 items-center justify-center overflow-hidden text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{
                  background: "var(--cr-paper-2)",
                  border: "1px dashed var(--cr-line-strong)",
                  borderRadius: "var(--cr-radius)",
                  color: "var(--cr-muted)",
                }}
              >
                {thumbUrls.get(a.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbUrls.get(a.id)!}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{labelFor(a.type)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="truncate"
                  style={{
                    fontFamily: "var(--font-display), serif",
                    fontWeight: 700,
                    fontSize: 20,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {a.name}
                </div>
                <div
                  className="mt-0.5 truncate text-[14px]"
                  style={{ color: "var(--cr-muted)" }}
                >
                  {a.projects?.name ?? "—"} · {a.type}
                </div>
              </div>
              <DeadlineLabel iso={a.deadline} />
              <Link
                href={`/review/assets/${a.id}`}
                className="cr-btn cr-btn-sm cr-btn-primary"
              >
                {tab === "pending" ? "Review" : "View"} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabLink({
  tab,
  active,
  count,
  label,
}: {
  tab: Tab;
  active: Tab;
  count: number;
  label: string;
}) {
  const isActive = tab === active;
  return (
    <Link
      href={`/review/my-reviews?tab=${tab}`}
      className="px-4 py-3 text-[15px] font-semibold transition-colors"
      style={{
        color: isActive ? "var(--cr-ink)" : "var(--cr-muted)",
        borderBottom: isActive
          ? "3px solid var(--cr-ink)"
          : "3px solid transparent",
        marginBottom: -1,
      }}
    >
      {label}{" "}
      <span
        className="ml-1 inline-block rounded-md px-2 py-0.5 text-[13px] font-bold"
        style={{
          background: isActive ? "var(--cr-accent-green)" : "var(--cr-paper-2)",
          color: isActive ? "var(--cr-accent-green-ink)" : "var(--cr-muted)",
        }}
      >
        {count}
      </span>
    </Link>
  );
}

function DeadlineLabel({ iso }: { iso: string | null }) {
  if (!iso) {
    return (
      <span className="text-[14px]" style={{ color: "var(--cr-muted)" }}>
        No deadline
      </span>
    );
  }
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const due = new Date(`${iso}T23:59:59`).getTime();
  const diffDays = Math.ceil((due - now) / 86_400_000);
  const urgent = diffDays <= 2;
  const text =
    diffDays < 0
      ? `${Math.abs(diffDays)}d overdue`
      : diffDays === 0
        ? "Due today"
        : diffDays === 1
          ? "Due tomorrow"
          : `Due in ${diffDays}d`;

  return (
    <span
      className="text-[14px]"
      style={{
        color: urgent ? "var(--cr-destructive-ink)" : "var(--cr-muted)",
        fontWeight: urgent ? 700 : 500,
      }}
    >
      {text}
    </span>
  );
}

function labelFor(type: string): string {
  switch (type) {
    case "image":
      return "IMG";
    case "document":
      return "PDF";
    case "wireframe":
      return "WIRE";
    case "design":
      return "DSN";
    default:
      return type.slice(0, 3).toUpperCase();
  }
}
