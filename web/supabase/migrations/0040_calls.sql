-- Calls: who sees the pro's phone (everyone or only the pro's own clients), call hours per day,
-- no calls while the pro is not taking jobs, and an option to hide from new clients while paused.
alter table public.pros add column if not exists call_from text not null default 'all' check (call_from in ('all', 'clients'));
alter table public.pros add column if not exists call_days jsonb;            -- null = the same as the work schedule
alter table public.pros add column if not exists call_pause boolean not null default true;   -- no calls while not taking jobs
alter table public.pros add column if not exists hide_paused boolean not null default false; -- not shown to new clients while paused

-- The number for "only my clients" is kept apart from the public profile row: only clients whose job the pro confirmed can read it.
create table if not exists public.pro_client_phone (
  pro_id uuid primary key references public.pros (id) on delete cascade default auth.uid(),
  phone text not null check (char_length(phone) between 7 and 30)
);
alter table public.pro_client_phone enable row level security;
drop policy if exists pro_client_phone_own on public.pro_client_phone;
create policy pro_client_phone_own on public.pro_client_phone for all using (pro_id = auth.uid()) with check (pro_id = auth.uid());
drop policy if exists pro_client_phone_clients on public.pro_client_phone;
create policy pro_client_phone_clients on public.pro_client_phone for select using (
  exists (select 1 from public.bookings b where b.pro_id = pro_client_phone.pro_id and b.client_id = auth.uid() and b.status in ('confirmed', 'on_the_way', 'in_progress', 'done')));
grant select, insert, update, delete on public.pro_client_phone to authenticated;
