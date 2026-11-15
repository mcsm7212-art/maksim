-- Photo storage (Supabase only). Public bucket; each user writes only inside a folder named after their user id.
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
create policy photos_read on storage.objects for select using (bucket_id = 'photos');
create policy photos_write_own on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_update_own on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
