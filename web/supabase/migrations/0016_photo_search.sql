-- Photo search: a client photographs a problem, AI recognizes the job, and we show pros who have done it,
-- with their photos of that kind of job. Job photos (before/after) stay private unless the pro shows them
-- on their page; the client of that job can always hide them again.

alter table public.pro_photos add column if not exists service_id text references public.services (id) on delete set null;
alter table public.pro_photos add column if not exists public boolean not null default false;
alter table public.pro_photos add column if not exists client_hidden boolean not null default false;
create index if not exists pro_photos_service_idx on public.pro_photos (service_id) where service_id is not null;

-- Job photos get the job's service automatically; a photo the client hid can't be shown again.
create or replace function public.pro_photo_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.booking_id is not null and new.service_id is null then
    select service_id into new.service_id from public.bookings where id = new.booking_id;
  end if;
  if new.client_hidden then new.public := false; end if;
  return new;
end;
$$;
drop trigger if exists pro_photos_before on public.pro_photos;
create trigger pro_photos_before before insert or update on public.pro_photos for each row execute function public.pro_photo_before();

drop policy if exists pro_photos_read on public.pro_photos;
create policy pro_photos_read on public.pro_photos for select using (
  pro_id = auth.uid() or public.is_admin()
  or ((kind = 'portfolio' or public) and exists (select 1 from public.pros p where p.id = pro_id and p.status = 'verified'))
  or (booking_id is not null and exists (select 1 from public.bookings b where b.id = booking_id))
);

-- The client of a job hides its photos from the pro's public page (for good).
create or replace function public.hide_job_photos(b_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.bookings where id = b_id and client_id = auth.uid()) then raise exception 'not your job'; end if;
  update public.pro_photos set client_hidden = true, public = false where booking_id = b_id;
end;
$$;
grant execute on function public.hide_job_photos(uuid) to authenticated;

-- A small daily allowance of photo searches per visitor (each one is an AI call).
create table if not exists public.photo_search_log (
  id bigint generated always as identity primary key,
  who text not null,
  created_at timestamptz not null default now()
);
create index if not exists photo_search_log_who_idx on public.photo_search_log (who, created_at desc);
alter table public.photo_search_log enable row level security;
create or replace function public.photo_search_quota(who text, per_day int default 30) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.photo_search_log l where l.who = photo_search_quota.who and l.created_at > now() - interval '1 day') >= per_day then return false; end if;
  insert into public.photo_search_log (who) values (photo_search_quota.who);
  delete from public.photo_search_log where created_at < now() - interval '3 days';
  return true;
end;
$$;
grant execute on function public.photo_search_quota(text, int) to anon, authenticated;
