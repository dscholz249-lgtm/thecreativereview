-- ============================================================================
-- Admin-seat invites
--
-- Workspace owners invite additional admins. Mirrors the 30-day reviewer
-- invite pattern: our own token layer, /admin-invite/[token] redemption
-- route, fresh Supabase magic link minted at click time.
--
-- Seat enforcement lives in the inviteAdminAction — counts current
-- admin_profiles for the workspace PLUS unaccepted, unexpired rows in
-- this table against PLAN_LIMITS[plan].adminSeats. Pending invites
-- reserve a seat.
--
-- Schema decision carried forward from milestone 1: admin_profiles keeps
-- user_id as primary key, so one auth user belongs to at most one
-- workspace. The redemption route rejects invitees who already have an
-- admin_profile elsewhere with a clear message.
-- ============================================================================

create table public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email citext not null,
  role public.admin_role not null default 'member',
  invite_token text not null unique,
  invite_expires_at timestamptz not null,
  invited_by_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  -- Unique per (workspace, email) so a re-invite refreshes the token
  -- and extends the window via upsert, not duplicate rows.
  unique (workspace_id, email)
);
create index admin_invites_workspace_id_idx on public.admin_invites(workspace_id);
create index admin_invites_token_idx on public.admin_invites(invite_token);
create index admin_invites_pending_idx
  on public.admin_invites(workspace_id)
  where accepted_at is null;

alter table public.admin_invites enable row level security;

-- Admins can see and manage invites for their own workspace.
create policy "admin_invites: admin select in own workspace"
  on public.admin_invites for select
  using (workspace_id = public.current_admin_workspace_id());

create policy "admin_invites: admin insert in own workspace"
  on public.admin_invites for insert
  with check (workspace_id = public.current_admin_workspace_id());

create policy "admin_invites: admin update in own workspace"
  on public.admin_invites for update
  using (workspace_id = public.current_admin_workspace_id())
  with check (workspace_id = public.current_admin_workspace_id());

create policy "admin_invites: admin delete in own workspace"
  on public.admin_invites for delete
  using (workspace_id = public.current_admin_workspace_id());

-- Service role handles /admin-invite/[token] redemption (no authenticated
-- session at click time). No policies needed for service-role access.
