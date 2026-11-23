-- 1) "Pros I need": a pro's private list of pros from any trade (e.g. an electrician for my projects) with a note.
create table if not exists public.pro_helpers (
  pro_id uuid not null references public.pros (id) on delete cascade default auth.uid(),
  helper_id uuid not null references public.pros (id) on delete cascade,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  primary key (pro_id, helper_id), check (pro_id <> helper_id)
);
alter table public.pro_helpers enable row level security;
drop policy if exists pro_helpers_own on public.pro_helpers;
create policy pro_helpers_own on public.pro_helpers for all using (pro_id = auth.uid()) with check (pro_id = auth.uid());
grant select, insert, update, delete on public.pro_helpers to authenticated;

-- 2) Useful stores and tools: advice from pros of one trade for pros of the same trade, ranked by their votes.
-- The group is the trade; for an own trade it is its name.
create or replace function public.trade_group(p uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when trade = 'other' then 'other:' || lower(btrim(coalesce(custom_trade, ''))) else trade end from public.pros where id = p and status = 'verified';
$$;
grant execute on function public.trade_group(uuid) to authenticated;

create table if not exists public.pro_tips (
  id bigint generated always as identity primary key,
  pro_id uuid not null references public.pros (id) on delete cascade default auth.uid(),
  grp text not null default '',
  kind text not null check (kind in ('store', 'tool')),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  place text not null default '' check (char_length(place) <= 60),
  note text not null default '' check (char_length(note) <= 300),
  url text check (url is null or (url ~* '^https://[^ ]+$' and char_length(url) <= 300)),
  created_at timestamptz not null default now()
);
create index if not exists pro_tips_grp_idx on public.pro_tips (grp, kind);
alter table public.pro_tips enable row level security;
drop policy if exists pro_tips_read on public.pro_tips;
create policy pro_tips_read on public.pro_tips for select using (pro_id = auth.uid() or public.is_admin() or grp = public.trade_group(auth.uid()));
drop policy if exists pro_tips_insert on public.pro_tips;
create policy pro_tips_insert on public.pro_tips for insert with check (pro_id = auth.uid());
drop policy if exists pro_tips_delete on public.pro_tips;
create policy pro_tips_delete on public.pro_tips for delete using (pro_id = auth.uid() or public.is_admin());
grant select, insert, delete on public.pro_tips to authenticated;

create or replace function public.pro_tips_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.grp := public.trade_group(new.pro_id);
  if new.grp is null or new.grp = 'other:' then raise exception 'only verified pros share tips'; end if;
  if (select count(*) from public.pro_tips where pro_id = new.pro_id) >= 40 then raise exception 'tip limit: 40'; end if;
  if public.bad_text(concat_ws(' ', new.name, new.place, new.note)) then raise exception 'inappropriate words'; end if;
  if public.non_latin(concat_ws(' ', new.name, new.place, new.note)) then raise exception 'english only: tips'; end if;
  new.name := btrim(new.name); new.url := nullif(btrim(coalesce(new.url, '')), '');
  return new;
end;
$$;
drop trigger if exists pro_tips_before on public.pro_tips;
create trigger pro_tips_before before insert on public.pro_tips for each row execute function public.pro_tips_before();

create table if not exists public.pro_tip_votes (
  tip_id bigint not null references public.pro_tips (id) on delete cascade,
  user_id uuid not null references public.pros (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (tip_id, user_id)
);
alter table public.pro_tip_votes enable row level security;
drop policy if exists pro_tip_votes_read on public.pro_tip_votes;
create policy pro_tip_votes_read on public.pro_tip_votes for select using (exists (select 1 from public.pro_tips t where t.id = tip_id));
drop policy if exists pro_tip_votes_insert on public.pro_tip_votes;
create policy pro_tip_votes_insert on public.pro_tip_votes for insert with check (
  user_id = auth.uid() and exists (select 1 from public.pro_tips t where t.id = tip_id and t.pro_id <> auth.uid() and t.grp = public.trade_group(auth.uid())));
drop policy if exists pro_tip_votes_delete on public.pro_tip_votes;
create policy pro_tip_votes_delete on public.pro_tip_votes for delete using (user_id = auth.uid());
grant select, insert, delete on public.pro_tip_votes to authenticated;
