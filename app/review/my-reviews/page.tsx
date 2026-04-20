import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createSignedUrl } from "@/lib/supabase/storage";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">My reviews</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {pendingCount.count ?? 0} item{(pendingCount.count ?? 0) === 1 ? "" : "s"} waiting on your decision
        </p>
      </header>

      <nav className="mb-5 flex items-center gap-1">
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
        <Card>
          <CardContent className="py-12 text-center text-sm text-neutral-600">
            Nothing here yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {assets.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md bg-neutral-100 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
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
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {a.projects?.name ?? "—"} · {a.type}
                  </p>
                </div>
                <div className="text-right text-xs">
                  {a.deadline ? (
                    <>
                      <p className="font-medium text-neutral-700">{deadlineLabel(a.deadline)}</p>
                      <p className="text-neutral-400">{a.deadline}</p>
                    </>
                  ) : (
                    <p className="text-neutral-400">No deadline</p>
                  )}
                </div>
                <Link
                  href={`/review/assets/${a.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  {tab === "pending" ? "Review" : "View"}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
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
      href={`/my-reviews?tab=${tab}`}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-neutral-600 hover:text-neutral-900",
      )}
    >
      {label} ({count})
    </Link>
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

function deadlineLabel(deadline: string): string {
  const now = new Date();
  const due = new Date(`${deadline}T23:59:59`);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays}d`;
}
