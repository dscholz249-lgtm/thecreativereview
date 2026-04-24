-- ============================================================================
-- link_admin_on_accept: create admin_profiles row when an invited email
-- confirms via Supabase auth.
--
-- Mirrors link_reviewer_on_auth_user (milestone 3). Necessary because new
-- admins invited through generateLink(type='invite') don't exist in
-- auth.users until they click the confirmation link — so the redemption
-- action can't insert the admin_profiles row ahead of time.
--
-- Only runs for invites whose redemption action already stamped
-- accepted_at. That way any lingering auth.users rows created out of
-- band (service-role scripts, admin backfills) don't silently gain
-- access to a workspace they were never invited to.
-- ============================================================================

create or replace function public.link_admin_on_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_profiles (user_id, workspace_id, role)
  select new.id, i.workspace_id, i.role
    from public.admin_invites i
   where lower(i.email::text) = lower(new.email)
     and i.accepted_at is not null
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists link_admin_on_accept on auth.users;
create trigger link_admin_on_accept
  after insert or update on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function public.link_admin_on_accept();
