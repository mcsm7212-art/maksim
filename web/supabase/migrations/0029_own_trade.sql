-- A pro whose trade is not one of the four can add their own: trade = 'other' and the name in custom_trade.
-- Their jobs are their own services, grouped in their own categories. Nothing changes for anyone else.
alter table public.pros drop constraint if exists pros_trade_check;
alter table public.pros add constraint pros_trade_check check (trade in ('plumbing', 'electrical', 'handyman', 'construction', 'other'));
alter table public.pros add column if not exists custom_trade text;
alter table public.pros drop constraint if exists pros_custom_trade_check;
alter table public.pros add constraint pros_custom_trade_check check (
  (trade = 'other' and char_length(btrim(coalesce(custom_trade, ''))) between 2 and 40) or (trade <> 'other' and custom_trade is null));

alter table public.pro_custom_services add column if not exists category text;
alter table public.pro_custom_services drop constraint if exists pro_custom_services_category_check;
alter table public.pro_custom_services add constraint pro_custom_services_category_check check (category is null or char_length(btrim(category)) between 1 and 60);

-- Up to 60 own services now (a pro with their own trade lists all their jobs here); the $1,000 rule (California) stays,
-- now "$1,000 or more", the same as on the site.
create or replace function public.pro_custom_service_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare lic text; co uuid;
begin
  if (select count(*) from public.pro_custom_services where pro_id = new.pro_id and id is distinct from new.id) >= 60 then
    raise exception 'custom service limit: 60';
  end if;
  select license_no, company_id into lic, co from public.pros where id = new.pro_id;
  if coalesce(lic, '') = '' and co is null and coalesce(new.price, 0) >= 1000 then
    raise exception 'license needed: jobs of $1,000 or more need a CSLB license';
  end if;
  new.category := nullif(btrim(new.category), '');
  return new;
end;
$$;
