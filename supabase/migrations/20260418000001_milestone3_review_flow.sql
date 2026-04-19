-- ============================================================================
-- Milestone 3 — reviewer submission path
--
-- Adds:
--   * submit_decision(...) RPC — atomically inserts annotations + decision
--     in one transaction so the DEFERRABLE reject-has-content trigger from
--     milestone 1 sees both halves at COMMIT.
--   * decisions → assets status propagation trigger.
--   * assets → projects completion trigger (status = 'completed' when every
--     non-archived asset is approved, per PRD 7.2).
--
-- All triggers are SECURITY DEFINER so they can UPDATE tables the decision
-- inserter (a client_reviewer) would be blocked from updating under RLS.
-- The RPC itself is SECURITY INVOKER so RLS still scopes what rows a caller
-- can touch via the RPC.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- submit_decision RPC — the one sanctioned entry point for reject+annotations
-- and approve from a reviewer. Zod validation runs upstream in the Server
-- Action; this function + the milestone 1 invariant triggers form the
-- defense-in-depth.
-- ---------------------------------------------------------------------------
create or replace function public.submit_decision(
  p_asset_version_id uuid,
  p_verdict public.decision_verdict,
  p_feedback_text text default null,
  p_annotations jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_reviewer_id uuid;
  v_decision_id uuid;
  v_annotation jsonb;
begin
  -- Resolve the caller to their client_reviewer row. A user could have
  -- multiple client_reviewer rows (one per client), so scope by the asset
  -- they're actually reviewing.
  select cr.id into v_reviewer_id
  from public.client_reviewers cr
  join public.projects p on p.client_id = cr.client_id
  join public.assets a on a.project_id = p.id
  join public.asset_versions av on av.asset_id = a.id
  where cr.auth_user_id = auth.uid()
    and av.id = p_asset_version_id
  limit 1;

  if v_reviewer_id is null then
    raise exception 'submit_decision: caller is not a reviewer for this asset'
      using errcode = 'P0001';
  end if;

  -- Invariant 1 (DB-side): approve decisions strip feedback and refuse if
  -- annotations exist. Zod already enforces these upstream; the SQL layer
  -- is the last line of defense.
  if p_verdict = 'approve' and jsonb_array_length(p_annotations) > 0 then
    raise exception 'submit_decision: approve cannot carry annotations'
      using errcode = '23514';
  end if;

  -- Insert annotations first so the DEFERRED reject-has-content trigger
  -- sees them at COMMIT. The annotations_enforce_not_after_approve trigger
  -- from milestone 1 blocks this if an approve already exists.
  if jsonb_array_length(p_annotations) > 0 then
    for v_annotation in select * from jsonb_array_elements(p_annotations)
    loop
      insert into public.annotations (
        asset_version_id, reviewer_id, x_pct, y_pct, comment_text
      ) values (
        p_asset_version_id,
        v_reviewer_id,
        (v_annotation->>'x_pct')::numeric,
        (v_annotation->>'y_pct')::numeric,
        v_annotation->>'comment_text'
      );
    end loop;
  end if;

  insert into public.decisions (
    asset_version_id, reviewer_id, verdict, feedback_text
  ) values (
    p_asset_version_id,
    v_reviewer_id,
    p_verdict,
    case when p_verdict = 'approve' then null else p_feedback_text end
  )
  returning id into v_decision_id;

  return v_decision_id;
end;
$$;

grant execute on function public.submit_decision(uuid, public.decision_verdict, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Status propagation: decisions → assets.status.
-- Per PRD open-question #2, first reviewer decides (v1 simplicity).
-- ---------------------------------------------------------------------------
create or replace function public.update_asset_status_from_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_status public.asset_status;
begin
  v_new_status := case when new.verdict = 'approve' then 'approved' else 'rejected' end;
  update public.assets
    set status = v_new_status
    where id = (select asset_id from public.asset_versions where id = new.asset_version_id);
  return new;
end;
$$;

drop trigger if exists decisions_update_asset_status on public.decisions;
create trigger decisions_update_asset_status
  after insert on public.decisions
  for each row
  execute function public.update_asset_status_from_decision();

-- ---------------------------------------------------------------------------
-- Status propagation: assets.status → projects.status.
-- "Project is `completed` when every non-archived asset within it has status
-- `approved`" (PRD 7.2).
-- ---------------------------------------------------------------------------
create or replace function public.check_project_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int;
begin
  select count(*) into v_remaining
  from public.assets
  where project_id = new.project_id
    and archived = false
    and status != 'approved';

  if v_remaining = 0 then
    update public.projects set status = 'completed' where id = new.project_id;
  end if;

  return new;
end;
$$;

drop trigger if exists assets_check_project_completion on public.assets;
create trigger assets_check_project_completion
  after update of status on public.assets
  for each row
  when (new.status = 'approved')
  execute function public.check_project_completion();

-- ---------------------------------------------------------------------------
-- Auto-link client_reviewers.auth_user_id when an invited reviewer confirms
-- their magic-link email. Runs on auth.users insert or update — idempotent;
-- re-running never overwrites a non-null auth_user_id.
-- ---------------------------------------------------------------------------
create or replace function public.link_reviewer_on_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.client_reviewers
    set auth_user_id = new.id
    where email = new.email
      and auth_user_id is null;
  return new;
end;
$$;

drop trigger if exists link_reviewer_on_auth_user on auth.users;
create trigger link_reviewer_on_auth_user
  after insert or update on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function public.link_reviewer_on_auth_user();
