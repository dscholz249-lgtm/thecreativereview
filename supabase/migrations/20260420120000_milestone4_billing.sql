-- ============================================================================
-- Milestone 4 — billing columns
--
-- Adds the two fields the Stripe webhook updates on subscription lifecycle
-- events. Both are nullable because free-tier / OSS workspaces never have
-- a Stripe customer, and a subscription is a separate lifecycle from a
-- customer (customer is created on first checkout, subscription can be
-- canceled + replaced).
-- ============================================================================

alter table public.workspaces
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create unique index if not exists workspaces_stripe_customer_id_idx
  on public.workspaces (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists workspaces_stripe_subscription_id_idx
  on public.workspaces (stripe_subscription_id)
  where stripe_subscription_id is not null;
