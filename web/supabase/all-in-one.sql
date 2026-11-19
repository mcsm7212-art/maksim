-- NovaFides: the whole database in one file (migrations 0001-0015 + service catalog).
-- Paste into Supabase → SQL Editor → New query → Run. Run it once, on an empty project.

-- ===== migrations/0001_init.sql =====
-- NovaFides marketplace: initial schema
-- Roles: client, pro (independent or company technician), company (owner/manager accounts).
-- Row Level Security is on for every table. Writes that change several rows at once
-- (assigning a technician, swapping, completing a job) go through SECURITY DEFINER functions.

create extension if not exists "pgcrypto";

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'pro', 'company', 'admin')),
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- New auth user -> profile row
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'client'))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── catalog ─────────────────────────
create table public.services (
  id text primary key,                         -- slug, e.g. faucet-replacement
  trade text not null check (trade in ('plumbing', 'electrical', 'handyman')),
  group_name text not null,
  name text not null,
  price_low numeric(10,2) not null,
  price_high numeric(10,2) not null,
  unit text not null default 'job',
  needs_permit boolean not null default false,
  emergency boolean not null default false,
  handyman_ok boolean not null default false,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── companies ─────────────────────────
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  trade text not null check (trade in ('plumbing', 'electrical', 'handyman')),
  accent text not null default '#B57A50',
  base_theme text not null default 'dark' check (base_theme in ('dark', 'graphite', 'light', 'teal')),
  logo_url text,
  city text,
  license_no text,
  since_year int,
  warranty_months int default 0,
  about text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'suspended')),
  owner_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.company_members (
  company_id uuid references public.companies (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'technician')),
  created_at timestamptz not null default now(),
  primary key (company_id, profile_id)
);

create or replace function public.is_company_staff(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.company_members
                 where company_id = cid and profile_id = auth.uid() and role in ('owner', 'manager'));
$$;

-- Invite links for technicians
create table public.company_invites (
  code text primary key default encode(gen_random_bytes(9), 'hex'),
  company_id uuid not null references public.companies (id) on delete cascade,
  role text not null default 'technician' check (role in ('manager', 'technician')),
  created_by uuid references public.profiles (id),
  used_by uuid references public.profiles (id),
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);

-- ───────────────────────── pros ─────────────────────────
create table public.pros (
  id uuid primary key references public.profiles (id) on delete cascade,
  slug text unique not null,
  display_name text not null,
  company_id uuid references public.companies (id) on delete set null,
  trade text not null check (trade in ('plumbing', 'electrical', 'handyman')),
  tiers text[] not null default array['standard'] check (tiers <@ array['economy', 'standard', 'premium']),
  years_exp int,
  area text,
  bio text,
  languages text[] default array['English'],
  license_no text,
  license_status text not null default 'none' check (license_status in ('none', 'pending', 'verified', 'expired')),
  license_checked_at timestamptz,
  insured boolean not null default false,
  bonded boolean not null default false,
  id_verified boolean not null default false,
  photo_url text,
  uniform_color text,
  accent text,
  trip_fee numeric(10,2) not null default 95,
  online_until timestamptz,
  response_minutes int,
  status text not null default 'pending' check (status in ('pending', 'verified', 'suspended')),
  created_at timestamptz not null default now()
);
create index pros_trade_idx on public.pros (trade) where status = 'verified';

create table public.pro_services (
  pro_id uuid references public.pros (id) on delete cascade,
  service_id text references public.services (id),
  price numeric(10,2),            -- null = price on quote
  jobs_count int not null default 0,  -- verified jobs on NovaFides, maintained by complete_booking()
  primary key (pro_id, service_id)
);

create table public.availability_rules (
  id bigint generated always as identity primary key,
  pro_id uuid not null references public.pros (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time)
);

-- ───────────────────────── bookings ─────────────────────────
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id),
  company_id uuid references public.companies (id),
  pro_id uuid references public.pros (id),
  service_id text references public.services (id),   -- null = estimate visit
  tier text not null default 'standard' check (tier in ('economy', 'standard', 'premium')),
  starts_at timestamptz,
  day_pref text check (day_pref in ('today', 'tomorrow', 'week')),
  address text,
  notes text,
  status text not null default 'requested'
    check (status in ('assigning', 'requested', 'confirmed', 'on_the_way', 'in_progress', 'done', 'cancelled')),
  chosen_by text not null default 'client' check (chosen_by in ('client', 'office')),
  swap_proposed_pro uuid references public.pros (id),
  price_estimate numeric(10,2),
  created_at timestamptz not null default now(),
  check (pro_id is not null or company_id is not null)
);
create index bookings_client_idx on public.bookings (client_id);
create index bookings_pro_idx on public.bookings (pro_id, starts_at);
create index bookings_company_idx on public.bookings (company_id, starts_at);

create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────────────────────── chat ─────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id),
  company_id uuid references public.companies (id),
  pro_id uuid references public.pros (id),
  booking_id uuid references public.bookings (id),
  created_at timestamptz not null default now(),
  check (company_id is not null or pro_id is not null)
);
create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null check (char_length(body) between 1 and 4000),
  flagged boolean not null default false,   -- links / phone numbers before booking
  created_at timestamptz not null default now()
);

create or replace function public.in_conversation(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = cid and (
      c.client_id = auth.uid()
      or c.pro_id = auth.uid()
      or (c.company_id is not null and public.is_company_staff(c.company_id))
    ));
$$;

-- ───────────────────────── reviews ─────────────────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references public.bookings (id),
  client_id uuid not null references public.profiles (id),
  pro_id uuid not null references public.pros (id),
  company_id uuid references public.companies (id),
  author_name text not null default 'Client',   -- first name + last initial, shown publicly
  service_id text references public.services (id),
  tier text not null default 'standard',
  punctuality smallint not null check (punctuality between 1 and 5),
  workmanship smallint not null check (workmanship between 1 and 5),
  cleanliness smallint not null check (cleanliness between 1 and 5),
  communication smallint not null check (communication between 1 and 5),
  pricing smallint not null check (pricing between 1 and 5),
  body text check (char_length(body) <= 2000),
  resolved boolean not null default false,
  updated_once boolean not null default false,
  -- double-blind: visible when the pro has also rated the client, or 14 days after submission
  publish_at timestamptz not null default now() + interval '14 days',
  hidden boolean not null default false,      -- set by moderation only
  created_at timestamptz not null default now()
);

-- Private answers only the platform sees
create table public.review_private (
  review_id uuid primary key references public.reviews (id) on delete cascade,
  would_hire_again boolean not null
);

create table public.review_replies (
  review_id uuid primary key references public.reviews (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null check (char_length(body) between 1 and 600),
  publish_at timestamptz not null default now(),
  edited boolean not null default false,
  created_at timestamptz not null default now()
);

-- Pro rates the client (visible only to pros and the platform)
create table public.client_ratings (
  booking_id uuid primary key references public.bookings (id),
  pro_id uuid not null references public.pros (id),
  client_id uuid not null references public.profiles (id),
  agreements smallint check (agreements between 1 and 5),
  access smallint check (access between 1 and 5),
  payment smallint check (payment between 1 and 5),
  created_at timestamptz not null default now()
);

create table public.review_reports (
  id bigint generated always as identity primary key,
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id),
  reason text not null check (reason in ('not_a_customer', 'extortion', 'abuse', 'personal_data', 'competitor', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'upheld', 'rejected')),
  created_at timestamptz not null default now()
);

-- ───────────────────────── subscriptions ─────────────────────────
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid references public.pros (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  plan text not null check (plan in ('founding', 'pro', 'company')),
  seats int not null default 1,
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  check ((pro_id is null) <> (company_id is null))
);

-- ───────────────────────── public views ─────────────────────────
create view public.pro_stats with (security_invoker = true) as
select p.id as pro_id,
       count(r.*) filter (where r.publish_at <= now() and not r.hidden) as reviews,
       round(avg((r.punctuality + r.workmanship + r.cleanliness + r.communication + r.pricing) / 5.0)
             filter (where r.publish_at <= now() and not r.hidden), 2) as rating,
       round(avg(r.punctuality) filter (where r.publish_at <= now() and not r.hidden) * 20) as punctuality,
       round(avg(r.workmanship) filter (where r.publish_at <= now() and not r.hidden) * 20) as workmanship,
       round(avg(r.cleanliness) filter (where r.publish_at <= now() and not r.hidden) * 20) as cleanliness,
       round(avg(r.communication) filter (where r.publish_at <= now() and not r.hidden) * 20) as communication,
       round(avg(r.pricing) filter (where r.publish_at <= now() and not r.hidden) * 20) as pricing,
       (select coalesce(sum(jobs_count), 0) from public.pro_services ps where ps.pro_id = p.id) as jobs
from public.pros p
left join public.reviews r on r.pro_id = p.id
group by p.id;

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_invites enable row level security;
alter table public.pros enable row level security;
alter table public.pro_services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.review_private enable row level security;
alter table public.review_replies enable row level security;
alter table public.client_ratings enable row level security;
alter table public.review_reports enable row level security;
alter table public.subscriptions enable row level security;

-- profiles: you see and edit your own; staff of a company and pros on a booking see the client's name via the booking functions
create policy profiles_self_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- pros and offices see the name and phone of clients they have bookings with
create or replace function public.shares_booking(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bookings b
    where b.client_id = other and (b.pro_id = auth.uid() or (b.company_id is not null and public.is_company_staff(b.company_id))));
$$;
create policy profiles_booking_contacts on public.profiles for select using (public.shares_booking(id));

-- catalog: everyone reads; admins write
create policy services_read on public.services for select using (true);
create policy services_admin on public.services for all using (public.is_admin()) with check (public.is_admin());

-- companies: public sees verified; owner/staff see their own; owner edits (not status)
create policy companies_read on public.companies for select
  using (status = 'verified' or owner_id = auth.uid() or public.is_company_staff(id) or public.is_admin());
create policy companies_insert on public.companies for insert
  with check (owner_id = auth.uid() and status = 'pending');
create policy companies_update on public.companies for update
  using (public.is_company_staff(id) or public.is_admin())
  with check (public.is_admin() or status = (select c.status from public.companies c where c.id = companies.id));

create policy members_read on public.company_members for select
  using (profile_id = auth.uid() or public.is_company_staff(company_id) or public.is_admin()
         or exists (select 1 from public.companies c where c.id = company_id and c.status = 'verified'));
create policy members_owner_insert on public.company_members for insert
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));
create policy members_staff_delete on public.company_members for delete using (public.is_company_staff(company_id));

create policy invites_staff on public.company_invites for all
  using (public.is_company_staff(company_id)) with check (public.is_company_staff(company_id));

-- pros: public sees verified; the pro sees and edits self (not verification fields); company staff see their techs
create policy pros_read on public.pros for select
  using (status = 'verified' or id = auth.uid() or (company_id is not null and public.is_company_staff(company_id)) or public.is_admin());
create policy pros_insert on public.pros for insert with check (id = auth.uid() and status = 'pending');
create policy pros_update_self on public.pros for update using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin() or (
      license_status = (select p.license_status from public.pros p where p.id = pros.id)
      and id_verified = (select p.id_verified from public.pros p where p.id = pros.id)
      and status = (select p.status from public.pros p where p.id = pros.id)
    ));

create policy pro_services_read on public.pro_services for select using (true);
create policy pro_services_insert on public.pro_services for insert with check (pro_id = auth.uid() or public.is_admin());
create policy pro_services_update on public.pro_services for update using (pro_id = auth.uid() or public.is_admin()) with check (pro_id = auth.uid() or public.is_admin());
create policy pro_services_delete on public.pro_services for delete using (pro_id = auth.uid() or public.is_admin());

-- Job counters change only when a booking is marked done (set_booking_status sets nf.trusted).
create or replace function public.protect_jobs_count() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('nf.trusted', true), '') <> '1' then
    new.jobs_count := case when tg_op = 'UPDATE' then old.jobs_count else 0 end;
  end if;
  return new;
end;
$$;
create trigger pro_services_protect before insert or update on public.pro_services
  for each row execute function public.protect_jobs_count();

create policy availability_read on public.availability_rules for select using (true);
create policy availability_write on public.availability_rules for all
  using (pro_id = auth.uid()) with check (pro_id = auth.uid());

-- bookings: client, assigned pro, company staff
create policy bookings_read on public.bookings for select
  using (client_id = auth.uid() or pro_id = auth.uid()
         or (company_id is not null and public.is_company_staff(company_id)) or public.is_admin());
create policy bookings_insert on public.bookings for insert
  with check (client_id = auth.uid() and status in ('requested', 'assigning')
              and ((pro_id is not null and chosen_by = 'client') or (pro_id is null and company_id is not null)));
-- other changes go through functions below

create policy booking_events_read on public.booking_events for select
  using (exists (select 1 from public.bookings b where b.id = booking_id));

create policy notifications_own on public.notifications for select using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy conversations_read on public.conversations for select using (public.in_conversation(id));
create policy conversations_insert on public.conversations for insert with check (client_id = auth.uid());
create policy messages_read on public.messages for select using (public.in_conversation(conversation_id));
create policy messages_insert on public.messages for insert
  with check (sender_id = auth.uid() and public.in_conversation(conversation_id));

-- reviews: public reads published; client writes once for a completed booking
create policy reviews_read on public.reviews for select
  using ((publish_at <= now() and not hidden) or client_id = auth.uid() or pro_id = auth.uid() or public.is_admin());
create policy reviews_insert on public.reviews for insert
  with check (client_id = auth.uid() and exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.client_id = auth.uid() and b.status = 'done' and b.pro_id = reviews.pro_id));
create policy review_private_insert on public.review_private for insert
  with check (exists (select 1 from public.reviews r where r.id = review_id and r.client_id = auth.uid()));
create policy review_private_admin on public.review_private for select using (public.is_admin());

create policy replies_read on public.review_replies for select
  using (publish_at <= now() or author_id = auth.uid() or public.is_admin());
create policy replies_insert on public.review_replies for insert
  with check (author_id = auth.uid() and exists (
    select 1 from public.reviews r
    where r.id = review_id and (r.pro_id = auth.uid() or (r.company_id is not null and public.is_company_staff(r.company_id)))));

create policy client_ratings_insert on public.client_ratings for insert
  with check (pro_id = auth.uid() and exists (select 1 from public.bookings b where b.id = booking_id and b.pro_id = auth.uid() and b.status = 'done'));
create policy client_ratings_read on public.client_ratings for select
  using (public.is_admin() or exists (select 1 from public.pros p where p.id = auth.uid() and p.status = 'verified'));

create policy reports_insert on public.review_reports for insert with check (reporter_id = auth.uid());
create policy reports_admin on public.review_reports for all using (public.is_admin()) with check (public.is_admin());

create policy subscriptions_read on public.subscriptions for select
  using (pro_id = auth.uid() or (company_id is not null and public.is_company_staff(company_id)) or public.is_admin());

-- ───────────────────────── functions (business rules) ─────────────────────────
-- Booked start times for a pro (no client details), used to hide taken slots.
create or replace function public.pro_busy_times(p_id uuid) returns table (starts_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.starts_at from public.bookings b
  where b.pro_id = p_id and b.starts_at > now() and b.status not in ('cancelled', 'done');
$$;
grant execute on function public.pro_busy_times(uuid) to anon, authenticated;

create or replace function public.notify(uid uuid, msg text, url text default null) returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, body, link) values (uid, msg, url);
$$;
revoke execute on function public.notify(uuid, text, text) from public, anon, authenticated;

-- Office assigns or reassigns a technician on a company booking.
-- Office-chosen bookings: change happens right away and the client is notified.
-- Client-chosen bookings: only a proposal; the client must accept.
create or replace function public.office_assign(b_id uuid, new_pro uuid, new_start timestamptz) returns text
language plpgsql security definer set search_path = public as $$
declare b public.bookings; tech_name text; old_name text;
begin
  select * into b from public.bookings where id = b_id for update;
  if b.id is null or b.company_id is null or not public.is_company_staff(b.company_id) then
    raise exception 'not allowed';
  end if;
  if not exists (select 1 from public.pros p where p.id = new_pro and p.company_id = b.company_id) then
    raise exception 'technician is not on this company team';
  end if;
  select display_name into tech_name from public.pros where id = new_pro;
  select display_name into old_name from public.pros where id = b.pro_id;

  if b.pro_id is not null and b.chosen_by = 'client' then
    update public.bookings set swap_proposed_pro = new_pro where id = b_id;
    insert into public.booking_events (booking_id, actor_id, type, payload)
      values (b_id, auth.uid(), 'swap_proposed', jsonb_build_object('from', b.pro_id, 'to', new_pro));
    perform public.notify(b.client_id, format('%s asks to change your technician to %s. Your approval is needed.', (select name from public.companies where id = b.company_id), tech_name), '/account');
    return 'proposed';
  end if;

  update public.bookings
     set pro_id = new_pro, starts_at = coalesce(new_start, starts_at), status = 'confirmed', chosen_by = 'office', swap_proposed_pro = null
   where id = b_id;
  insert into public.booking_events (booking_id, actor_id, type, payload)
    values (b_id, auth.uid(), case when b.pro_id is null then 'assigned' else 'reassigned' end,
            jsonb_build_object('from', b.pro_id, 'to', new_pro));
  perform public.notify(b.client_id,
    case when b.pro_id is null then format('%s assigned %s to your visit.', (select name from public.companies where id = b.company_id), tech_name)
         else format('%s changed your technician: %s → %s.', (select name from public.companies where id = b.company_id), old_name, tech_name) end,
    '/account');
  perform public.notify(new_pro, 'You have a new job assigned.', '/pro');
  return case when b.pro_id is null then 'assigned' else 'reassigned' end;
end;
$$;

-- Client answers a swap proposal
create or replace function public.answer_swap(b_id uuid, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = b_id for update;
  if b.client_id <> auth.uid() or b.swap_proposed_pro is null then raise exception 'not allowed'; end if;
  if accept then
    update public.bookings set pro_id = b.swap_proposed_pro, swap_proposed_pro = null where id = b_id;
    perform public.notify(b.swap_proposed_pro, 'A client accepted you for a job.', '/pro');
  else
    update public.bookings set swap_proposed_pro = null where id = b_id;
  end if;
  insert into public.booking_events (booking_id, actor_id, type, payload)
    values (b_id, auth.uid(), case when accept then 'swap_accepted' else 'swap_declined' end, '{}');
  if b.company_id is not null then
    perform public.notify(m.profile_id, case when accept then 'Client accepted the technician change.' else 'Client kept their technician.' end, '/business')
      from public.company_members m where m.company_id = b.company_id and m.role in ('owner', 'manager');
  end if;
end;
$$;

-- Pro (or office) updates job status; 'done' increments the verified job counter
create or replace function public.set_booking_status(b_id uuid, new_status text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = b_id for update;
  if not (b.pro_id = auth.uid() or (b.company_id is not null and public.is_company_staff(b.company_id))
          or (b.client_id = auth.uid() and new_status = 'cancelled')) then
    raise exception 'not allowed';
  end if;
  if new_status not in ('confirmed', 'on_the_way', 'in_progress', 'done', 'cancelled') then raise exception 'bad status'; end if;
  update public.bookings set status = new_status where id = b_id;
  insert into public.booking_events (booking_id, actor_id, type, payload) values (b_id, auth.uid(), 'status', jsonb_build_object('status', new_status));
  if new_status = 'done' and b.service_id is not null and b.pro_id is not null then
    perform set_config('nf.trusted', '1', true);
    insert into public.pro_services (pro_id, service_id, jobs_count) values (b.pro_id, b.service_id, 1)
      on conflict (pro_id, service_id) do update set jobs_count = public.pro_services.jobs_count + 1;
    perform set_config('nf.trusted', '', true);
  end if;
  if new_status in ('on_the_way', 'done') then
    perform public.notify(b.client_id, case new_status when 'on_the_way' then 'Your pro is on the way.' else 'Job marked done. Please rate your pro.' end, '/account');
  end if;
end;
$$;

-- Accept an invite link and join a company team
create or replace function public.accept_invite(invite_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.company_invites;
begin
  select * into inv from public.company_invites where code = invite_code for update;
  if inv.code is null or inv.used_by is not null or inv.expires_at < now() then raise exception 'invite is not valid'; end if;
  insert into public.company_members (company_id, profile_id, role) values (inv.company_id, auth.uid(), inv.role)
    on conflict do nothing;
  update public.company_invites set used_by = auth.uid() where code = invite_code;
  update public.pros set company_id = inv.company_id where id = auth.uid();
  return inv.company_id;
end;
$$;

-- New booking: fill company from the chosen pro, block double-booking, notify the pro or the office.
create unique index bookings_no_double on public.bookings (pro_id, starts_at)
  where status not in ('cancelled') and pro_id is not null and starts_at is not null;

create or replace function public.booking_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pro_id is not null then
    select company_id into new.company_id from public.pros where id = new.pro_id and status = 'verified';
    if not found then raise exception 'this pro is not available'; end if;
  elsif not exists (select 1 from public.companies where id = new.company_id and status = 'verified') then
    raise exception 'this company is not available';
  end if;
  return new;
end;
$$;
create trigger bookings_before_insert before insert on public.bookings
  for each row execute function public.booking_before_insert();

create or replace function public.booking_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.booking_events (booking_id, actor_id, type) values (new.id, new.client_id, 'created');
  if new.pro_id is not null then
    perform public.notify(new.pro_id, 'New booking request.', '/account');
  end if;
  if new.company_id is not null then
    perform public.notify(m.profile_id, case when new.pro_id is null then 'New visit request: assign a technician.' else 'New booking for your technician.' end, '/business')
      from public.company_members m where m.company_id = new.company_id and m.role in ('owner', 'manager');
  end if;
  return new;
end;
$$;
create trigger bookings_after_insert after insert on public.bookings
  for each row execute function public.booking_after_insert();

-- Sign-up step: a client account becomes a pro or company account (once).
create or replace function public.become(new_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if new_role not in ('pro', 'company') then raise exception 'bad role'; end if;
  update public.profiles set role = new_role where id = auth.uid() and role in ('client', new_role);
  if not found then raise exception 'role already set'; end if;
end;
$$;
grant execute on function public.become(text) to authenticated;

-- Pro switches "Online now" on for a few hours, or off.
create or replace function public.set_online(hours int) returns void
language sql security definer set search_path = public as $$
  update public.pros set online_until = case when hours > 0 then now() + make_interval(hours => least(hours, 12)) else null end
  where id = auth.uid();
$$;
grant execute on function public.set_online(int) to authenticated;

grant execute on function public.office_assign(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.answer_swap(uuid, boolean) to authenticated;
grant execute on function public.set_booking_status(uuid, text) to authenticated;
-- Shows the company name on an invite link before the technician accepts it.
create or replace function public.invite_info(invite_code text) returns table (company_name text, valid boolean)
language sql stable security definer set search_path = public as $$
  select c.name, (i.used_by is null and i.expires_at > now())
  from public.company_invites i join public.companies c on c.id = i.company_id where i.code = invite_code;
$$;
grant execute on function public.invite_info(text) to authenticated;

grant execute on function public.accept_invite(text) to authenticated;

-- ===== migrations/0002_storage.sql =====
-- Photo storage (Supabase only). Public bucket; each user writes only inside a folder named after their user id.
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
create policy photos_read on storage.objects for select using (bucket_id = 'photos');
create policy photos_write_own on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_update_own on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== migrations/0003_simple_profiles.sql =====
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

-- ===== migrations/0004_edit_profiles.sql =====
-- Pros can stop offering a service without losing its verified job count.
alter table public.pro_services add column if not exists active boolean not null default true;

-- Moderators can hide a review after upholding a report (never for an honest negative review).
create policy reviews_admin_update on public.reviews for update using (public.is_admin()) with check (public.is_admin());

-- Notifications sent by a moderator.
create or replace function public.admin_notify(uid uuid, msg text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  perform public.notify(uid, msg, '/account');
end;
$$;
grant execute on function public.admin_notify(uuid, text) to authenticated;

-- Reply rules: one calm public reply; after a low rating (average under 3) the pro waits 1 hour before replying.
create or replace function public.reply_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare r public.reviews; avg numeric;
begin
  select * into r from public.reviews where id = new.review_id;
  avg := (r.punctuality + r.workmanship + r.cleanliness + r.communication + r.pricing) / 5.0;
  if avg < 3 and now() < r.created_at + interval '1 hour' then
    raise exception 'cool-off: you can reply 1 hour after a low rating';
  end if;
  new.author_id := auth.uid();
  return new;
end;
$$;
create trigger review_replies_rules before insert on public.review_replies
  for each row execute function public.reply_rules();

-- Double-blind: a review goes public when the pro has rated the client too (or after 14 days).
create or replace function public.publish_when_both_rated() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'client_ratings' then
    update public.reviews set publish_at = least(publish_at, now()) where booking_id = new.booking_id;
  elsif exists (select 1 from public.client_ratings c where c.booking_id = new.booking_id) then
    new.publish_at := now();
  end if;
  return new;
end;
$$;
create trigger client_ratings_publish after insert on public.client_ratings
  for each row execute function public.publish_when_both_rated();
create trigger reviews_publish before insert on public.reviews
  for each row execute function public.publish_when_both_rated();

-- The pro and the office notified about a new review; the client notified about a reply.
create or replace function public.review_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'reviews' then
    perform public.notify(new.pro_id, 'You have a new review. You can reply once, calmly, up to 600 characters.', '/account/reviews');
  else
    perform public.notify((select client_id from public.reviews where id = new.review_id), 'The pro replied to your review.', '/account');
  end if;
  return new;
end;
$$;
create trigger reviews_notify after insert on public.reviews for each row execute function public.review_notify();
create trigger replies_notify after insert on public.review_replies for each row execute function public.review_notify();

-- Double-blind: the pro sees a review only once it is published.
drop policy reviews_read on public.reviews;
create policy reviews_read on public.reviews for select using (
  (publish_at <= now() and (not hidden or pro_id = auth.uid())) or client_id = auth.uid() or public.is_admin()
);

-- ── Chat ──
create unique index if not exists conversations_one_per_pair
  on public.conversations (client_id, coalesce(pro_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid));
alter table public.conversations add column if not exists last_message_at timestamptz not null default now();

-- Pros and offices may see the name of clients who booked them or wrote to them.
create or replace function public.shares_booking(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bookings b
    where b.client_id = other and (b.pro_id = auth.uid() or (b.company_id is not null and public.is_company_staff(b.company_id))))
  or exists (select 1 from public.conversations c
    where c.client_id = other and (c.pro_id = auth.uid() or (c.company_id is not null and public.is_company_staff(c.company_id))));
$$;

-- Messages: flag contact details sent before a booking is confirmed; notify the other side.
create or replace function public.message_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations; who text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  update public.conversations set last_message_at = new.created_at where id = c.id;
  select coalesce(nullif(full_name, ''), 'Someone') into who from public.profiles where id = new.sender_id;
  if new.sender_id = c.client_id then
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
create trigger messages_after after insert on public.messages for each row execute function public.message_after();

create or replace function public.message_before() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations;
begin
  select * into c from public.conversations where id = new.conversation_id;
  new.flagged := new.body ~* '(\d{3}[\s.)-]*\d{3}[\s.-]*\d{4})|([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(https?://|www\.)'
    and not exists (select 1 from public.bookings b where b.client_id = c.client_id
      and (b.pro_id = c.pro_id or b.company_id = c.company_id) and b.status in ('confirmed', 'on_the_way', 'in_progress', 'done'));
  return new;
end;
$$;
create trigger messages_before before insert on public.messages for each row execute function public.message_before();

-- Check participants on the row itself, so a new conversation can be returned right after insert.
drop policy conversations_read on public.conversations;
create policy conversations_read on public.conversations for select using (
  client_id = auth.uid() or pro_id = auth.uid() or (company_id is not null and public.is_company_staff(company_id)) or public.is_admin()
);

-- ===== migrations/0005_chat_photos_and_online.sql =====
-- Photos in chat: a message can be a photo with an optional caption.
alter table public.messages add column if not exists photo_url text;
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check
  check (char_length(body) <= 4000 and (char_length(body) >= 1 or photo_url is not null));

-- "Online now": the pro picks the city they are working in right now. Only the city is shown, never a location.
alter table public.pros add column if not exists online_area text check (char_length(online_area) <= 60);
drop function if exists public.set_online(int);
create or replace function public.set_online(hours int, area text default null) returns void
language sql security definer set search_path = public as $$
  update public.pros set
    online_until = case when set_online.hours > 0 then now() + make_interval(hours => least(set_online.hours, 12)) else null end,
    online_area = case when set_online.hours > 0 then coalesce(nullif(set_online.area, ''), pros.online_area, pros.area) else pros.online_area end
  where id = auth.uid();
$$;
grant execute on function public.set_online(int, text) to authenticated;

-- ===== migrations/0006_invoices.sql =====
-- Invoices: the pro or the company office bills the client for a booking. NovaFides does not take payments;
-- the invoice shows how to pay (Zelle, card link, check...) and the pro marks it paid.
create sequence if not exists public.invoice_no start 1001;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text unique not null default 'NF-' || nextval('public.invoice_no'),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  pro_id uuid references public.pros (id),
  company_id uuid references public.companies (id),
  client_id uuid not null references public.profiles (id),
  created_by uuid not null references public.profiles (id),
  -- [{ "kind": "labor" | "material" | "fee" | "discount", "description": "...", "qty": 1, "price": 120.00 }]
  items jsonb not null default '[]' check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 40),
  tax_rate numeric(5,3) not null default 0 check (tax_rate between 0 and 15),   -- % on materials (CA sales tax)
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text check (char_length(notes) <= 1000),
  payment_instructions text check (char_length(payment_instructions) <= 500),
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index invoices_client_idx on public.invoices (client_id);
create index invoices_booking_idx on public.invoices (booking_id);

-- Who may bill a booking: its pro, or the office of its company.
create or replace function public.can_bill(b_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bookings b where b.id = b_id
    and (b.pro_id = auth.uid() or (b.company_id is not null and public.is_company_staff(b.company_id))));
$$;

-- Fill parties from the booking and compute totals on the server, so they cannot be faked.
create or replace function public.invoice_before() returns trigger
language plpgsql security definer set search_path = public as $$
declare b public.bookings; sub numeric := 0; mat numeric := 0; it jsonb; line numeric;
begin
  if tg_op = 'UPDATE' and old.status in ('paid', 'void') and new.status = old.status then
    raise exception 'a paid or void invoice cannot be changed';
  end if;
  select * into b from public.bookings where id = new.booking_id;
  new.pro_id := b.pro_id; new.company_id := b.company_id; new.client_id := b.client_id;
  for it in select * from jsonb_array_elements(new.items) loop
    if coalesce(it->>'description', '') = '' or (it->>'qty')::numeric <= 0 or (it->>'qty')::numeric > 1000
       or abs((it->>'price')::numeric) > 100000 or coalesce(it->>'kind', '') not in ('labor', 'material', 'fee', 'discount') then
      raise exception 'invalid invoice line';
    end if;
    line := round((it->>'qty')::numeric * abs((it->>'price')::numeric), 2) * case when it->>'kind' = 'discount' then -1 else 1 end;
    sub := sub + line;
    if it->>'kind' = 'material' then mat := mat + line; end if;
  end loop;
  new.subtotal := sub;
  new.tax := round(mat * new.tax_rate / 100, 2);
  new.total := sub + new.tax;
  if new.total < 0 then raise exception 'total cannot be negative'; end if;
  if new.status = 'sent' and new.issued_at is null then new.issued_at := now(); end if;
  if new.status = 'paid' and new.paid_at is null then new.paid_at := now(); end if;
  return new;
end;
$$;
create trigger invoices_before before insert or update on public.invoices
  for each row execute function public.invoice_before();

create or replace function public.invoice_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'sent' and (tg_op = 'INSERT' or old.status <> 'sent') then
    perform public.notify(new.client_id, format('New invoice %s: $%s.', new.number, to_char(new.total, 'FM999999990.00')), '/invoice/' || new.id);
  end if;
  return new;
end;
$$;
create trigger invoices_after after insert or update on public.invoices
  for each row execute function public.invoice_after();

alter table public.invoices enable row level security;
create policy invoices_billing_read on public.invoices for select using (public.can_bill(booking_id) or public.is_admin());
create policy invoices_client_read on public.invoices for select using (client_id = auth.uid() and status <> 'draft');
create policy invoices_insert on public.invoices for insert with check (public.can_bill(booking_id) and created_by = auth.uid());
create policy invoices_update on public.invoices for update using (public.can_bill(booking_id)) with check (public.can_bill(booking_id));
grant select, insert, update on public.invoices to authenticated;
grant usage on sequence public.invoice_no to authenticated;

-- ===== migrations/0007_calendar.sql =====
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

-- ===== migrations/0008_grants.sql =====
-- Explicit table permissions for the API roles. Newer Supabase projects no longer grant these automatically.
-- Row Level Security (enabled on every table) still decides which rows each user may read or change.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;
-- notify() writes notifications for others; keep it callable only from the database's own functions.
revoke execute on function public.notify(uuid, text, text) from public, anon, authenticated;

-- ===== migrations/0009_handles_cards.sql =====
-- Short addresses (novafides.com/max) and business cards.
-- The pro's handle is pros.slug. Old handles are kept here so printed cards and QR codes keep working after a change.
create table public.pro_handles (
  handle text primary key,
  pro_id uuid not null references public.pros (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.pro_handles enable row level security;
create policy pro_handles_read on public.pro_handles for select using (true);
grant select on public.pro_handles to anon, authenticated;

-- Phone number the pro chooses to print on their own cards (never shown on the website).
alter table public.pro_private add column if not exists card_phone text check (char_length(card_phone) <= 30);

create or replace function public.is_reserved_handle(h text) returns boolean language sql immutable as $$
  select h = any (array['search','companies','company','pro','online','ask','login','join','account','business','admin','messages',
    'invoice','book','rules','api','auth','lang','invite','about','help','support','privacy','terms','contact','blog','pros','novafides',
    'www','app','static','assets','public','settings','signup','signin','logout','dashboard','map','card','cards','qr','new','edit']);
$$;

-- Change my short address. Returns the new handle. The old one keeps pointing to me.
create or replace function public.set_handle(new_handle text) returns text
language plpgsql security definer set search_path = public as $$
declare h text := lower(trim(new_handle)); cur text;
begin
  if h !~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$' or h like '%--%' then raise exception 'handle: 3-30 letters, digits or dashes'; end if;
  if public.is_reserved_handle(h) then raise exception 'handle: this address is reserved'; end if;
  select slug into cur from public.pros where id = auth.uid();
  if cur is null then raise exception 'not a pro'; end if;
  if h = cur then return h; end if;
  if exists (select 1 from public.pros where slug = h) or exists (select 1 from public.companies where slug = h)
     or exists (select 1 from public.pro_handles where handle = h and pro_id <> auth.uid()) then
    raise exception 'handle: this address is taken';
  end if;
  insert into public.pro_handles (handle, pro_id) values (cur, auth.uid()) on conflict (handle) do nothing;
  delete from public.pro_handles where handle = h and pro_id = auth.uid();
  update public.pros set slug = h where id = auth.uid();
  return h;
end;
$$;
grant execute on function public.set_handle(text) to authenticated;

-- ===== migrations/0010_founding_pros.sql =====
-- Launch period: NovaFides charges nothing. Every pro who joins before the subscription start date is a Founding Pro
-- and keeps that mark (and the special terms announced with the start date). When billing is announced, a later
-- migration sets the default to false so new pros are no longer founding.
alter table public.pros add column if not exists founding_pro boolean not null default true;
-- The pro cannot change it themselves (only through this default or an admin).
create or replace function public.protect_founding() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.founding_pro is distinct from old.founding_pro and not public.is_admin() then
    new.founding_pro := old.founding_pro;
  end if;
  if tg_op = 'INSERT' and not public.is_admin() then
    new.founding_pro := (select column_default::boolean from information_schema.columns
                         where table_schema = 'public' and table_name = 'pros' and column_name = 'founding_pro');
  end if;
  return new;
end;
$$;
create trigger pros_protect_founding before insert or update on public.pros
  for each row execute function public.protect_founding();

-- ===== migrations/0011_social.sql =====
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

-- ===== migrations/0012_urgent.sql =====
-- Urgent calls: a pro says "I take urgent calls" (optionally with an extra call-out fee).
-- Clients see the pro as ready for urgent calls only while the pro is also online.
alter table public.pros add column if not exists urgent_ok boolean not null default false;
alter table public.pros add column if not exists urgent_fee numeric(8,2);
alter table public.pros drop constraint if exists pros_urgent_fee_check;
alter table public.pros add constraint pros_urgent_fee_check check (urgent_fee is null or (urgent_fee >= 0 and urgent_fee <= 500));

create or replace function public.set_urgent(take boolean, fee numeric default null) returns void
language sql security definer set search_path = public as $$
  update public.pros set urgent_ok = coalesce(set_urgent.take, false),
    urgent_fee = case when set_urgent.take then set_urgent.fee else pros.urgent_fee end
  where id = auth.uid();
$$;
revoke all on function public.set_urgent(boolean, numeric) from public, anon;
grant execute on function public.set_urgent(boolean, numeric) to authenticated;

-- ===== migrations/0013_figure.sql =====
-- Full-height photo of the pro on a transparent background, shown big on their page with a glow in their clothing colour.
alter table public.pros add column if not exists figure_url text check (figure_url is null or char_length(figure_url) <= 500);

-- ===== migrations/0014_community.sql =====
-- Community: comments on posts, questions answered by verified pros, and the pros-only Lounge.
-- Names shown next to comments/questions are saved when written: pros by their public name,
-- everyone else by first name + last initial ("Anna C."), so clients never expose their full name.

create or replace function public.public_name(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select display_name from public.pros where id = uid),
    (select case when position(' ' in trim(full_name)) > 0
              then split_part(trim(full_name), ' ', 1) || ' ' || left(split_part(trim(full_name), ' ', 2), 1) || '.'
              else nullif(trim(full_name), '') end
       from public.profiles where id = uid),
    'NovaFides member');
$$;

create or replace function public.is_verified_pro(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pros where id = uid and status = 'verified');
$$;

-- Same daily limit helper for every table below.
create or replace function public.daily_count(tbl text, col text, uid uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare n int;
begin
  execute format('select count(*) from public.%I where %I = $1 and created_at > now() - interval ''1 day''', tbl, col) into n using uid;
  return n;
end;
$$;
revoke execute on function public.daily_count(text, text, uuid) from public, anon, authenticated;

-- ───────── comments on feed posts ─────────
create table public.post_comments (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null default '',
  author_slug text,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments (post_id, created_at);
alter table public.post_comments enable row level security;
create policy post_comments_read on public.post_comments for select using (exists (select 1 from public.posts p where p.id = post_id));
create policy post_comments_insert on public.post_comments for insert with check (user_id = auth.uid());
create policy post_comments_delete on public.post_comments for delete using (
  user_id = auth.uid() or public.is_admin() or exists (select 1 from public.posts p where p.id = post_id and p.pro_id = auth.uid()));

create or replace function public.post_comment_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.daily_count('post_comments', 'user_id', new.user_id) >= 40 then raise exception 'comment limit: 40 per day'; end if;
  new.author_name := public.public_name(new.user_id);
  new.author_slug := (select slug from public.pros where id = new.user_id and status = 'verified');
  return new;
end;
$$;
create trigger post_comments_before before insert on public.post_comments for each row execute function public.post_comment_before();

create or replace function public.post_comment_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select pro_id into owner from public.posts where id = new.post_id;
  if owner is distinct from new.user_id then
    perform public.notify(owner, format('%s commented on your post.', new.author_name), '/feed/' || new.post_id);
  end if;
  return new;
end;
$$;
create trigger post_comments_notify after insert on public.post_comments for each row execute function public.post_comment_notify();

-- ───────── questions answered by verified pros ─────────
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null default '',
  trade text check (trade in ('plumbing', 'electrical', 'handyman')),
  city text check (char_length(city) <= 60),
  title text not null check (char_length(title) between 5 and 140),
  body text not null default '' check (char_length(body) <= 2000),
  photos text[] not null default '{}' check (cardinality(photos) <= 4),
  best_answer_id bigint,
  created_at timestamptz not null default now()
);
create index questions_created_idx on public.questions (created_at desc);
alter table public.questions enable row level security;
create policy questions_read on public.questions for select using (true);
create policy questions_insert on public.questions for insert with check (user_id = auth.uid() and best_answer_id is null);
create policy questions_delete on public.questions for delete using (user_id = auth.uid() or public.is_admin());

create or replace function public.question_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.daily_count('questions', 'user_id', new.user_id) >= 5 then raise exception 'question limit: 5 per day'; end if;
  new.author_name := public.public_name(new.user_id);
  return new;
end;
$$;
create trigger questions_before before insert on public.questions for each row execute function public.question_before();

create table public.answers (
  id bigint generated always as identity primary key,
  question_id uuid not null references public.questions (id) on delete cascade,
  pro_id uuid not null references public.pros (id) on delete cascade,
  author_name text not null default '',
  body text not null check (char_length(body) between 2 and 2000),
  created_at timestamptz not null default now(),
  unique (question_id, pro_id)
);
create index answers_q_idx on public.answers (question_id);
alter table public.answers enable row level security;
create policy answers_read on public.answers for select using (true);
create policy answers_insert on public.answers for insert with check (pro_id = auth.uid() and public.is_verified_pro(auth.uid()));
create policy answers_delete on public.answers for delete using (pro_id = auth.uid() or public.is_admin());
alter table public.questions add constraint questions_best_fk foreign key (best_answer_id) references public.answers (id) on delete set null;

create or replace function public.answer_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.daily_count('answers', 'pro_id', new.pro_id) >= 30 then raise exception 'answer limit: 30 per day'; end if;
  new.author_name := public.public_name(new.pro_id);
  return new;
end;
$$;
create trigger answers_before before insert on public.answers for each row execute function public.answer_before();

create or replace function public.answer_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(q.user_id, format('%s answered your question.', new.author_name), '/questions/' || q.id)
    from public.questions q where q.id = new.question_id and q.user_id <> new.pro_id;
  return new;
end;
$$;
create trigger answers_notify after insert on public.answers for each row execute function public.answer_notify();

create table public.answer_votes (
  answer_id bigint not null references public.answers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);
alter table public.answer_votes enable row level security;
create policy answer_votes_read on public.answer_votes for select using (true);
create policy answer_votes_insert on public.answer_votes for insert with check (
  user_id = auth.uid() and not exists (select 1 from public.answers a where a.id = answer_id and a.pro_id = auth.uid()));
create policy answer_votes_delete on public.answer_votes for delete using (user_id = auth.uid());

-- The person who asked picks the most helpful answer (or clears it with null).
create or replace function public.mark_best(q uuid, a bigint) returns void
language plpgsql security definer set search_path = public as $$
declare pro uuid; who text;
begin
  if not exists (select 1 from public.questions where id = q and user_id = auth.uid()) then raise exception 'not your question'; end if;
  if a is not null then
    select pro_id into pro from public.answers where id = a and question_id = q;
    if pro is null then raise exception 'answer not found'; end if;
  end if;
  update public.questions set best_answer_id = a where id = q;
  if pro is not null then
    who := public.public_name(auth.uid());
    perform public.notify(pro, format('%s picked your answer as the best.', who), '/questions/' || q);
  end if;
end;
$$;
grant execute on function public.mark_best(uuid, bigint) to authenticated;

-- ───────── the Lounge: verified pros only ─────────
create table public.lounge_posts (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references public.pros (id) on delete cascade,
  author_name text not null default '',
  author_slug text,
  kind text not null default 'talk' check (kind in ('talk', 'help', 'handoff')),
  trade text check (trade in ('plumbing', 'electrical', 'handyman')),
  city text check (char_length(city) <= 60),
  body text not null check (char_length(body) between 2 and 1500),
  photos text[] not null default '{}' check (cardinality(photos) <= 4),
  created_at timestamptz not null default now()
);
create index lounge_posts_created_idx on public.lounge_posts (created_at desc);
alter table public.lounge_posts enable row level security;
create policy lounge_posts_read on public.lounge_posts for select using (public.is_verified_pro(auth.uid()) or public.is_admin());
create policy lounge_posts_insert on public.lounge_posts for insert with check (pro_id = auth.uid() and public.is_verified_pro(auth.uid()));
create policy lounge_posts_delete on public.lounge_posts for delete using (pro_id = auth.uid() or public.is_admin());

create table public.lounge_replies (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.lounge_posts (id) on delete cascade,
  pro_id uuid not null references public.pros (id) on delete cascade,
  author_name text not null default '',
  author_slug text,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index lounge_replies_post_idx on public.lounge_replies (post_id, created_at);
alter table public.lounge_replies enable row level security;
create policy lounge_replies_read on public.lounge_replies for select using (public.is_verified_pro(auth.uid()) or public.is_admin());
create policy lounge_replies_insert on public.lounge_replies for insert with check (pro_id = auth.uid() and public.is_verified_pro(auth.uid()));
create policy lounge_replies_delete on public.lounge_replies for delete using (pro_id = auth.uid() or public.is_admin());

create or replace function public.lounge_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'lounge_posts' and public.daily_count('lounge_posts', 'pro_id', new.pro_id) >= 10 then raise exception 'lounge limit: 10 posts per day'; end if;
  if tg_table_name = 'lounge_replies' and public.daily_count('lounge_replies', 'pro_id', new.pro_id) >= 60 then raise exception 'lounge limit: 60 replies per day'; end if;
  new.author_name := public.public_name(new.pro_id);
  new.author_slug := (select slug from public.pros where id = new.pro_id);
  return new;
end;
$$;
create trigger lounge_posts_before before insert on public.lounge_posts for each row execute function public.lounge_before();
create trigger lounge_replies_before before insert on public.lounge_replies for each row execute function public.lounge_before();

create or replace function public.lounge_reply_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(p.pro_id, format('%s replied in the Lounge.', new.author_name), '/lounge#' || p.id)
    from public.lounge_posts p where p.id = new.post_id and p.pro_id <> new.pro_id;
  return new;
end;
$$;
create trigger lounge_replies_notify after insert on public.lounge_replies for each row execute function public.lounge_reply_notify();

grant select on public.post_comments, public.questions, public.answers, public.answer_votes to anon, authenticated;
grant insert, delete on public.post_comments, public.questions, public.answers, public.answer_votes, public.lounge_posts, public.lounge_replies to authenticated;
grant select on public.lounge_posts, public.lounge_replies to authenticated;
grant execute on function public.public_name(uuid), public.is_verified_pro(uuid) to anon, authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Chats between two verified pros (colleagues) may share phones and emails freely: no contact warning there.
create or replace function public.message_before() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations;
begin
  select * into c from public.conversations where id = new.conversation_id;
  new.flagged := new.body ~* '(\d{3}[\s.)-]*\d{3}[\s.-]*\d{4})|([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(https?://|www\.)'
    and not (c.pro_id is not null and public.is_verified_pro(c.client_id) and public.is_verified_pro(c.pro_id))
    and not exists (select 1 from public.bookings b where b.client_id = c.client_id
      and (b.pro_id = c.pro_id or b.company_id = c.company_id) and b.status in ('confirmed', 'on_the_way', 'in_progress', 'done'));
  return new;
end;
$$;

-- ===== migrations/0015_pro_controls_neighbors.sql =====
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

-- ===== seed.sql =====
-- generated by scripts/gen-seed.mjs; do not edit by hand
insert into public.services (id, trade, group_name, name, price_low, price_high, unit, needs_permit, emergency, handyman_ok) values
('faucet-replacement','plumbing','Faucets & Sinks','Faucet replacement',250,450,'job',false,false,true),
('kitchen-sink-installation','plumbing','Faucets & Sinks','Kitchen sink installation',450,1100,'job',false,false,false),
('bathroom-vanity-and-sink-installation','plumbing','Faucets & Sinks','Bathroom vanity & sink installation',500,1500,'job',false,false,false),
('garbage-disposal-installation','plumbing','Faucets & Sinks','Garbage disposal installation',350,600,'job',false,false,true),
('garbage-disposal-repair','plumbing','Faucets & Sinks','Garbage disposal repair',150,300,'job',false,true,false),
('shut-off-valve-replacement','plumbing','Faucets & Sinks','Shut-off valve replacement',200,400,'job',false,false,false),
('under-sink-leak-repair','plumbing','Faucets & Sinks','Under-sink leak repair',175,350,'job',false,true,false),
('running-toilet-repair','plumbing','Toilets','Running toilet repair',150,300,'job',false,false,true),
('toilet-installation-replacement','plumbing','Toilets','Toilet installation / replacement',400,700,'job',false,false,false),
('toilet-reseal-wax-ring','plumbing','Toilets','Toilet reseal (wax ring)',200,350,'job',false,false,true),
('clogged-toilet','plumbing','Toilets','Clogged toilet',150,300,'job',false,true,false),
('bidet-seat-installation','plumbing','Toilets','Bidet seat installation',150,350,'job',false,false,true),
('sink-tub-or-shower-drain-clearing','plumbing','Drains & Sewer','Sink, tub or shower drain clearing',175,300,'job',false,true,false),
('main-sewer-line-clearing','plumbing','Drains & Sewer','Main sewer line clearing',300,600,'job',false,true,false),
('hydro-jetting','plumbing','Drains & Sewer','Hydro-jetting',500,1000,'job',false,false,false),
('sewer-camera-inspection','plumbing','Drains & Sewer','Sewer camera inspection',250,450,'job',false,false,false),
('sewer-line-repair-replacement','plumbing','Drains & Sewer','Sewer line repair / replacement',3000,15000,'job',true,false,false),
('cleanout-installation','plumbing','Drains & Sewer','Cleanout installation',800,2500,'job',true,false,false),
('water-heater-repair','plumbing','Water Heaters','Water heater repair',200,500,'job',false,true,false),
('tank-water-heater-replacement','plumbing','Water Heaters','Tank water heater replacement',2200,3800,'job',true,true,false),
('tankless-water-heater-installation','plumbing','Water Heaters','Tankless water heater installation',5000,9000,'job',true,false,false),
('tankless-flush-and-descaling','plumbing','Water Heaters','Tankless flush & descaling',200,350,'job',false,false,false),
('expansion-tank-installation','plumbing','Water Heaters','Expansion tank installation',300,600,'job',true,false,false),
('hot-water-recirculation-pump','plumbing','Water Heaters','Hot water recirculation pump',700,1500,'job',false,false,false),
('leak-detection','plumbing','Pipes & Leaks','Leak detection',250,600,'job',false,true,false),
('pipe-leak-repair','plumbing','Pipes & Leaks','Pipe leak repair',300,900,'job',false,true,false),
('burst-pipe-emergency','plumbing','Pipes & Leaks','Burst pipe emergency',400,1500,'job',false,true,false),
('whole-house-repipe-pex-copper','plumbing','Pipes & Leaks','Whole-house repipe (PEX / copper)',8000,20000,'job',true,false,false),
('pressure-regulator-prv-replacement','plumbing','Pipes & Leaks','Pressure regulator (PRV) replacement',450,900,'job',false,false,false),
('outdoor-spigot-hose-bib-replacement','plumbing','Pipes & Leaks','Outdoor spigot (hose bib) replacement',200,400,'job',false,false,true),
('slab-leak-repair','plumbing','Pipes & Leaks','Slab leak repair',2000,6000,'job',true,false,false),
('shower-valve-cartridge-replacement','plumbing','Showers & Tubs','Shower valve / cartridge replacement',300,800,'job',false,false,false),
('showerhead-or-handheld-shower-install','plumbing','Showers & Tubs','Showerhead or handheld shower install',120,250,'job',false,false,true),
('bathtub-or-shower-installation','plumbing','Showers & Tubs','Bathtub or shower installation',1500,5000,'job',true,false,false),
('tub-and-shower-re-caulking','plumbing','Showers & Tubs','Tub & shower re-caulking',150,350,'job',false,false,true),
('dishwasher-installation','plumbing','Appliances & Water Quality','Dishwasher installation',250,500,'job',false,false,true),
('washing-machine-hookup','plumbing','Appliances & Water Quality','Washing machine hookup',200,400,'job',false,false,true),
('fridge-water-line-ice-maker','plumbing','Appliances & Water Quality','Fridge water line / ice maker',150,300,'job',false,false,true),
('water-filtration-or-softener-installation','plumbing','Appliances & Water Quality','Water filtration or softener installation',500,2500,'job',false,false,false),
('reverse-osmosis-system','plumbing','Appliances & Water Quality','Reverse osmosis system',400,900,'job',false,false,false),
('gas-leak-detection-and-repair','plumbing','Gas','Gas leak detection & repair',250,900,'job',false,true,false),
('gas-line-installation-extension','plumbing','Gas','Gas line installation / extension',600,2500,'job',true,false,false),
('seismic-gas-shut-off-valve','plumbing','Gas','Seismic gas shut-off valve',400,900,'job',true,false,false),
('gas-appliance-hookup-range-dryer','plumbing','Gas','Gas appliance hookup (range, dryer)',200,450,'job',false,false,false),
('backflow-preventer-testing','plumbing','Outdoor & Other','Backflow preventer testing',100,200,'job',false,false,false),
('sump-pump-installation-repair','plumbing','Outdoor & Other','Sump pump installation / repair',500,1500,'job',false,true,false),
('plumbing-diagnostic-visit','plumbing','Outdoor & Other','Plumbing diagnostic visit',125,175,'visit',false,true,false),
('outlet-replacement','electrical','Outlets & Switches','Outlet replacement',150,250,'job',false,false,false),
('gfci-outlet-installation','electrical','Outlets & Switches','GFCI outlet installation',175,300,'job',false,false,false),
('usb-or-smart-outlet','electrical','Outlets & Switches','USB or smart outlet',175,300,'job',false,false,false),
('light-switch-or-dimmer-replacement','electrical','Outlets & Switches','Light switch or dimmer replacement',125,250,'job',false,false,false),
('smart-switch-installation','electrical','Outlets & Switches','Smart switch installation',150,300,'job',false,false,false),
('new-outlet-new-wire-run','electrical','Outlets & Switches','New outlet (new wire run)',250,500,'job',true,false,false),
('light-fixture-replacement','electrical','Lighting','Light fixture replacement',175,350,'job',false,false,false),
('recessed-lighting','electrical','Lighting','Recessed lighting',200,400,'per light',true,false,false),
('ceiling-fan-installation','electrical','Lighting','Ceiling fan installation',300,600,'job',false,false,false),
('chandelier-installation','electrical','Lighting','Chandelier installation',250,600,'job',false,false,false),
('under-cabinet-lighting','electrical','Lighting','Under-cabinet lighting',400,1200,'job',false,false,false),
('outdoor-and-landscape-lighting','electrical','Lighting','Outdoor & landscape lighting',500,2500,'job',true,false,false),
('troubleshooting-tripping-breaker-partial-outage','electrical','Panels & Circuits','Troubleshooting (tripping breaker, partial outage)',200,450,'job',false,true,false),
('breaker-replacement','electrical','Panels & Circuits','Breaker replacement',200,400,'job',false,true,false),
('new-dedicated-circuit','electrical','Panels & Circuits','New dedicated circuit',300,900,'job',true,false,false),
('240v-appliance-circuit-range-dryer-oven','electrical','Panels & Circuits','240V appliance circuit (range, dryer, oven)',500,1500,'job',true,false,false),
('panel-upgrade-100a-to-200a','electrical','Panels & Circuits','Panel upgrade (100A to 200A)',4000,7000,'job',true,false,false),
('subpanel-installation','electrical','Panels & Circuits','Subpanel installation',1500,3500,'job',true,false,false),
('whole-home-surge-protector','electrical','Panels & Circuits','Whole-home surge protector',300,700,'job',false,false,false),
('level-2-ev-charger-installation','electrical','EV & Energy','Level 2 EV charger installation',1200,2200,'job',true,false,false),
('ev-charger-with-panel-upgrade','electrical','EV & Energy','EV charger with panel upgrade',3500,6500,'job',true,false,false),
('generator-transfer-switch-or-interlock','electrical','EV & Energy','Generator transfer switch or interlock',800,2500,'job',true,false,false),
('home-battery-backup-preparation','electrical','EV & Energy','Home battery backup preparation',1500,4000,'job',true,false,false),
('hardwired-smoke-and-co-detectors','electrical','Safety & Old Wiring','Hardwired smoke & CO detectors',150,300,'per device',false,false,false),
('electrical-safety-inspection','electrical','Safety & Old Wiring','Electrical safety inspection',200,450,'visit',false,false,false),
('sparking-outlet-or-burning-smell','electrical','Safety & Old Wiring','Sparking outlet or burning smell',200,500,'job',false,true,false),
('knob-and-tube-wiring-replacement','electrical','Safety & Old Wiring','Knob-and-tube wiring replacement',8000,25000,'job',true,false,false),
('aluminum-wiring-remediation','electrical','Safety & Old Wiring','Aluminum wiring remediation',2000,8000,'job',true,false,false),
('room-rewiring','electrical','Safety & Old Wiring','Room rewiring',1500,4000,'job',true,false,false),
('video-doorbell-installation','electrical','Smart Home & Outdoor','Video doorbell installation',150,300,'job',false,false,true),
('smart-thermostat-installation','electrical','Smart Home & Outdoor','Smart thermostat installation',150,300,'job',false,false,true),
('hot-tub-or-spa-wiring','electrical','Smart Home & Outdoor','Hot tub or spa wiring',1500,3500,'job',true,false,false),
('outdoor-outlet-weatherproof','electrical','Smart Home & Outdoor','Outdoor outlet (weatherproof)',300,700,'job',true,false,false),
('electrical-diagnostic-visit','electrical','Smart Home & Outdoor','Electrical diagnostic visit',125,175,'visit',false,true,false),
('tv-wall-mounting','handyman','Mounting & Hanging','TV wall mounting',150,350,'job',false,false,true),
('shelves-installation','handyman','Mounting & Hanging','Shelves installation',100,250,'job',false,false,true),
('pictures-mirrors-and-art-hanging','handyman','Mounting & Hanging','Pictures, mirrors & art hanging',90,200,'job',false,false,true),
('curtain-rods-and-blinds','handyman','Mounting & Hanging','Curtain rods & blinds',100,300,'job',false,false,true),
('wall-cabinet-mounting','handyman','Mounting & Hanging','Wall cabinet mounting',150,400,'job',false,false,true),
('furniture-assembly','handyman','Furniture & Assembly','Furniture assembly',90,300,'job',false,false,true),
('bed-or-wardrobe-assembly','handyman','Furniture & Assembly','Bed or wardrobe assembly',150,400,'job',false,false,true),
('outdoor-furniture-and-grill-assembly','handyman','Furniture & Assembly','Outdoor furniture & grill assembly',100,300,'job',false,false,true),
('exercise-equipment-assembly','handyman','Furniture & Assembly','Exercise equipment assembly',150,350,'job',false,false,true),
('kids-playset-assembly','handyman','Furniture & Assembly','Kids'' playset assembly',300,800,'job',false,false,true),
('drywall-patch-and-repair','handyman','Walls & Paint','Drywall patch & repair',150,450,'job',false,false,true),
('paint-touch-up-one-wall-or-room','handyman','Walls & Paint','Paint touch-up (one wall or room)',250,900,'job',false,false,true),
('caulking-kitchen-bath-windows','handyman','Walls & Paint','Caulking (kitchen, bath, windows)',120,300,'job',false,false,true),
('wallpaper-removal-small-area','handyman','Walls & Paint','Wallpaper removal (small area)',250,800,'job',false,false,true),
('door-repair-and-adjustment','handyman','Doors & Windows','Door repair & adjustment',120,300,'job',false,false,true),
('door-lock-and-hardware-replacement','handyman','Doors & Windows','Door lock & hardware replacement',120,250,'job',false,false,true),
('interior-door-replacement-pre-hung','handyman','Doors & Windows','Interior door replacement (pre-hung)',300,700,'job',false,false,true),
('weatherstripping','handyman','Doors & Windows','Weatherstripping',120,300,'job',false,false,true),
('window-and-door-screen-repair','handyman','Doors & Windows','Window & door screen repair',90,200,'job',false,false,true),
('cabinet-door-and-drawer-fixes','handyman','Doors & Windows','Cabinet door & drawer fixes',90,250,'job',false,false,true),
('baseboard-and-trim-repair','handyman','Carpentry & Outdoors','Baseboard & trim repair',150,450,'job',false,false,true),
('fence-and-gate-repair','handyman','Carpentry & Outdoors','Fence & gate repair',200,800,'job',false,false,true),
('deck-board-replacement-small-area','handyman','Carpentry & Outdoors','Deck board replacement (small area)',250,900,'job',false,false,true),
('handrail-installation','handyman','Carpentry & Outdoors','Handrail installation',200,600,'job',false,false,true),
('gutter-cleaning','handyman','Carpentry & Outdoors','Gutter cleaning',150,350,'job',false,false,true),
('pressure-washing','handyman','Carpentry & Outdoors','Pressure washing',200,600,'job',false,false,true),
('grout-repair-and-regrouting','handyman','Floors & Tile','Grout repair & regrouting',200,600,'job',false,false,true),
('tile-replacement-a-few-tiles','handyman','Floors & Tile','Tile replacement (a few tiles)',200,500,'job',false,false,true),
('squeaky-floor-fix','handyman','Floors & Tile','Squeaky floor fix',150,400,'job',false,false,true),
('battery-smoke-detector-replacement','handyman','Home Maintenance','Battery smoke detector replacement',90,200,'job',false,false,true),
('hvac-filter-replacement','handyman','Home Maintenance','HVAC filter replacement',90,150,'job',false,false,true),
('childproofing','handyman','Home Maintenance','Childproofing',150,400,'job',false,false,true),
('holiday-lights-installation','handyman','Home Maintenance','Holiday lights installation',200,800,'job',false,false,true),
('small-repairs-hourly','handyman','Home Maintenance','Small repairs (hourly)',80,130,'per hour',false,false,true),
('kitchen-remodel','construction','Remodeling','Kitchen remodel',25000,80000,'job',true,false,false),
('bathroom-remodel','construction','Remodeling','Bathroom remodel',15000,45000,'job',true,false,false),
('interior-wall-removal','construction','Remodeling','Interior wall removal',3000,15000,'job',true,false,false),
('drywall-installation-whole-room','construction','Remodeling','Drywall installation, whole room',1500,5000,'job',false,false,false),
('flooring-installation-per-room','construction','Remodeling','Flooring installation, per room',1500,6000,'job',false,false,false),
('window-replacement','construction','Remodeling','Window replacement',800,2000,'per device',true,false,false),
('adu-construction','construction','Additions & ADUs','ADU construction',150000,400000,'job',true,false,false),
('room-addition','construction','Additions & ADUs','Room addition',80000,250000,'job',true,false,false),
('garage-conversion','construction','Additions & ADUs','Garage conversion',60000,180000,'job',true,false,false),
('deck-building','construction','Exterior & Structure','Deck building',15000,45000,'job',true,false,false),
('new-fence-installation','construction','Exterior & Structure','New fence installation',3000,12000,'job',false,false,false),
('concrete-patio-or-driveway','construction','Exterior & Structure','Concrete patio or driveway',6000,25000,'job',true,false,false),
('foundation-repair','construction','Exterior & Structure','Foundation repair',5000,30000,'job',true,false,false),
('roof-repair','construction','Exterior & Structure','Roof repair',800,4000,'job',false,true,false),
('siding-repair','construction','Exterior & Structure','Siding repair',1000,6000,'job',false,false,false),
('structural-framing-repair','construction','Exterior & Structure','Structural framing repair',2000,15000,'job',true,false,false)
on conflict (id) do update set trade = excluded.trade, group_name = excluded.group_name, name = excluded.name, price_low = excluded.price_low, price_high = excluded.price_high, unit = excluded.unit, needs_permit = excluded.needs_permit, emergency = excluded.emergency, handyman_ok = excluded.handyman_ok;
