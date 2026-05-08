-- ============================================================================
-- client-logos storage bucket.
--
-- Public bucket so logos can render in admin lists and client detail
-- pages without per-render signed URL juggling. Writes are still RLS'd
-- to the workspace prefix — only that workspace's admins can upload,
-- update, or delete logos under their own folder.
--
-- Path layout: {workspace_id}/{client_id}/{filename}
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('client-logos', 'client-logos', true)
on conflict (id) do nothing;

create policy "client-logos: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'client-logos');

create policy "client-logos: admin insert own workspace"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'client-logos'
    and (storage.foldername(name))[1] = public.current_admin_workspace_id()::text
  );

create policy "client-logos: admin update own workspace"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'client-logos'
    and (storage.foldername(name))[1] = public.current_admin_workspace_id()::text
  );

create policy "client-logos: admin delete own workspace"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'client-logos'
    and (storage.foldername(name))[1] = public.current_admin_workspace_id()::text
  );
