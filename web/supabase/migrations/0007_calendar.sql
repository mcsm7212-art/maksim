-- Calendar sync without OAuth:
--  1) export: each pro gets a secret iCal feed URL with their NovaFides jobs (Google / Apple / Outlook subscribe to it);
--  2) import: a pro pastes the secret iCal address of their own calendar; we store only busy time ranges (no titles).

create table public.pro_private (
  pro_id uuid primary key references public.pros (id) on delete cascade,
  calendar_token text unique,
  busy_ics_url text check (char_length(busy_ics_url) <= 600),
  busy_synced_at timestamptz,
  busy_sync_error text
);
alter table public.pro_private enable row level security;
create policy pro_private_self on public.pro_private for all using (pro_id = auth.uid()) with check (pro_id = auth.uid());
grant select, insert, update, delete on public.pro_private to authenticated;

-- Busy ranges imported from the pro's own calendar. Public like booked times: no titles, only time ranges.
create table public.pro_busy (
  id bigint generated always as identity primary key,
  pro_id uuid not null references public.pros (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at)
);
create index pro_busy_pro_idx on public.pro_busy (pro_id, starts_at);
alter table public.pro_busy enable row level security;
create policy pro_busy_read on public.pro_busy for select using (true);
create policy pro_busy_write on public.pro_busy for all using (pro_id = auth.uid()) with check (pro_id = auth.uid());
grant select on public.pro_busy to anon, authenticated;
grant insert, update, delete on public.pro_busy to authenticated;

-- Busy ranges for a pro: NovaFides jobs (2-hour visits) plus imported calendar blocks.
create or replace function public.pro_busy_ranges(p_id uuid) returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.starts_at, b.starts_at + interval '2 hours' from public.bookings b
    where b.pro_id = p_id and b.starts_at > now() - interval '2 hours' and b.status not in ('cancelled', 'done')
  union all
  select x.starts_at, x.ends_at from public.pro_busy x where x.pro_id = p_id and x.ends_at > now();
$$;
grant execute on function public.pro_busy_ranges(uuid) to anon, authenticated;

-- iCal export: the jobs of the pro who owns this secret token (read by calendar apps without signing in).
create or replace function public.calendar_feed(token text)
returns table (id uuid, starts_at timestamptz, status text, service_id text, address text, notes text, client_name text, updated timestamptz)
language sql stable security definer set search_path = public as $$
  select b.id, b.starts_at, b.status, b.service_id, b.address, b.notes, p.full_name, b.created_at
  from public.pro_private pp
  join public.bookings b on b.pro_id = pp.pro_id
  left join public.profiles p on p.id = b.client_id
  where pp.calendar_token = token and char_length(token) >= 24
    and b.starts_at is not null and b.starts_at > now() - interval '30 days'
    and b.status in ('requested', 'confirmed', 'on_the_way', 'in_progress', 'done');
$$;
grant execute on function public.calendar_feed(text) to anon, authenticated;
