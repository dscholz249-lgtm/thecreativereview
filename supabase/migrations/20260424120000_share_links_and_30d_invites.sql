-- ============================================================================
-- 30-day share links + 30-day reviewer invites
--
-- Two parallel features that both live in a shared "our tokens, not Supabase
-- OTP" layer so we can control the 30-day window ourselves:
--
--   1. asset_share_tokens — reviewers mint a view-only link to pass along.
--      Public route /share/asset/[token] renders the asset with every
--      interactive control stripped.
--
--   2. client_reviewers.invite_token / invite_expires_at — the invite email
--      we send now points at /invite/[token] (not Supabase's OTP directly).
--      At click time /invite/[token] mints a fresh short-lived Supabase
--      magic link and redirects — so Supabase's ~24h OTP cap doesn't
--      matter; OUR window is 30 days.
--
-- Both tables are accessed via service role for the public routes; they're
-- not readable from the browser. The reviewer-side insert for
-- asset_share_tokens goes through RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Share tokens
-- ----------------------------------------------------------------------------
create table public.asset_share_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  asset_id uuid not null references public.assets(id) on delete cascade,
  -- Version captured at share time so a later re-upload doesn't silently
  -- change what the share link shows. If null, share follows the asset's
  -- current_version_id at read time (reviewer chose "always latest").
  asset_version_id uuid references public.asset_versions(id) on delete set null,
  created_by_reviewer_id uuid not null references public.client_reviewers(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index asset_share_tokens_token_idx on public.asset_share_tokens(token);
create index asset_share_tokens_asset_id_idx on public.asset_share_tokens(asset_id);
create index asset_share_tokens_created_by_idx on public.asset_share_tokens(created_by_reviewer_id);

alter table public.asset_share_tokens enable row level security;

-- Reviewers can read their own tokens (to list what they've shared, revoke).
create policy "share_tokens: reviewer reads own"
  on public.asset_share_tokens for select
  using (
    created_by_reviewer_id in (select public.current_reviewer_ids())
  );

-- Reviewers can insert tokens for assets they have access to.
create policy "share_tokens: reviewer insert for accessible assets"
  on public.asset_share_tokens for insert
  with check (
    created_by_reviewer_id in (select public.current_reviewer_ids())
    and asset_id in (
      select a.id from public.assets a
      join public.projects p on p.id = a.project_id
      where p.client_id in (select public.current_reviewer_client_ids())
    )
  );

-- Reviewers can update (to revoke) their own tokens.
create policy "share_tokens: reviewer revoke own"
  on public.asset_share_tokens for update
  using (created_by_reviewer_id in (select public.current_reviewer_ids()))
  with check (created_by_reviewer_id in (select public.current_reviewer_ids()));

-- No select/insert/update/delete policies for anyone else — the /share/asset
-- route reads these via service role, same pattern as notifications.

-- ----------------------------------------------------------------------------
-- Reviewer invite tokens (our 30-day layer, not Supabase OTP)
-- ----------------------------------------------------------------------------
alter table public.client_reviewers
  add column if not exists invite_token text unique,
  add column if not exists invite_expires_at timestamptz;

create index if not exists client_reviewers_invite_token_idx
  on public.client_reviewers(invite_token)
  where invite_token is not null;
