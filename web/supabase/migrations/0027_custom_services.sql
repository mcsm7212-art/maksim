-- A pro's own services that are not in the catalog (name + price). Shown on the pro's page; clients ask for an estimate.
create table if not exists public.pro_custom_services (
  id bigint generated always as identity primary key,
  pro_id uuid not null references public.pros (id) on delete cascade,
  name text not null check (char_length(name) between 3 and 80),
  price numeric(10,2) check (price is null or (price > 0 and price < 1000000)),
  created_at timestamptz not null default now()
);
create index if not exists pro_custom_services_pro_idx on public.pro_custom_services (pro_id);
alter table public.pro_custom_services enable row level security;
drop policy if exists pcs_read on public.pro_custom_services;
create policy pcs_read on public.pro_custom_services for select using (true);
drop policy if exists pcs_own on public.pro_custom_services;
create policy pcs_own on public.pro_custom_services for all using (pro_id = auth.uid()) with check (pro_id = auth.uid());
grant select on public.pro_custom_services to anon, authenticated;
grant insert, update, delete on public.pro_custom_services to authenticated;

-- At most 20 own services; without a CSLB license, nothing over $1,000 (California minor-work limit).
create or replace function public.pro_custom_service_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare lic text; co uuid;
begin
  if (select count(*) from public.pro_custom_services where pro_id = new.pro_id and id is distinct from new.id) >= 20 then
    raise exception 'custom service limit: 20';
  end if;
  select license_no, company_id into lic, co from public.pros where id = new.pro_id;
  if coalesce(lic, '') = '' and co is null and coalesce(new.price, 0) > 1000 then
    raise exception 'license needed: jobs over $1,000 need a CSLB license';
  end if;
  return new;
end;
$$;
drop trigger if exists pro_custom_services_rules on public.pro_custom_services;
create trigger pro_custom_services_rules before insert or update on public.pro_custom_services for each row execute function public.pro_custom_service_rules();
