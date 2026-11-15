-- Launch version of pro profiles: pros describe their experience and skills and upload work photos.
-- Levels, job counters and the skill passport stay hidden until a pro has enough real jobs and reviews (see lib/levels.ts).

alter table public.pros
  add column if not exists experience text check (char_length(experience) <= 2000),
  add column if not exists skills text[] not null default '{}';

create table public.pro_photos (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references public.pros (id) on delete cascade,
  url text not null,
  caption text check (char_length(caption) <= 140),
  -- portfolio: any work photo the pro uploads; before / after: taken on a NovaFides job
  kind text not null default 'portfolio' check (kind in ('portfolio', 'before', 'after')),
  booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((kind = 'portfolio') or booking_id is not null)
);
create index pro_photos_pro_idx on public.pro_photos (pro_id, created_at desc);

alter table public.pro_photos enable row level security;

-- Portfolio photos of verified pros are public. Job photos (before/after) are seen by the pro,
-- the client of that job and the company office, because they show the inside of a home.
create policy pro_photos_read on public.pro_photos for select using (
  pro_id = auth.uid() or public.is_admin()
  or (kind = 'portfolio' and exists (select 1 from public.pros p where p.id = pro_id and p.status = 'verified'))
  or (booking_id is not null and exists (select 1 from public.bookings b where b.id = booking_id))
);
create policy pro_photos_insert on public.pro_photos for insert with check (
  pro_id = auth.uid()
  and (booking_id is null or exists (select 1 from public.bookings b where b.id = booking_id and b.pro_id = auth.uid()))
);

-- At most 200 photos per pro (a trigger, because a policy cannot count its own table).
create or replace function public.limit_pro_photos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.pro_photos where pro_id = new.pro_id) >= 200 then
    raise exception 'photo limit reached (200)';
  end if;
  return new;
end;
$$;
create trigger pro_photos_limit before insert on public.pro_photos
  for each row execute function public.limit_pro_photos();
create policy pro_photos_update on public.pro_photos for update using (pro_id = auth.uid()) with check (pro_id = auth.uid());
create policy pro_photos_delete on public.pro_photos for delete using (pro_id = auth.uid() or public.is_admin());

grant select on public.pro_photos to anon, authenticated;
grant insert, update, delete on public.pro_photos to authenticated;
