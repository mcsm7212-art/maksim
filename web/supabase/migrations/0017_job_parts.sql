-- Parts that pros installed on NovaFides jobs: NovaFides' own parts database.
-- "Max replaced this exact Grohe cartridge 3 times" — no client details are stored or shown.
create table if not exists public.job_parts (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  pro_id uuid not null references public.pros (id) on delete cascade,
  service_id text references public.services (id) on delete set null,
  brand text check (char_length(brand) <= 40),
  part_no text check (char_length(part_no) <= 40),
  name text not null check (char_length(name) between 2 and 120),
  photo_url text check (char_length(photo_url) <= 500),
  part_key text generated always as (lower(regexp_replace(coalesce(part_no, ''), '[^A-Za-z0-9]', '', 'g'))) stored,
  created_at timestamptz not null default now()
);
create index if not exists job_parts_key_idx on public.job_parts (part_key) where part_key <> '';
create index if not exists job_parts_brand_idx on public.job_parts (lower(brand));
alter table public.job_parts enable row level security;
drop policy if exists job_parts_read on public.job_parts;
create policy job_parts_read on public.job_parts for select using (
  pro_id = auth.uid() or public.is_admin() or public.is_verified_pro(pro_id));
drop policy if exists job_parts_insert on public.job_parts;
create policy job_parts_insert on public.job_parts for insert with check (
  pro_id = auth.uid() and exists (select 1 from public.bookings b where b.id = booking_id and b.pro_id = auth.uid() and b.status in ('in_progress', 'done')));
drop policy if exists job_parts_delete on public.job_parts;
create policy job_parts_delete on public.job_parts for delete using (pro_id = auth.uid() or public.is_admin());
grant select on public.job_parts to anon, authenticated;
grant insert, delete on public.job_parts to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create or replace function public.job_part_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.service_id is null then select service_id into new.service_id from public.bookings where id = new.booking_id; end if;
  return new;
end;
$$;
drop trigger if exists job_parts_before on public.job_parts;
create trigger job_parts_before before insert on public.job_parts for each row execute function public.job_part_before();

-- Pros who installed a part: by exact part number, or by brand + words of the part type.
create or replace function public.parts_lookup(part_nos text[] default '{}', brand text default null, words text default null)
returns table (pro_id uuid, times bigint, part_no text, name text, photo_url text, exact boolean)
language sql stable security definer set search_path = public as $$
  with keys as (select lower(regexp_replace(k, '[^A-Za-z0-9]', '', 'g')) k from unnest(coalesce(part_nos, '{}')) k),
  m as (
    select j.*, (j.part_key <> '' and exists (select 1 from keys where k <> '' and (k = j.part_key or (length(k) >= 6 and length(j.part_key) >= 6 and (k like '%' || j.part_key or j.part_key like '%' || k))))) as exact
    from public.job_parts j join public.pros p on p.id = j.pro_id and p.status = 'verified'
    where (j.part_key <> '' and exists (select 1 from keys where k <> '' and (k = j.part_key or (length(k) >= 6 and length(j.part_key) >= 6 and (k like '%' || j.part_key or j.part_key like '%' || k)))))
       or (parts_lookup.brand is not null and parts_lookup.brand <> '' and lower(j.brand) = lower(parts_lookup.brand)
           and (parts_lookup.words is null or exists (select 1 from regexp_split_to_table(lower(parts_lookup.words), '\s+') w where length(w) > 3 and lower(j.name) like '%' || w || '%')))
  )
  select pro_id, count(*), (array_agg(part_no order by created_at desc))[1], (array_agg(name order by created_at desc))[1],
         (array_agg(photo_url order by created_at desc) filter (where photo_url is not null))[1], bool_or(exact)
  from m group by pro_id order by bool_or(exact) desc, count(*) desc limit 20;
$$;
grant execute on function public.parts_lookup(text[], text, text) to anon, authenticated;
