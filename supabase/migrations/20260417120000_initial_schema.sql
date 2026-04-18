-- ============================================================================
-- Creative Review — initial schema
--
-- Mirrors PRD section 8 exactly. Adds:
--   * RLS policies on every table (primary tenancy enforcement)
--   * Decision invariants (CHECK + triggers) — see "INVARIANTS" section
--   * Storage bucket + policies for uploaded asset files
--
-- Policy: never bypass RLS in application code. The only callers that may use
-- the service_role key are: seed scripts, the Railway cron worker, and the
-- Stripe webhook handler. Every such caller must be isolated in server/ with
-- a comment explaining why RLS doesn't apply.
-- ============================================================================

create extension if not exists citext;

-- ============================================================================
-- Enums
-- ============================================================================

create type public.workspace_plan as enum ('oss', 'solo', 'studio', 'agency');
create type public.admin_role as enum ('owner', 'member');
create type public.project_status as enum ('draft', 'in_review', 'completed', 'archived');
-- Asset category. `image` = direct image upload. `document` = PDF. `design` /
-- `wireframe` may be either an uploaded image or an external URL; annotation
-- support is gated on storage_path presence at the version level, not on type.
create type public.asset_type as enum ('image', 'document', 'design', 'wireframe');
create type public.asset_status as enum ('pending', 'approved', 'rejected', 'revision_submitted');
create type public.decision_verdict as enum ('approve', 'reject');

-- ============================================================================
-- Tables
-- ============================================================================

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan public.workspace_plan not null default 'oss',
  storage_used_bytes bigint not null default 0,
  admin_seat_count int not null default 1,
  custom_domain text,
  white_label boolean not null default false,
  created_at timestamptz not null default now()
);

-- admin_profiles extends auth.users with workspace + role. No password column:
-- Supabase Auth (auth.users) owns credentials.
create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role public.admin_role not null default 'owner',
  name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);
create index admin_profiles_workspace_id_idx on public.admin_profiles(workspace_id);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  primary_email citext not null,
  logo_url text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_workspace_id_idx on public.clients(workspace_id);

-- A reviewer is keyed by (client_id, email). auth_user_id is populated on first
-- magic-link click, turning an invited reviewer into a real Supabase user.
create table public.client_reviewers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  email citext not null,
  name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  unique (client_id, email)
);
create index client_reviewers_auth_user_id_idx on public.client_reviewers(auth_user_id);
create index client_reviewers_client_id_idx on public.client_reviewers(client_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  description text,
  deadline date,
  status public.project_status not null default 'draft',
  last_reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_client_id_idx on public.projects(client_id);
create index projects_status_idx on public.projects(status);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  type public.asset_type not null,
  current_version_id uuid,
  deadline date,
  status public.asset_status not null default 'pending',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assets_project_id_idx on public.assets(project_id);

create table public.asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  version_number int not null,
  storage_path text,
  external_url text,
  upload_note text,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  unique (asset_id, version_number),
  check (upload_note is null or length(upload_note) <= 500),
  check (
    (storage_path is not null and external_url is null)
    or (storage_path is null and external_url is not null)
  )
);
create index asset_versions_asset_id_idx on public.asset_versions(asset_id);

alter table public.assets
  add constraint assets_current_version_id_fkey
  foreign key (current_version_id) references public.asset_versions(id)
  deferrable initially deferred;

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  asset_version_id uuid not null references public.asset_versions(id) on delete cascade,
  reviewer_id uuid not null references public.client_reviewers(id) on delete restrict,
  verdict public.decision_verdict not null,
  feedback_text text,
  created_at timestamptz not null default now(),
  unique (asset_version_id, reviewer_id),
  -- INVARIANT 1a: approve decisions MUST NOT carry feedback_text.
  -- The zero-annotations half of invariant 1 lives in a trigger (cross-table).
  constraint decisions_approve_has_no_feedback
    check (verdict = 'reject' or feedback_text is null),
  -- Reject with feedback_text must be >= 3 chars; reject with null feedback
  -- relies on at least one annotation (enforced by deferred trigger below).
  constraint decisions_reject_feedback_min_length
    check (verdict = 'approve' or feedback_text is null or length(feedback_text) >= 3)
);
create index decisions_asset_version_id_idx on public.decisions(asset_version_id);
create index decisions_reviewer_id_idx on public.decisions(reviewer_id);

create table public.annotations (
  id uuid primary key default gen_random_uuid(),
  asset_version_id uuid not null references public.asset_versions(id) on delete cascade,
  reviewer_id uuid not null references public.client_reviewers(id) on delete restrict,
  x_pct numeric(6, 4) not null,
  y_pct numeric(6, 4) not null,
  comment_text text not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (x_pct >= 0 and x_pct <= 1),
  check (y_pct >= 0 and y_pct <= 1),
  check (length(comment_text) >= 1)
);
create index annotations_asset_version_id_idx on public.annotations(asset_version_id);
create index annotations_reviewer_id_idx on public.annotations(reviewer_id);
create index annotations_created_at_idx on public.annotations(asset_version_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  recipient_email citext not null,
  payload_json jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_email_idx on public.notifications(recipient_email);
create index notifications_kind_idx on public.notifications(kind);

-- ============================================================================
-- INVARIANTS — trigger-enforced (complement the CHECK constraints above)
--
-- Invariant 1 (product-critical): approve decisions carry no feedback and no
-- annotations. The feedback half is a CHECK; the annotations half is
-- cross-table and lives here.
--
-- Invariant 2: reject decisions must have feedback_text (>= 3 chars) OR at
-- least one annotation by the same reviewer on the same version. Enforced as
-- a DEFERRABLE INITIALLY DEFERRED constraint trigger so the client can insert
-- annotations and the decision row in either order within a transaction.
--
-- Invariant 3 (product rule): annotations are only legal on image-type asset
-- versions that have a storage_path (no PDFs, no external URLs).
--
-- These triggers are the last line of defense. The Server Action also
-- validates via Zod + pre-insert checks, and the type system narrows inputs.
-- ============================================================================

create or replace function public.enforce_approve_has_no_annotations()
returns trigger
language plpgsql
as $$
begin
  if new.verdict = 'approve' then
    if exists (
      select 1 from public.annotations
      where asset_version_id = new.asset_version_id
        and reviewer_id = new.reviewer_id
    ) then
      raise exception 'invariant.approve_with_annotations: approve decisions cannot have annotations (reviewer=%, version=%)',
        new.reviewer_id, new.asset_version_id
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger decisions_enforce_approve_has_no_annotations
  before insert or update on public.decisions
  for each row
  execute function public.enforce_approve_has_no_annotations();

create or replace function public.enforce_annotation_not_after_approve()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.decisions
    where asset_version_id = new.asset_version_id
      and reviewer_id = new.reviewer_id
      and verdict = 'approve'
  ) then
    raise exception 'invariant.annotation_after_approve: cannot annotate after approve decision (reviewer=%, version=%)',
      new.reviewer_id, new.asset_version_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger annotations_enforce_not_after_approve
  before insert on public.annotations
  for each row
  execute function public.enforce_annotation_not_after_approve();

create or replace function public.enforce_reject_has_feedback_or_annotations()
returns trigger
language plpgsql
as $$
begin
  if new.verdict = 'reject' then
    if (new.feedback_text is null or length(trim(new.feedback_text)) < 3)
       and not exists (
         select 1 from public.annotations
         where asset_version_id = new.asset_version_id
           and reviewer_id = new.reviewer_id
       )
    then
      raise exception 'invariant.reject_without_content: reject decisions need feedback (>= 3 chars) or at least one annotation (reviewer=%, version=%)',
        new.reviewer_id, new.asset_version_id
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create constraint trigger decisions_enforce_reject_has_content
  after insert or update on public.decisions
  deferrable initially deferred
  for each row
  execute function public.enforce_reject_has_feedback_or_annotations();

create or replace function public.enforce_annotation_on_image_version()
returns trigger
language plpgsql
as $$
declare
  _asset_type public.asset_type;
  _storage_path text;
begin
  select a.type, av.storage_path
    into _asset_type, _storage_path
    from public.asset_versions av
    join public.assets a on a.id = av.asset_id
    where av.id = new.asset_version_id;

  if _asset_type = 'document' or _storage_path is null then
    raise exception 'invariant.annotation_on_non_image: annotations are only allowed on uploaded image versions (version=%)',
      new.asset_version_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger annotations_enforce_image_only
  before insert on public.annotations
  for each row
  execute function public.enforce_annotation_on_image_version();

-- updated_at triggers ---------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS helper functions (SECURITY DEFINER to bypass RLS on admin_profiles /
-- client_reviewers when resolving the caller's identity).
-- ============================================================================

create or replace function public.current_admin_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from public.admin_profiles where user_id = auth.uid();
$$;

create or replace function public.current_reviewer_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.client_reviewers where auth_user_id = auth.uid();
$$;

create or replace function public.current_reviewer_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.client_reviewers where auth_user_id = auth.uid();
$$;

-- ============================================================================
-- Row-Level Security — enable + policies per table.
--
-- Conventions:
--   * Every table has RLS enabled.
--   * notifications has RLS enabled with no user policies — only service_role
--     (cron worker, Stripe webhook) may access.
--   * Decisions and annotations have SELECT + INSERT policies; no UPDATE or
--     DELETE policies (post-submission immutable, per PRD 7.9).
-- ============================================================================

-- workspaces ------------------------------------------------------------------
alter table public.workspaces enable row level security;

create policy "workspaces: admins select own"
  on public.workspaces for select
  using (id = public.current_admin_workspace_id());

create policy "workspaces: admins update own"
  on public.workspaces for update
  using (id = public.current_admin_workspace_id())
  with check (id = public.current_admin_workspace_id());

-- admin_profiles --------------------------------------------------------------
alter table public.admin_profiles enable row level security;

create policy "admin_profiles: read profiles in own workspace"
  on public.admin_profiles for select
  using (workspace_id = public.current_admin_workspace_id());

create policy "admin_profiles: update own profile"
  on public.admin_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- clients ---------------------------------------------------------------------
alter table public.clients enable row level security;

create policy "clients: admin select in own workspace"
  on public.clients for select
  using (workspace_id = public.current_admin_workspace_id());

create policy "clients: admin insert in own workspace"
  on public.clients for insert
  with check (workspace_id = public.current_admin_workspace_id());

create policy "clients: admin update in own workspace"
  on public.clients for update
  using (workspace_id = public.current_admin_workspace_id())
  with check (workspace_id = public.current_admin_workspace_id());

create policy "clients: admin delete in own workspace"
  on public.clients for delete
  using (workspace_id = public.current_admin_workspace_id());

-- client_reviewers ------------------------------------------------------------
alter table public.client_reviewers enable row level security;

create policy "client_reviewers: admin crud in own workspace"
  on public.client_reviewers for all
  using (
    client_id in (
      select id from public.clients
      where workspace_id = public.current_admin_workspace_id()
    )
  )
  with check (
    client_id in (
      select id from public.clients
      where workspace_id = public.current_admin_workspace_id()
    )
  );

create policy "client_reviewers: reviewer selects own row"
  on public.client_reviewers for select
  using (auth_user_id = auth.uid());

-- projects --------------------------------------------------------------------
alter table public.projects enable row level security;

create policy "projects: admin crud in own workspace"
  on public.projects for all
  using (
    client_id in (
      select id from public.clients
      where workspace_id = public.current_admin_workspace_id()
    )
  )
  with check (
    client_id in (
      select id from public.clients
      where workspace_id = public.current_admin_workspace_id()
    )
  );

create policy "projects: reviewer select for their clients"
  on public.projects for select
  using (client_id in (select public.current_reviewer_client_ids()));

-- assets ----------------------------------------------------------------------
alter table public.assets enable row level security;

create policy "assets: admin crud in own workspace"
  on public.assets for all
  using (
    project_id in (
      select p.id from public.projects p
      join public.clients c on c.id = p.client_id
      where c.workspace_id = public.current_admin_workspace_id()
    )
  )
  with check (
    project_id in (
      select p.id from public.projects p
      join public.clients c on c.id = p.client_id
      where c.workspace_id = public.current_admin_workspace_id()
    )
  );

create policy "assets: reviewer select for their clients"
  on public.assets for select
  using (
    project_id in (
      select p.id from public.projects p
      where p.client_id in (select public.current_reviewer_client_ids())
    )
  );

-- asset_versions --------------------------------------------------------------
alter table public.asset_versions enable row level security;

create policy "asset_versions: admin crud in own workspace"
  on public.asset_versions for all
  using (
    asset_id in (
      select a.id from public.assets a
      join public.projects p on p.id = a.project_id
      join public.clients c on c.id = p.client_id
      where c.workspace_id = public.current_admin_workspace_id()
    )
  )
  with check (
    asset_id in (
      select a.id from public.assets a
      join public.projects p on p.id = a.project_id
      join public.clients c on c.id = p.client_id
      where c.workspace_id = public.current_admin_workspace_id()
    )
  );

create policy "asset_versions: reviewer select for their clients"
  on public.asset_versions for select
  using (
    asset_id in (
      select a.id from public.assets a
      join public.projects p on p.id = a.project_id
      where p.client_id in (select public.current_reviewer_client_ids())
    )
  );

-- decisions -------------------------------------------------------------------
alter table public.decisions enable row level security;

create policy "decisions: admin select in own workspace"
  on public.decisions for select
  using (
    asset_version_id in (
      select av.id from public.asset_versions av
      join public.assets a on a.id = av.asset_id
      join public.projects p on p.id = a.project_id
      join public.clients c on c.id = p.client_id
      where c.workspace_id = public.current_admin_workspace_id()
    )
  );

create policy "decisions: reviewer select for their clients"
  on public.decisions for select
  using (
    asset_version_id in (
      select av.id from public.asset_versions av
      join public.assets a on a.id = av.asset_id
      join public.projects p on p.id = a.project_id
      where p.client_id in (select public.current_reviewer_client_ids())
    )
  );

create policy "decisions: reviewer insert own"
  on public.decisions for insert
  with check (
    reviewer_id in (select public.current_reviewer_ids())
    and asset_version_id in (
      select av.id from public.asset_versions av
      join public.assets a on a.id = av.asset_id
      join public.projects p on p.id = a.project_id
      where p.client_id in (select public.current_reviewer_client_ids())
    )
  );

-- annotations -----------------------------------------------------------------
alter table public.annotations enable row level security;

create policy "annotations: admin select in own workspace"
  on public.annotations for select
  using (
    asset_version_id in (
      select av.id from public.asset_versions av
      join public.assets a on a.id = av.asset_id
      join public.projects p on p.id = a.project_id
      join public.clients c on c.id = p.client_id
      where c.workspace_id = public.current_admin_workspace_id()
    )
  );

create policy "annotations: reviewer select for their clients"
  on public.annotations for select
  using (
    asset_version_id in (
      select av.id from public.asset_versions av
      join public.assets a on a.id = av.asset_id
      join public.projects p on p.id = a.project_id
      where p.client_id in (select public.current_reviewer_client_ids())
    )
  );

create policy "annotations: reviewer insert own"
  on public.annotations for insert
  with check (
    reviewer_id in (select public.current_reviewer_ids())
    and asset_version_id in (
      select av.id from public.asset_versions av
      join public.assets a on a.id = av.asset_id
      join public.projects p on p.id = a.project_id
      where p.client_id in (select public.current_reviewer_client_ids())
    )
  );

-- notifications ---------------------------------------------------------------
-- RLS on, no policies — service_role-only table.
alter table public.notifications enable row level security;

-- ============================================================================
-- Supabase Storage — private bucket for uploaded asset files.
-- Signed URLs (generated server-side by admins) give reviewers time-limited
-- access without storage-level RLS for reviewers.
--
-- Path convention: {workspace_id}/{asset_id}/{version_id}/{filename}
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('asset-files', 'asset-files', false)
on conflict (id) do nothing;

create policy "asset-files: admin select own workspace"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'asset-files'
    and (storage.foldername(name))[1] = public.current_admin_workspace_id()::text
  );

create policy "asset-files: admin insert own workspace"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'asset-files'
    and (storage.foldername(name))[1] = public.current_admin_workspace_id()::text
  );

create policy "asset-files: admin update own workspace"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'asset-files'
    and (storage.foldername(name))[1] = public.current_admin_workspace_id()::text
  );

create policy "asset-files: admin delete own workspace"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'asset-files'
    and (storage.foldername(name))[1] = public.current_admin_workspace_id()::text
  );
