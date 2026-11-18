-- Social features: saved / hidden pros ("My pros"), pro posts with likes (feed), colleague recommendations, popular pros.

-- "My pros": a user saves a pro (also follows their posts) or hides a pro from their search.
create table public.pro_saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  pro_id uuid not null references public.pros (id) on delete cascade,
  status text not null default 'saved' check (status in ('saved', 'hidden')),
  created_at timestamptz not null default now(),
  primary key (user_id, pro_id)
);
create index pro_saves_pro_idx on public.pro_saves (pro_id) where status = 'saved';
alter table public.pro_saves enable row level security;
create policy pro_saves_own on public.pro_saves for all using (user_id = auth.uid()) with check (user_id = auth.uid() and pro_id <> auth.uid());

-- Public count of people who saved a pro (no names).
create or replace function public.save_counts(ids uuid[]) returns table (pro_id uuid, saves bigint)
language sql stable security definer set search_path = public as $$
  select s.pro_id, count(*) from public.pro_saves s where s.pro_id = any (ids) and s.status = 'saved' group by s.pro_id;
$$;

-- Posts: a pro shares finished work (photos + short text).
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references public.pros (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1000),
  photos text[] not null default '{}' check (cardinality(photos) <= 6),
  created_at timestamptz not null default now(),
  check (char_length(body) > 0 or cardinality(photos) > 0)
);
create index posts_pro_idx on public.posts (pro_id, created_at desc);
create index posts_created_idx on public.posts (created_at desc);
alter table public.posts enable row level security;
create policy posts_read on public.posts for select using (
  pro_id = auth.uid() or public.is_admin() or exists (select 1 from public.pros p where p.id = pro_id and p.status = 'verified'));
create policy posts_insert on public.posts for insert with check (pro_id = auth.uid());
create policy posts_delete on public.posts for delete using (pro_id = auth.uid() or public.is_admin());

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
create policy post_likes_read on public.post_likes for select using (true);
create policy post_likes_own on public.post_likes for insert with check (user_id = auth.uid());
create policy post_likes_delete on public.post_likes for delete using (user_id = auth.uid());

-- At most 3 posts per pro per day (keeps the feed useful, not spammy).
create or replace function public.limit_posts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.posts where pro_id = new.pro_id and created_at > now() - interval '1 day') >= 3 then
    raise exception 'post limit: 3 posts per day';
  end if;
  return new;
end;
$$;
create trigger posts_limit before insert on public.posts for each row execute function public.limit_posts();

-- New post → notify people who saved the pro.
create or replace function public.post_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  select display_name into who from public.pros where id = new.pro_id;
  perform public.notify(s.user_id, format('New post from %s.', who), '/feed')
    from public.pro_saves s where s.pro_id = new.pro_id and s.status = 'saved';
  return new;
end;
$$;
create trigger posts_notify after insert on public.posts for each row execute function public.post_notify();

-- A pro vouches for colleagues ("my electrician is Sam").
create table public.pro_recommendations (
  pro_id uuid not null references public.pros (id) on delete cascade,
  colleague_id uuid not null references public.pros (id) on delete cascade,
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  primary key (pro_id, colleague_id),
  check (pro_id <> colleague_id)
);
alter table public.pro_recommendations enable row level security;
create policy recs_read on public.pro_recommendations for select using (true);
create policy recs_insert on public.pro_recommendations for insert with check (pro_id = auth.uid());
create policy recs_delete on public.pro_recommendations for delete using (pro_id = auth.uid());

create or replace function public.limit_recs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.pro_recommendations where pro_id = new.pro_id) >= 12 then
    raise exception 'recommendation limit: 12 colleagues';
  end if;
  if not exists (select 1 from public.pros where id = new.colleague_id and status = 'verified') then
    raise exception 'only verified pros can be recommended';
  end if;
  perform public.notify(new.colleague_id, format('%s recommends you on their page.', (select display_name from public.pros where id = new.pro_id)), '/account');
  return new;
end;
$$;
create trigger recs_limit before insert on public.pro_recommendations for each row execute function public.limit_recs();

-- Popular pros: most finished NovaFides jobs in the last 90 days (counts only, no client data).
create or replace function public.popular_pros(lim int default 8) returns table (pro_id uuid, jobs bigint)
language sql stable security definer set search_path = public as $$
  select b.pro_id, count(*) from public.bookings b join public.pros p on p.id = b.pro_id and p.status = 'verified'
  where b.status = 'done' and b.created_at > now() - interval '90 days'
  group by b.pro_id order by count(*) desc limit least(lim, 24);
$$;

grant select, insert, update, delete on public.pro_saves, public.posts, public.post_likes, public.pro_recommendations to authenticated;
grant select on public.posts, public.post_likes, public.pro_recommendations to anon;
grant execute on function public.save_counts(uuid[]), public.popular_pros(int) to anon, authenticated;
