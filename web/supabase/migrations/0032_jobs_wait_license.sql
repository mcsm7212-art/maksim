-- Jobs that need a license (permit or $1,000+) may be added while the license is still being checked:
-- they are saved "waiting for approval" and stay hidden from clients until the admin confirms the license.
alter table public.pro_services add column if not exists needs_approval boolean not null default false;
alter table public.pro_custom_services add column if not exists needs_approval boolean not null default false;

-- Own jobs of $1,000+: without any license number refused; with a number not yet confirmed saved as waiting.
create or replace function public.pro_custom_service_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare lic text; st text; co uuid;
begin
  if (select count(*) from public.pro_custom_services where pro_id = new.pro_id and id is distinct from new.id) >= 60 then
    raise exception 'custom service limit: 60';
  end if;
  select license_no, license_status, company_id into lic, st, co from public.pros where id = new.pro_id;
  new.category := nullif(btrim(new.category), '');
  if coalesce(new.price, 0) >= 1000 and co is null and coalesce(st, '') <> 'verified' then
    if coalesce(lic, '') = '' then raise exception 'license needed: jobs of $1,000 or more need a CSLB license'; end if;
    new.needs_approval := true;
  elsif not public.is_admin() then
    new.needs_approval := false;
  end if;
  return new;
end;
$$;

-- Clients do not see own jobs that wait for the license check.
drop policy if exists pcs_read on public.pro_custom_services;
create policy pcs_read on public.pro_custom_services for select using (not needs_approval or pro_id = auth.uid() or public.is_admin());
