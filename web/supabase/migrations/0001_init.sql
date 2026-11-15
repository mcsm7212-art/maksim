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
