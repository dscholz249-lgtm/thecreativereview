-- ============================================================================
-- Storage: reviewer SELECT access to asset-files
--
-- Milestone 1 added a SELECT policy for admins keyed on the first folder
-- segment (workspace_id). No parallel policy for reviewers — which means
-- Supabase's createSignedUrl() silently failed for them, leaving the
-- reviewer asset detail + request-changes pages without a preview image.
--
-- Strategy: delegate storage access to the asset_versions RLS we already
-- have. If the caller can SELECT the asset_version whose storage_path
-- matches this object, they can read the object. That inner SELECT runs
-- under RLS, so reviewers only see versions for clients they review for,
-- and storage access naturally narrows to the same set.
-- ============================================================================

create policy "asset-files: reviewer select via asset_versions"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'asset-files'
    and exists (
      select 1 from public.asset_versions
      where storage_path = name
    )
  );
