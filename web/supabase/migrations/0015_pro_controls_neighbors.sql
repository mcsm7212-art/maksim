-- 1) Construction becomes a fourth trade (CSLB B, General Building Contractor).
-- 2) Pros can pause new jobs ("not taking jobs now", optionally until a date).
-- 3) Pros keep a colleague list and choose who may message them: all pros, only colleagues, or nobody.
-- 4) Neighbors: anyone may opt in to chat with neighbors on the same street, in the same city or across the Bay Area,
--    optionally only with neighbors who share their interests (trades). Off by default; blocking is one click.

-- ───────── 1) construction ─────────
do $$ declare r record; begin
  for r in select conrelid::regclass as t, conname from pg_constraint
    where contype = 'c' and pg_get_constraintdef(oid) like '%handyman%'
      and conrelid in ('public.companies'::regclass, 'public.services'::regclass, 'public.pros'::regclass, 'public.questions'::regclass, 'public.lounge_posts'::regclass)
  loop execute format('alter table %s drop constraint %I', r.t, r.conname); end loop;
end $$;
alter table public.companies add constraint companies_trade_check check (trade in ('plumbing', 'electrical', 'handyman', 'construction'));
alter table public.services add constraint services_trade_check check (trade in ('plumbing', 'electrical', 'handyman', 'construction'));
alter table public.pros add constraint pros_trade_check check (trade in ('plumbing', 'electrical', 'handyman', 'construction'));
alter table public.questions add constraint questions_trade_check check (trade in ('plumbing', 'electrical', 'handyman', 'construction'));
alter table public.lounge_posts add constraint lounge_posts_trade_check check (trade in ('plumbing', 'electrical', 'handyman', 'construction'));

-- ───────── 2) taking jobs or not ─────────
alter table public.pros add column if not exists accepting boolean not null default true;
alter table public.pros add column if not exists paused_until date;

-- Paused pros start taking jobs again by themselves on paused_until.
create or replace function public.pro_accepting(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select accepting or (paused_until is not null and paused_until <= (now() at time zone 'America/Los_Angeles')::date)
    from public.pros where id = p_id), true);
$$;
grant execute on function public.pro_accepting(uuid) to anon, authenticated;

create or replace function public.set_accepting(take boolean, until date default null) returns void
language sql security definer set search_path = public as $$
  update public.pros set accepting = coalesce(set_accepting.take, true),
    paused_until = case when set_accepting.take then null else set_accepting.until end
  where id = auth.uid();
$$;
revoke all on function public.set_accepting(boolean, date) from public, anon;
grant execute on function public.set_accepting(boolean, date) to authenticated;

create or replace function public.booking_needs_open_pro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pro_id is not null and not public.pro_accepting(new.pro_id) then
    raise exception 'pro not accepting: this pro is not taking new jobs right now';
  end if;
  return new;
end;
$$;
drop trigger if exists bookings_open_pro on public.bookings;
create trigger bookings_open_pro before insert on public.bookings for each row execute function public.booking_needs_open_pro();

-- ───────── 3) colleagues ─────────
alter table public.conversations add column if not exists peer_id uuid references public.profiles (id) on delete cascade;
alter table public.pros add column if not exists colleague_chat text not null default 'all';
alter table public.pros drop constraint if exists pros_colleague_chat_check;
alter table public.pros add constraint pros_colleague_chat_check check (colleague_chat in ('all', 'contacts', 'off'));

create table if not exists public.pro_contacts (
  pro_id uuid not null references public.pros (id) on delete cascade,
  colleague_id uuid not null references public.pros (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (pro_id, colleague_id),
  check (pro_id <> colleague_id)
);
alter table public.pro_contacts enable row level security;
drop policy if exists pro_contacts_own on public.pro_contacts;
create policy pro_contacts_own on public.pro_contacts for all using (pro_id = auth.uid()) with check (pro_id = auth.uid());
grant select, insert, delete on public.pro_contacts to authenticated;

-- May `sender` (a pro) write to colleague `target`? Decided by the target's setting.
create or replace function public.pro_chat_allowed(sender uuid, target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case (select colleague_chat from public.pros where id = target)
    when 'off' then false
    when 'contacts' then exists (select 1 from public.pro_contacts where pro_id = target and colleague_id = sender)
    else true end;
$$;
grant execute on function public.pro_chat_allowed(uuid, uuid) to authenticated;

-- A pro-to-pro chat with no job between them is a colleague chat.
create or replace function public.is_colleague_chat(c public.conversations) returns boolean
language sql stable security definer set search_path = public as $$
  select c.pro_id is not null and c.peer_id is null and public.is_verified_pro(c.client_id) and public.is_verified_pro(c.pro_id)
    and not exists (select 1 from public.bookings b where b.client_id = c.client_id and b.pro_id = c.pro_id);
$$;

-- ───────── 4) neighbors ─────────
create table if not exists public.neighbor_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  open boolean not null default false,
  city text check (char_length(city) <= 60),
  street text check (char_length(street) <= 80),
  scope text not null default 'city' check (scope in ('street', 'city', 'bayarea')),
  interests text[] not null default '{}' check (interests <@ array['plumbing', 'electrical', 'handyman', 'construction']),
  about text check (char_length(about) <= 200),
  updated_at timestamptz not null default now()
);
alter table public.neighbor_settings enable row level security;
drop policy if exists neighbor_settings_own on public.neighbor_settings;
create policy neighbor_settings_own on public.neighbor_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.neighbor_settings to authenticated;

create table if not exists public.neighbor_blocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id)
);
alter table public.neighbor_blocks enable row level security;
drop policy if exists neighbor_blocks_own on public.neighbor_blocks;
create policy neighbor_blocks_own on public.neighbor_blocks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.neighbor_blocks to authenticated;

-- Does `a`'s chosen circle reach `b`? (street → same street and city; city → same city; bayarea → everyone)
create or replace function public.neighbor_reach(a public.neighbor_settings, b public.neighbor_settings) returns boolean
language sql immutable as $$
  select case a.scope
    when 'bayarea' then true
    when 'city' then a.city is not null and lower(a.city) = lower(b.city)
    else a.city is not null and a.street is not null and lower(a.city) = lower(b.city) and lower(trim(a.street)) = lower(trim(b.street)) end;
$$;

-- Both opted in, each inside the other's circle, interests overlap when either chose some, and nobody blocked anyone.
create or replace function public.neighbors_match(x uuid, y uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select x <> y and exists (
    select 1 from public.neighbor_settings a, public.neighbor_settings b
    where a.user_id = x and b.user_id = y and a.open and b.open
      and public.neighbor_reach(a, b) and public.neighbor_reach(b, a)
      and (cardinality(a.interests) = 0 or cardinality(b.interests) = 0 or a.interests && b.interests))
    and not exists (select 1 from public.neighbor_blocks k where (k.user_id = x and k.blocked_id = y) or (k.user_id = y and k.blocked_id = x));
$$;

create or replace function public.my_neighbors(lim int default 60)
returns table (user_id uuid, name text, city text, street text, interests text[], about text)
language sql stable security definer set search_path = public as $$
  select b.user_id, public.public_name(b.user_id), b.city,
    case when a.street is not null and lower(trim(a.street)) = lower(trim(b.street)) and lower(a.city) = lower(b.city) then b.street end,
    b.interests, b.about
  from public.neighbor_settings a join public.neighbor_settings b on b.user_id <> a.user_id
  where a.user_id = auth.uid() and public.neighbors_match(a.user_id, b.user_id)
  order by (lower(b.city) = lower(a.city)) desc, b.updated_at desc
  limit least(coalesce(lim, 60), 200);
$$;
grant execute on function public.my_neighbors(int) to authenticated;

-- Neighbor chats are conversations with a peer instead of a pro or company.
alter table public.conversations add column if not exists peer_id uuid references public.profiles (id) on delete cascade;
do $$ declare r record; begin
  for r in select conname from pg_constraint where conrelid = 'public.conversations'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%company_id IS NOT NULL%'
  loop execute format('alter table public.conversations drop constraint %I', r.conname); end loop;
end $$;
alter table public.conversations add constraint conversations_target_check check (
  (peer_id is null and (company_id is not null or pro_id is not null)) or (peer_id is not null and company_id is null and pro_id is null));
drop index if exists public.conversations_one_per_pair;
create unique index conversations_one_per_pair on public.conversations (client_id,
  coalesce(pro_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(peer_id, '00000000-0000-0000-0000-000000000000'::uuid));

create or replace function public.in_conversation(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversations c where c.id = cid and (
    c.client_id = auth.uid() or c.pro_id = auth.uid() or c.peer_id = auth.uid()
    or (c.company_id is not null and public.is_company_staff(c.company_id))));
$$;
drop policy if exists conversations_read on public.conversations;
create policy conversations_read on public.conversations for select using (
  client_id = auth.uid() or pro_id = auth.uid() or peer_id = auth.uid() or (company_id is not null and public.is_company_staff(company_id)) or public.is_admin());

-- New chat: colleague rules and neighbor rules are checked here.
create or replace function public.conversation_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.peer_id is not null then
    if not public.neighbors_match(new.client_id, new.peer_id) then raise exception 'neighbor chat closed: you are not matched as neighbors'; end if;
  elsif public.is_colleague_chat(new) and not public.pro_chat_allowed(new.client_id, new.pro_id) then
    raise exception 'colleague chat closed: this pro does not take messages from colleagues';
  end if;
  return new;
end;
$$;
drop trigger if exists conversations_rules on public.conversations;
create trigger conversations_rules before insert on public.conversations for each row execute function public.conversation_rules();

-- New message: the same rules, both ways (a closed setting also stops replies in old chats).
create or replace function public.message_before() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations; other uuid;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if c.peer_id is not null then
    if not public.neighbors_match(c.client_id, c.peer_id) then raise exception 'neighbor chat closed: you are no longer matched as neighbors'; end if;
  elsif public.is_colleague_chat(c) then
    other := case when new.sender_id = c.client_id then c.pro_id else c.client_id end;
    if not public.pro_chat_allowed(new.sender_id, other) then raise exception 'colleague chat closed: this pro does not take messages from colleagues'; end if;
  end if;
  new.flagged := new.body ~* '(\d{3}[\s.)-]*\d{3}[\s.-]*\d{4})|([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(https?://|www\.)'
    and not public.is_colleague_chat(c)
    and not exists (select 1 from public.bookings b where b.client_id = c.client_id
      and (b.pro_id = c.pro_id or b.company_id = c.company_id) and b.status in ('confirmed', 'on_the_way', 'in_progress', 'done'));
  return new;
end;
$$;

-- Notify the other side, including neighbor chats.
create or replace function public.message_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations; who text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  update public.conversations set last_message_at = new.created_at where id = c.id;
  who := public.public_name(new.sender_id);
  if c.peer_id is not null then
    perform public.notify(case when new.sender_id = c.client_id then c.peer_id else c.client_id end, format('New message from %s.', who), '/messages/' || c.id);
  elsif new.sender_id = c.client_id then
    if c.pro_id is not null then perform public.notify(c.pro_id, format('New message from %s.', who), '/messages/' || c.id); end if;
    if c.company_id is not null then
      perform public.notify(m.profile_id, format('New message from %s.', who), '/messages/' || c.id)
        from public.company_members m where m.company_id = c.company_id and m.role in ('owner', 'manager');
    end if;
  else
    perform public.notify(c.client_id, 'You have a new message.', '/messages/' || c.id);
  end if;
  return new;
end;
$$;
