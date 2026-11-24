-- California: a contractor shows the license number in all advertising; a pro without a license may only take
-- jobs under $1,000 and must say there is no license. The site follows both.

-- The license a pro works under: the pro's own checked license, or the license of the verified company they work for.
create or replace function public.pro_license_no(p uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select x.license_no from public.pros x where x.id = p and x.license_status = 'verified' and x.license_no is not null),
    (select c.license_no from public.pros x join public.companies c on c.id = x.company_id where x.id = p and c.status = 'verified' and c.license_no is not null));
$$;
grant execute on function public.pro_license_no(uuid) to anon, authenticated;

-- Each quote keeps the license number it was sent under. Without a license, a quote of $1,000 or more is refused.
alter table public.quotes add column if not exists pro_license text;
create or replace function public.quotes_license_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.pro_license := public.pro_license_no(new.pro_id);
  if new.pro_license is null and new.total >= 1000 then
    raise exception 'license needed: a quote of $1,000 or more needs a CSLB license';
  end if;
  return new;
end;
$$;
drop trigger if exists quotes_license_guard on public.quotes;
create trigger quotes_license_guard before insert on public.quotes for each row execute function public.quotes_license_guard();

-- Quotes sent before this rule get the number their pro works under now.
update public.quotes set pro_license = public.pro_license_no(pro_id) where pro_license is null;
