-- Explicit table permissions for the API roles. Newer Supabase projects no longer grant these automatically.
-- Row Level Security (enabled on every table) still decides which rows each user may read or change.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;
-- notify() writes notifications for others; keep it callable only from the database's own functions.
revoke execute on function public.notify(uuid, text, text) from public, anon, authenticated;
