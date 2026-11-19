-- Honest rating: every review stays visible, but reviews that follow a suspicious pattern count less (or not at all)
-- in the rating, and a moderator looks at them. An honest one-off negative review always counts in full.
--
-- How a review's weight is chosen (public.review_recalc_client):
--   * competitor pattern: the author praises one pro (4.5+) and gives 2 or more other pros 2 stars or less, while those
--     pros are rated at least 2 stars higher by everyone else → weight 0 on all of that author's reviews, to the queue;
--   * harsh pattern: the author has 3+ comparable reviews and is on average 1.5+ stars below what everyone else gives
--     the same pros → the reviews that are 1.5+ below count 25%, to the queue;
--   * praise pattern: the same, 1.5+ above → those reviews count 25%, to the queue;
--   * resolved with the pro, 3 stars or less → counts 50% (the problem was fixed);
--   * otherwise → 100%.
--   "Comparable" means the pro has at least 3 reviews from other clients. A moderator's decision is final.
-- Display rating = weighted average. Search order uses a Bayesian score so 1 review of 5.0 does not beat 40 reviews of 4.9.

alter table public.reviews
  add column if not exists weight numeric(3,2) not null default 1 check (weight between 0 and 1),
  add column if not exists weight_reason text check (weight_reason in ('competitor', 'harsh', 'praise', 'resolved', 'admin')),
  add column if not exists weight_by_admin boolean not null default false,
  add column if not exists needs_review boolean not null default false,
  add column if not exists helpful_count int not null default 0;

create index if not exists reviews_client_idx on public.reviews (client_id);
create index if not exists reviews_queue_idx on public.reviews (needs_review) where needs_review;

-- A client cannot set the platform's own fields when writing a review.
create or replace function public.review_clean_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.weight := 1; new.weight_reason := null; new.weight_by_admin := false; new.needs_review := false;
    new.helpful_count := 0; new.hidden := false; new.resolved := false;
  end if;
  return new;
end;
$$;
drop trigger if exists reviews_clean on public.reviews;
create trigger reviews_clean before insert on public.reviews for each row execute function public.review_clean_insert();

create or replace function public.review_score(r public.reviews) returns numeric
language sql immutable as $$ select (r.punctuality + r.workmanship + r.cleanliness + r.communication + r.pricing) / 5.0 $$;

create or replace function public.review_devs(cid uuid)
returns table (id uuid, s numeric, dev numeric, resolved boolean)
language sql stable security definer set search_path = public as $$
  select r.id, public.review_score(r), case when o.n >= 3 then public.review_score(r) - o.m end, r.resolved
  from public.reviews r
  left join lateral (
    -- compare with what others give, leaving out reviews already found to follow a pattern
    select count(*) filter (where x.weight > 0) as n, sum(x.weight * public.review_score(x)) / nullif(sum(x.weight), 0) as m from public.reviews x
    where x.pro_id = r.pro_id and x.client_id <> r.client_id and not x.hidden
  ) o on true
  where r.client_id = cid and not r.hidden
$$;
revoke execute on function public.review_devs(uuid) from public, anon, authenticated;

create or replace function public.review_recalc_client(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  k int; mean_dev numeric; praised int; trashed int; flag text;
begin
  -- each review of this author: its score and how far it is from what other clients give the same pro
  select count(dev), avg(dev), count(*) filter (where s >= 4.5), count(*) filter (where s <= 2 and dev <= -2)
    into k, mean_dev, praised, trashed
  from public.review_devs(cid);

  flag := case
    when praised >= 1 and trashed >= 2 then 'competitor'
    when k >= 3 and mean_dev <= -1.5 then 'harsh'
    when k >= 3 and mean_dev >= 1.5 then 'praise'
  end;

  update public.reviews r set weight = v.w, weight_reason = v.why, needs_review = coalesce(v.why in ('competitor', 'harsh', 'praise'), false)
  from (
    select d.id,
      case when flag = 'competitor' then 'competitor'
           when flag = 'harsh' and d.dev <= -1.5 then 'harsh'
           when flag = 'praise' and d.dev >= 1.5 then 'praise'
           when d.resolved and d.s <= 3 then 'resolved' end as why,
      case when flag = 'competitor' then 0
           when flag = 'harsh' and d.dev <= -1.5 then 0.25
           when flag = 'praise' and d.dev >= 1.5 then 0.25
           when d.resolved and d.s <= 3 then 0.5 else 1 end as w
    from public.review_devs(cid) d
  ) v
  where r.id = v.id and not r.weight_by_admin
    and (r.weight, r.weight_reason) is distinct from (v.w, v.why);
end;
$$;
revoke execute on function public.review_recalc_client(uuid) from public, anon, authenticated;

-- A new or changed review moves the comparison for everyone who reviewed the same pro.
create or replace function public.review_weights_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  for c in select distinct client_id from public.reviews where pro_id = new.pro_id or client_id = new.client_id loop
    perform public.review_recalc_client(c);
  end loop;
  return null;
end;
$$;
drop trigger if exists reviews_weights on public.reviews;
create trigger reviews_weights after insert or update of punctuality, workmanship, cleanliness, communication, pricing, hidden, resolved
  on public.reviews for each row execute function public.review_weights_trigger();

-- Moderator decision on a review in the queue: 'count' (counts in full), 'keep' (keep the reduced weight).
-- Hiding stays a separate step and only for broken rules (fake, threat, abuse, personal data).
create or replace function public.admin_review_decide(rid uuid, decision text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if decision = 'count' then
    update public.reviews set weight = 1, weight_reason = 'admin', weight_by_admin = true, needs_review = false where id = rid;
  elsif decision = 'keep' then
    update public.reviews set weight_by_admin = true, needs_review = false where id = rid;
  else raise exception 'unknown decision'; end if;
end;
$$;
grant execute on function public.admin_review_decide(uuid, text) to authenticated;

-- "Helpful" votes: anyone signed in, except the author and the pro being reviewed; one vote each.
create table if not exists public.review_helpful (
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);
alter table public.review_helpful enable row level security;
drop policy if exists helpful_read on public.review_helpful;
create policy helpful_read on public.review_helpful for select using (user_id = auth.uid());
drop policy if exists helpful_insert on public.review_helpful;
create policy helpful_insert on public.review_helpful for insert with check (
  user_id = auth.uid() and exists (select 1 from public.reviews r where r.id = review_id
    and r.publish_at <= now() and not r.hidden and r.client_id <> auth.uid() and r.pro_id <> auth.uid()));
drop policy if exists helpful_delete on public.review_helpful;
create policy helpful_delete on public.review_helpful for delete using (user_id = auth.uid());
grant select, insert, delete on public.review_helpful to authenticated;

create or replace function public.review_helpful_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare rid uuid := coalesce(new.review_id, old.review_id);
begin
  update public.reviews set helpful_count = (select count(*) from public.review_helpful where review_id = rid) where id = rid;
  return null;
end;
$$;
drop trigger if exists review_helpful_count on public.review_helpful;
create trigger review_helpful_count after insert or delete on public.review_helpful
  for each row execute function public.review_helpful_count();

-- Ratings: weighted average for display, Bayesian score (3 virtual reviews of 4.2) for ordering.
create or replace view public.pro_stats with (security_invoker = true) as
with pub as (
  select r.*, public.review_score(r) as s from public.reviews r where r.publish_at <= now() and not r.hidden
)
select p.id as pro_id,
       count(r.id) as reviews,
       round(sum(r.weight * r.s) / nullif(sum(r.weight), 0), 2) as rating,
       round(sum(r.weight * r.punctuality) / nullif(sum(r.weight), 0) * 20) as punctuality,
       round(sum(r.weight * r.workmanship) / nullif(sum(r.weight), 0) * 20) as workmanship,
       round(sum(r.weight * r.cleanliness) / nullif(sum(r.weight), 0) * 20) as cleanliness,
       round(sum(r.weight * r.communication) / nullif(sum(r.weight), 0) * 20) as communication,
       round(sum(r.weight * r.pricing) / nullif(sum(r.weight), 0) * 20) as pricing,
       (select coalesce(sum(jobs_count), 0) from public.pro_services ps where ps.pro_id = p.id) as jobs,
       count(r.id) filter (where r.weight < 1) as not_full,
       round((3 * 4.2 + coalesce(sum(r.weight * r.s), 0)) / (3 + coalesce(sum(r.weight), 0)), 3) as rank_score
from public.pros p
left join pub r on r.pro_id = p.id
group by p.id;
grant select on public.pro_stats to anon, authenticated;
