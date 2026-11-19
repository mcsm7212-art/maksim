-- Demo profiles, photos on the first request, and "I have the same problem" requests from a pro's work example.

-- Demo (example) profiles: clearly labeled, never bookable, never counted as available.
alter table public.pros add column if not exists is_demo boolean not null default false;
update public.pros set is_demo = true where id::text like '7e570000-0000-4000-8000-00000000000_';
create or replace function public.booking_needs_open_pro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pro_id is not null and exists (select 1 from public.pros where id = new.pro_id and is_demo) then
    raise exception 'demo profile: this is an example profile and cannot be booked';
  end if;
  if new.pro_id is not null and not public.pro_accepting(new.pro_id) then
    raise exception 'pro not accepting: this pro is not taking new jobs right now';
  end if;
  return new;
end;
$$;
-- only an admin marks or unmarks a demo profile
create or replace function public.protect_demo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- signed-in users other than admins cannot change it; the database owner (SQL editor, migrations) can
  if auth.uid() is not null and not public.is_admin() then new.is_demo := old.is_demo; end if;
  return new;
end;
$$;
drop trigger if exists pros_protect_demo on public.pros;
create trigger pros_protect_demo before update of is_demo on public.pros for each row execute function public.protect_demo();

-- Photos sent with a booking request (up to 6).
alter table public.bookings add column if not exists photos text[] not null default '{}';
alter table public.bookings drop constraint if exists bookings_photos_check;
alter table public.bookings add constraint bookings_photos_check check (cardinality(photos) <= 6);

-- "I have the same problem": a request that started from one of the pro's work examples.
create table if not exists public.work_requests (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.profiles (id) on delete cascade,
  pro_id uuid not null references public.pros (id) on delete cascade,
  post_id uuid references public.posts (id) on delete set null,
  photo_id uuid references public.pro_photos (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists work_requests_pro_idx on public.work_requests (pro_id, created_at desc);
alter table public.work_requests enable row level security;
drop policy if exists work_requests_read on public.work_requests;
create policy work_requests_read on public.work_requests for select using (client_id = auth.uid() or pro_id = auth.uid() or public.is_admin());
drop policy if exists work_requests_insert on public.work_requests;
create policy work_requests_insert on public.work_requests for insert with check (client_id = auth.uid() and client_id <> pro_id);
grant select, insert on public.work_requests to authenticated;
grant usage, select on all sequences in schema public to authenticated;
