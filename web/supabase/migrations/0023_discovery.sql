-- Discovery: "clients with similar picks choose…", saved searches, client "My project" posts confirmed by the pro, a simple public client card.

-- ── Who likes which pro (private; only counts leave the database) ──
-- A like = the client saved the pro (♥), rated them 4.5+ in a counted review, or booked them again (2+ finished jobs).
-- Only real clients count: people with a finished NovaFides job who are not pros themselves.
create or replace function public.client_likes() returns table (user_id uuid, pro_id uuid)
language sql stable security definer set search_path = public as $$
  with l as (
    select s.user_id, s.pro_id from public.pro_saves s where s.status = 'saved'
    union
    select r.client_id, r.pro_id from public.reviews r where not r.hidden and r.weight > 0 and public.review_score(r) >= 4.5
    union
    select b.client_id, b.pro_id from public.bookings b where b.status = 'done' and b.pro_id is not null group by 1, 2 having count(*) >= 2
  )
  select l.user_id, l.pro_id from l
  where not exists (select 1 from public.pros x where x.id = l.user_id)
    and exists (select 1 from public.bookings d where d.client_id = l.user_id and d.status = 'done');
$$;
revoke execute on function public.client_likes() from public, anon, authenticated;

-- Pros that clients with picks like mine also like (other trades too). Shown only when 3+ different clients agree.
create or replace function public.similar_picks(t text default null, lim int default 6) returns table (pro_id uuid, n bigint)
language sql stable security definer set search_path = public as $$
  with likes as (select * from public.client_likes()),
       mine as (select l.pro_id from likes l where l.user_id = auth.uid()),
       peers as (select distinct l.user_id from likes l where l.pro_id in (select pro_id from mine) and l.user_id <> auth.uid())
  select l.pro_id, count(distinct l.user_id) as n
  from likes l
  join peers using (user_id)
  join public.pros p on p.id = l.pro_id and p.status = 'verified' and not p.is_demo and (t is null or p.trade = t)
  where auth.uid() is not null
    and l.pro_id not in (select pro_id from mine)
    and l.pro_id <> auth.uid()
    and not exists (select 1 from public.pro_saves h where h.user_id = auth.uid() and h.pro_id = l.pro_id and h.status = 'hidden')
  group by l.pro_id having count(distinct l.user_id) >= 3
  order by 2 desc limit least(lim, 24);
$$;

-- On a pro's page: "Clients who chose X also choose…" (3+ different clients).
create or replace function public.also_chosen(p uuid, lim int default 6) returns table (pro_id uuid, n bigint)
language sql stable security definer set search_path = public as $$
  with likes as (select * from public.client_likes()),
       fans as (select distinct l.user_id from likes l where l.pro_id = p)
  select l.pro_id, count(distinct l.user_id) as n
  from likes l join fans using (user_id)
  join public.pros x on x.id = l.pro_id and x.status = 'verified' and not x.is_demo
  where l.pro_id <> p
  group by l.pro_id having count(distinct l.user_id) >= 3
  order by 2 desc limit least(lim, 24);
$$;
grant execute on function public.similar_picks(text, int), public.also_chosen(uuid, int) to anon, authenticated;

-- ── Saved searches: "tell me when a new verified pro joins" ──
create table if not exists public.saved_searches (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  trade text check (trade in ('plumbing', 'electrical', 'handyman', 'construction')),
  city text check (char_length(city) <= 60),
  created_at timestamptz not null default now(),
  unique (user_id, trade, city)
);
alter table public.saved_searches enable row level security;
drop policy if exists saved_searches_own on public.saved_searches;
create policy saved_searches_own on public.saved_searches for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.saved_searches to authenticated;

create or replace function public.limit_saved_searches() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.saved_searches where user_id = new.user_id) >= 10 then raise exception 'saved search limit: 10'; end if;
  return new;
end;
$$;
drop trigger if exists saved_searches_limit on public.saved_searches;
create trigger saved_searches_limit before insert on public.saved_searches for each row execute function public.limit_saved_searches();

create or replace function public.pro_verified_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'verified' and not coalesce(new.is_demo, false) and (tg_op = 'INSERT' or old.status is distinct from 'verified') then
    perform public.notify(s.user_id, format('New verified pro on NovaFides: %s.', new.display_name), '/pro/' || new.slug)
    from public.saved_searches s
    where (s.trade is null or s.trade = new.trade)
      and (s.city is null or coalesce(new.area, '') ilike '%' || s.city || '%' or coalesce(new.online_area, '') ilike '%' || s.city || '%')
      and s.user_id <> new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists pros_verified_notify on public.pros;
create trigger pros_verified_notify after insert or update of status on public.pros for each row execute function public.pro_verified_notify();

-- ── Client "My project": a client shows finished work and tags the pro; it goes public only after the pro confirms it ──
create table if not exists public.client_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  pro_id uuid not null references public.pros (id) on delete cascade,
  author_name text not null default '',
  body text not null default '' check (char_length(body) <= 1000),
  photos text[] not null default '{}' check (cardinality(photos) between 1 and 6),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists client_projects_pro_idx on public.client_projects (pro_id, created_at desc);
create index if not exists client_projects_client_idx on public.client_projects (client_id, created_at desc);
alter table public.client_projects enable row level security;
drop policy if exists client_projects_read on public.client_projects;
create policy client_projects_read on public.client_projects for select using (
  client_id = auth.uid() or pro_id = auth.uid() or public.is_admin()
  or (status = 'confirmed' and exists (select 1 from public.pros p where p.id = pro_id and p.status = 'verified')));
drop policy if exists client_projects_insert on public.client_projects;
create policy client_projects_insert on public.client_projects for insert with check (client_id = auth.uid());
drop policy if exists client_projects_delete on public.client_projects;
create policy client_projects_delete on public.client_projects for delete using (client_id = auth.uid() or public.is_admin());
grant select on public.client_projects to anon;
grant select, insert, delete on public.client_projects to authenticated;

create or replace function public.client_project_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.pros where id = new.client_id) then raise exception 'only clients post projects'; end if;
  if not exists (select 1 from public.pros where id = new.pro_id and status = 'verified' and not is_demo) then raise exception 'pick a verified pro'; end if;
  if (select count(*) from public.client_projects where client_id = new.client_id and created_at > now() - interval '1 day') >= 3 then
    raise exception 'project limit: 3 per day';
  end if;
  new.status := 'pending'; new.decided_at := null;
  new.author_name := public.public_name(new.client_id);
  return new;
end;
$$;
drop trigger if exists client_projects_before on public.client_projects;
create trigger client_projects_before before insert on public.client_projects for each row execute function public.client_project_before();

create or replace function public.client_project_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.pro_id, format('%s shared a project with your work. Confirm it was your job.', new.author_name), '/account/projects');
  return new;
end;
$$;
drop trigger if exists client_projects_notify on public.client_projects;
create trigger client_projects_notify after insert on public.client_projects for each row execute function public.client_project_notify();

-- The tagged pro confirms ("yes, this was my job") or declines.
create or replace function public.decide_project(pid uuid, ok boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r public.client_projects;
begin
  select * into r from public.client_projects where id = pid;
  if r.id is null or r.pro_id <> auth.uid() then raise exception 'not your project'; end if;
  if r.status <> 'pending' then raise exception 'already decided'; end if;
  update public.client_projects set status = case when ok then 'confirmed' else 'declined' end, decided_at = now() where id = pid;
  perform public.notify(r.client_id, case when ok then format('%s confirmed your project. It is now public.', (select display_name from public.pros where id = r.pro_id))
    else format('%s did not confirm your project.', (select display_name from public.pros where id = r.pro_id)) end, '/client/' || r.client_id);
end;
$$;
grant execute on function public.decide_project(uuid, boolean) to authenticated;

-- ── Public client card: first name + last initial, member since, finished jobs (count only), confirmed projects ──
create or replace function public.client_card(uid uuid) returns table (name text, since timestamptz, jobs bigint, projects bigint, is_pro boolean)
language sql stable security definer set search_path = public as $$
  select public.public_name(uid), p.created_at,
         (select count(*) from public.bookings b where b.client_id = uid and b.status = 'done'),
         (select count(*) from public.client_projects c where c.client_id = uid and c.status = 'confirmed'),
         exists (select 1 from public.pros x where x.id = uid)
  from public.profiles p where p.id = uid;
$$;
grant execute on function public.client_card(uuid) to anon, authenticated;
