-- The CSLB master license list (public data the admin downloads from the CSLB Data Portal and uploads in /admin).
-- Every license number a pro types is compared with it automatically; the admin still makes the final decision.
create table if not exists public.cslb_licenses (
  license_no text primary key check (license_no ~ '^[0-9]{1,8}$'),
  name text not null default '',        -- BusinessName
  name2 text not null default '',       -- BUS-NAME-2 (e.g. the owner's name in normal order)
  city text not null default '',
  status text not null default '',      -- PrimaryStatus: CLEAR = active
  status2 text not null default '',     -- SecondaryStatus (notes, e.g. workers' comp)
  classes text[] not null default '{}', -- normalized: C36, C10, B, B2 …
  expires date,
  updated date
);
alter table public.cslb_licenses enable row level security;
drop policy if exists cslb_admin on public.cslb_licenses;
create policy cslb_admin on public.cslb_licenses for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.cslb_licenses to authenticated;

create table if not exists public.cslb_imports (
  id bigint generated always as identity primary key,
  rows int not null, data_date date, created_at timestamptz not null default now()
);
alter table public.cslb_imports enable row level security;
drop policy if exists cslb_imports_admin on public.cslb_imports;
create policy cslb_imports_admin on public.cslb_imports for all using (public.is_admin()) with check (public.is_admin());
grant select, insert on public.cslb_imports to authenticated;

-- What the list says about a number, for a trade. result:
--   ok        found, active (CLEAR), not expired, the class fits the trade
--   class     found and active, but no class for this trade (e.g. C10 for a plumber)
--   inactive  found, but not CLEAR or expired
--   not_found not in the list
--   no_list   the list was never uploaded
create or replace function public.cslb_check(num text, trd text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r public.cslb_licenses; need text[]; res text;
begin
  if not exists (select 1 from public.cslb_licenses limit 1) then return jsonb_build_object('result', 'no_list', 'checked_at', now()); end if;
  select * into r from public.cslb_licenses where license_no = ltrim(num, '0') or license_no = num limit 1;
  if r.license_no is null then return jsonb_build_object('result', 'not_found', 'checked_at', now()); end if;
  need := case trd when 'plumbing' then array['C36'] when 'electrical' then array['C10'] when 'construction' then array['B', 'B2'] else null end;
  res := case
    when upper(r.status) <> 'CLEAR' or (r.expires is not null and r.expires < current_date) then 'inactive'
    when need is not null and not (r.classes && need) then 'class'
    else 'ok' end;
  return jsonb_build_object('result', res, 'name', r.name, 'name2', r.name2, 'city', r.city, 'status', r.status, 'status2', r.status2,
    'classes', r.classes, 'expires', r.expires, 'list_date', r.updated, 'checked_at', now());
end;
$$;
revoke execute on function public.cslb_check(text, text) from public, anon;
grant execute on function public.cslb_check(text, text) to authenticated;

alter table public.pros add column if not exists license_auto jsonb;

-- The check is stored with the pro whenever a number is set (sign-up or submit_license). Pros cannot write it.
create or replace function public.pros_license_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    if new.license_no is distinct from (case when tg_op = 'UPDATE' then old.license_no end) then
      new.license_auto := case when new.license_no is null then null else public.cslb_check(new.license_no, new.trade) end;
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.license_no := nullif(regexp_replace(coalesce(new.license_no, ''), '\D', '', 'g'), '');
    new.license_status := case when new.license_no is not null then 'pending' else 'none' end;
    new.license_checked_at := null;
    new.id_verified := false;
    new.license_auto := case when new.license_no is null then null else public.cslb_check(new.license_no, new.trade) end;
  else
    if new.license_no is distinct from old.license_no and coalesce(current_setting('nf.license_submit', true), '') <> '1' then
      raise exception 'license number changes go through the check';
    end if;
    if new.license_auto is distinct from old.license_auto and coalesce(current_setting('nf.license_submit', true), '') <> '1' then
      new.license_auto := old.license_auto;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.submit_license(n text) returns void
language plpgsql security definer set search_path = public as $$
declare num text := regexp_replace(coalesce(n, ''), '\D', '', 'g'); t text;
begin
  select trade into t from public.pros where id = auth.uid();
  if auth.uid() is null or t is null then raise exception 'not a pro'; end if;
  if num !~ '^[0-9]{5,8}$' then raise exception 'license format: 5 to 8 digits'; end if;
  perform set_config('nf.license_submit', '1', true);
  update public.pros set license_no = num, license_status = 'pending', license_checked_at = null, license_auto = public.cslb_check(num, t) where id = auth.uid();
  perform set_config('nf.license_submit', '', true);
end;
$$;

-- Admin: check everyone again after a new list was uploaded.
create or replace function public.cslb_recheck_all() returns int
language plpgsql security definer set search_path = public as $$
declare k int;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.pros set license_auto = public.cslb_check(license_no, trade) where license_no is not null;
  get diagnostics k = row_count; return k;
end;
$$;
grant execute on function public.cslb_recheck_all() to authenticated;
