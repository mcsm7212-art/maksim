-- License numbers are checked by hand by a NovaFides admin (CSLB has no open access for programs).
-- A pro cannot mark their own license as checked, and cannot swap the number after it was checked:
-- a new number always goes back to "pending" through submit_license().
create or replace function public.pros_license_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- only real signed-in users are limited; admins and database maintenance are not
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.license_no := nullif(regexp_replace(coalesce(new.license_no, ''), '\D', '', 'g'), '');
    new.license_status := case when new.license_no is not null then 'pending' else 'none' end;
    new.license_checked_at := null;
    new.id_verified := false;
  elsif new.license_no is distinct from old.license_no and coalesce(current_setting('nf.license_submit', true), '') <> '1' then
    raise exception 'license number changes go through the check';
  end if;
  return new;
end;
$$;
drop trigger if exists pros_license_guard on public.pros;
create trigger pros_license_guard before insert or update on public.pros for each row execute function public.pros_license_guard();

-- A pro sends (or corrects) their CSLB license number: it waits for the admin check.
create or replace function public.submit_license(n text) returns void
language plpgsql security definer set search_path = public as $$
declare num text := regexp_replace(coalesce(n, ''), '\D', '', 'g');
begin
  if auth.uid() is null or not exists (select 1 from public.pros where id = auth.uid()) then raise exception 'not a pro'; end if;
  if num !~ '^[0-9]{5,8}$' then raise exception 'license format: 5 to 8 digits'; end if;
  perform set_config('nf.license_submit', '1', true);
  update public.pros set license_no = num, license_status = 'pending', license_checked_at = null where id = auth.uid();
  perform set_config('nf.license_submit', '', true);
end;
$$;
revoke execute on function public.submit_license(text) from public, anon;
grant execute on function public.submit_license(text) to authenticated;
