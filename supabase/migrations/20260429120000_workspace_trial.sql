-- ============================================================================
-- Hosted-product trial state.
--
-- After the launch, the hosted thecreativereview.app no longer assigns
-- the 'oss' workspace_plan to anyone — that value is reserved for
-- self-hosted forks of the AGPL repo. Every hosted signup gets
-- plan='solo' with trial_ends_at set 7 days out. The (app) layout
-- redirects to /billing once trial_ends_at has passed AND there's no
-- active stripe_subscription_id.
--
-- Existing rows backfill to NULL — i.e. "no trial state, grandfathered."
-- That keeps Dan's dev/admin workspace running on plan='oss' without
-- being paywalled. New hosted signups all flow through the new path.
-- ============================================================================

alter table public.workspaces
  add column if not exists trial_ends_at timestamptz;

-- Index supports the cron sweep we'll add later for "trial ending in 24h"
-- emails. Cheap and only filters non-null rows.
create index if not exists workspaces_trial_ends_at_idx
  on public.workspaces (trial_ends_at)
  where trial_ends_at is not null;
