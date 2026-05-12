import type { WorkspacePlan } from "@/lib/database.types";

// Pure aggregation for the /superadmin page. Kept out of the page so
// it's trivially testable — the page hands in the raw rows from the
// service-role queries and gets back a sorted list of workspaces with
// their admin emails + counts already wired together.

export type WorkspaceRow = {
  id: string;
  name: string;
  plan: WorkspacePlan;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
};

export type AdminProfileRow = {
  user_id: string;
  workspace_id: string;
  role: "owner" | "member";
  name: string | null;
};

export type ClientRow = {
  workspace_id: string;
  archived: boolean;
};

export type AuthUserRow = {
  id: string;
  email: string | null;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  plan: WorkspacePlan;
  trial_ends_at: string | null;
  has_subscription: boolean;
  created_at: string;
  admin_count: number;
  active_client_count: number;
  admins: Array<{
    user_id: string;
    email: string | null;
    name: string | null;
    role: "owner" | "member";
  }>;
};

export function buildWorkspaceSummaries(input: {
  workspaces: WorkspaceRow[];
  adminProfiles: AdminProfileRow[];
  clients: ClientRow[];
  authUsers: AuthUserRow[];
}): WorkspaceSummary[] {
  const emailByUserId = new Map<string, string | null>();
  for (const u of input.authUsers) emailByUserId.set(u.id, u.email);

  // Group admins by workspace.
  const adminsByWorkspace = new Map<string, AdminProfileRow[]>();
  for (const p of input.adminProfiles) {
    const list = adminsByWorkspace.get(p.workspace_id) ?? [];
    list.push(p);
    adminsByWorkspace.set(p.workspace_id, list);
  }

  // Count non-archived clients per workspace.
  const activeClientsByWorkspace = new Map<string, number>();
  for (const c of input.clients) {
    if (c.archived) continue;
    activeClientsByWorkspace.set(
      c.workspace_id,
      (activeClientsByWorkspace.get(c.workspace_id) ?? 0) + 1,
    );
  }

  const out: WorkspaceSummary[] = input.workspaces.map((ws) => {
    const admins = adminsByWorkspace.get(ws.id) ?? [];
    return {
      id: ws.id,
      name: ws.name,
      plan: ws.plan,
      trial_ends_at: ws.trial_ends_at,
      has_subscription: Boolean(ws.stripe_subscription_id),
      created_at: ws.created_at,
      admin_count: admins.length,
      active_client_count: activeClientsByWorkspace.get(ws.id) ?? 0,
      admins: admins
        .map((a) => ({
          user_id: a.user_id,
          email: emailByUserId.get(a.user_id) ?? null,
          name: a.name,
          role: a.role,
        }))
        // Owners first, then members, then by email so the list is stable.
        .sort((a, b) => {
          if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
          return (a.email ?? "").localeCompare(b.email ?? "");
        }),
    };
  });

  // Newest workspaces first — most interesting signal for an admin sweep.
  out.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return out;
}
