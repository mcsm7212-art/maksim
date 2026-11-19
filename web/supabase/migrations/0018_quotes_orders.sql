-- Quotes in chat and a clear order flow:
--   pro sends a quote in the chat → client accepts (price agreed) → client picks a time (visit requested)
--   → pro confirms → on the way → in progress → pro marks done → client confirms the job is complete.
-- A changed scope is a new version of the quote; old versions stay in the history.
-- "Report a problem" inside an order goes to the NovaFides team with the order attached.

-- ───────── bookings: a "needs time" step, link to the accepted quote, client confirmation ─────────
do $$ declare r record; begin
  for r in select conname from pg_constraint where conrelid = 'public.bookings'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%assigning%'
  loop execute format('alter table public.bookings drop constraint %I', r.conname); end loop;
end $$;
alter table public.bookings add constraint bookings_status_check
  check (status in ('assigning', 'needs_time', 'requested', 'confirmed', 'on_the_way', 'in_progress', 'done', 'cancelled'));
alter table public.bookings add column if not exists quote_id uuid;
alter table public.bookings add column if not exists client_confirmed_at timestamptz;

-- ───────── quotes ─────────
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  pro_id uuid not null references public.pros (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  service_id text references public.services (id) on delete set null,
  title text not null check (char_length(title) between 3 and 120),
  lines jsonb not null default '[]',
  total numeric(10,2) not null default 0,
  includes text check (char_length(includes) <= 1000),
  notes text check (char_length(notes) <= 1000),
  valid_until date,
  version int not null default 1,
  replaces uuid references public.quotes (id) on delete set null,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'declined', 'replaced', 'withdrawn')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists quotes_conv_idx on public.quotes (conversation_id, created_at);
create index if not exists quotes_booking_idx on public.quotes (booking_id);
alter table public.bookings drop constraint if exists bookings_quote_fk;
alter table public.bookings add constraint bookings_quote_fk foreign key (quote_id) references public.quotes (id) on delete set null;
alter table public.quotes enable row level security;
drop policy if exists quotes_read on public.quotes;
create policy quotes_read on public.quotes for select using (
  client_id = auth.uid() or pro_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.pros p where p.id = pro_id and p.company_id is not null and public.is_company_staff(p.company_id)));
grant select on public.quotes to authenticated;
-- all writes go through the functions below

create or replace function public.send_quote(conv uuid, title text, lines jsonb, includes text default null, notes text default null,
  valid_until date default null, service text default null, booking uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare c public.conversations; b public.bookings; prev public.quotes; q_id uuid; tot numeric := 0; l jsonb; v int := 1;
begin
  select * into c from public.conversations where id = conv;
  if c.id is null or c.pro_id is distinct from auth.uid() or c.peer_id is not null then raise exception 'not your chat'; end if;
  if jsonb_typeof(lines) <> 'array' or jsonb_array_length(lines) not between 1 and 20 then raise exception 'quote needs 1 to 20 lines'; end if;
  for l in select * from jsonb_array_elements(lines) loop
    if coalesce(l->>'kind', '') not in ('labor', 'material', 'trip', 'urgent', 'discount', 'other')
       or char_length(coalesce(l->>'label', '')) not between 1 and 80
       or (l->>'amount')::numeric < 0 or (l->>'amount')::numeric > 500000 then raise exception 'bad quote line'; end if;
    tot := tot + case when l->>'kind' = 'discount' then -1 else 1 end * (l->>'amount')::numeric;
  end loop;
  if tot < 0 then raise exception 'quote total below zero'; end if;
  if service is not null and not exists (select 1 from public.services where id = service) then service := null; end if;
  if booking is not null then
    select * into b from public.bookings where id = booking;
    if b.id is null or b.pro_id is distinct from auth.uid() or b.client_id <> c.client_id or b.status in ('done', 'cancelled') then raise exception 'not your job'; end if;
  end if;
  -- the newest earlier quote in this chat (for this job, or still without a job) becomes the previous version
  select * into prev from public.quotes q where q.conversation_id = conv and q.booking_id is not distinct from booking
    and q.status in ('sent', 'accepted') order by q.created_at desc limit 1;
  if prev.id is not null then v := prev.version + 1; end if;
  update public.quotes set status = 'replaced', decided_at = now() where conversation_id = conv and booking_id is not distinct from booking and status = 'sent';
  insert into public.quotes (conversation_id, booking_id, pro_id, client_id, service_id, title, lines, total, includes, notes, valid_until, version, replaces)
    values (conv, booking, auth.uid(), c.client_id, coalesce(service, b.service_id), send_quote.title, lines, tot,
            nullif(trim(send_quote.includes), ''), nullif(trim(send_quote.notes), ''), send_quote.valid_until, v, prev.id)
    returning id into q_id;
  update public.conversations set last_message_at = now() where id = conv;
  perform public.notify(c.client_id, format('New quote from %s: $%s.', public.public_name(auth.uid()), to_char(tot, 'FM999G999G990D00')), '/messages/' || conv);
  return q_id;
end;
$$;
grant execute on function public.send_quote(uuid, text, jsonb, text, text, date, text, uuid) to authenticated;

-- Client accepts: the price is agreed. A new job waits for the client to pick a time; a changed scope updates the job.
create or replace function public.accept_quote(q_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare q public.quotes; b_id uuid;
begin
  select * into q from public.quotes where id = q_id for update;
  if q.id is null or q.client_id <> auth.uid() then raise exception 'not your quote'; end if;
  if q.status <> 'sent' then raise exception 'quote is no longer open'; end if;
  if q.valid_until is not null and q.valid_until < (now() at time zone 'America/Los_Angeles')::date then raise exception 'quote expired'; end if;
  if q.booking_id is null then
    insert into public.bookings (client_id, pro_id, service_id, status, chosen_by, price_estimate, quote_id)
      values (q.client_id, q.pro_id, q.service_id, 'needs_time', 'client', q.total, q.id) returning id into b_id;
  else
    b_id := q.booking_id;
    update public.quotes set status = 'replaced', decided_at = now() where booking_id = b_id and status = 'accepted';
    update public.bookings set price_estimate = q.total, quote_id = q.id where id = b_id;
  end if;
  update public.quotes set status = 'accepted', decided_at = now(), booking_id = b_id where id = q_id;
  insert into public.booking_events (booking_id, actor_id, type, payload) values (b_id, auth.uid(), 'quote_accepted', jsonb_build_object('quote', q_id, 'total', q.total, 'version', q.version));
  perform public.notify(q.pro_id, format('%s accepted your quote ($%s).', public.public_name(auth.uid()), to_char(q.total, 'FM999G999G990D00')), '/orders/' || b_id);
  return b_id;
end;
$$;
grant execute on function public.accept_quote(uuid) to authenticated;

create or replace function public.decline_quote(q_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q public.quotes;
begin
  select * into q from public.quotes where id = q_id for update;
  if q.id is null or q.client_id <> auth.uid() then raise exception 'not your quote'; end if;
  if q.status <> 'sent' then raise exception 'quote is no longer open'; end if;
  update public.quotes set status = 'declined', decided_at = now() where id = q_id;
  perform public.notify(q.pro_id, format('%s declined your quote.', public.public_name(auth.uid())), '/messages/' || q.conversation_id);
end;
$$;
grant execute on function public.decline_quote(uuid) to authenticated;

create or replace function public.withdraw_quote(q_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.quotes set status = 'withdrawn', decided_at = now() where id = q_id and pro_id = auth.uid() and status = 'sent';
  if not found then raise exception 'quote is no longer open'; end if;
end;
$$;
grant execute on function public.withdraw_quote(uuid) to authenticated;

-- Client picks the visit time (and address) for an agreed job; the pro then confirms as usual.
create or replace function public.set_booking_time(b_id uuid, starts timestamptz, addr text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = b_id for update;
  if b.id is null or b.client_id <> auth.uid() then raise exception 'not your job'; end if;
  if b.status <> 'needs_time' then raise exception 'time already set'; end if;
  if starts is null or starts < now() then raise exception 'pick a time in the future'; end if;
  if char_length(coalesce(trim(addr), '')) < 5 then raise exception 'enter the job address'; end if;
  update public.bookings set starts_at = starts, address = trim(addr), status = 'requested' where id = b_id;
  insert into public.booking_events (booking_id, actor_id, type, payload) values (b_id, auth.uid(), 'time_set', jsonb_build_object('starts_at', starts));
  perform public.notify(b.pro_id, 'The client picked a time. Please confirm the visit.', '/orders/' || b_id);
end;
$$;
grant execute on function public.set_booking_time(uuid, timestamptz, text) to authenticated;

-- Pros cannot move a job forward before a time is picked.
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
  if b.status = 'needs_time' and new_status <> 'cancelled' then raise exception 'the client has not picked a time yet'; end if;
  update public.bookings set status = new_status where id = b_id;
  insert into public.booking_events (booking_id, actor_id, type, payload) values (b_id, auth.uid(), 'status', jsonb_build_object('status', new_status));
  if new_status = 'done' and b.service_id is not null and b.pro_id is not null then
    perform set_config('nf.trusted', '1', true);
    insert into public.pro_services (pro_id, service_id, jobs_count) values (b.pro_id, b.service_id, 1)
      on conflict (pro_id, service_id) do update set jobs_count = public.pro_services.jobs_count + 1;
    perform set_config('nf.trusted', '', true);
  end if;
  if new_status in ('on_the_way', 'done') then
    perform public.notify(b.client_id, case new_status when 'on_the_way' then 'Your pro is on the way.' else 'Your pro marked the job done. Please confirm and rate.' end, '/orders/' || b_id);
  end if;
end;
$$;

-- Client confirms the work is complete.
create or replace function public.confirm_done(b_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = b_id for update;
  if b.id is null or b.client_id <> auth.uid() then raise exception 'not your job'; end if;
  if b.status <> 'done' then raise exception 'the pro has not marked it done yet'; end if;
  if b.client_confirmed_at is not null then return; end if;
  update public.bookings set client_confirmed_at = now() where id = b_id;
  insert into public.booking_events (booking_id, actor_id, type) values (b_id, auth.uid(), 'client_confirmed');
  if b.pro_id is not null then perform public.notify(b.pro_id, 'The client confirmed the job is complete.', '/orders/' || b_id); end if;
end;
$$;
grant execute on function public.confirm_done(uuid) to authenticated;

-- ───────── "Report a problem" on an order ─────────
create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('no_show', 'quality', 'price', 'damage', 'behavior', 'other')),
  body text not null check (char_length(body) between 5 and 2000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution text check (char_length(resolution) <= 1000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists problems_booking_idx on public.problems (booking_id);
create index if not exists problems_open_idx on public.problems (created_at) where status = 'open';
alter table public.problems enable row level security;
create or replace function public.is_booking_party(b_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bookings b where b.id = b_id and (b.client_id = auth.uid() or b.pro_id = auth.uid()
    or (b.company_id is not null and public.is_company_staff(b.company_id))));
$$;
drop policy if exists problems_read on public.problems;
create policy problems_read on public.problems for select using (reporter_id = auth.uid() or public.is_admin() or public.is_booking_party(booking_id));
drop policy if exists problems_insert on public.problems;
create policy problems_insert on public.problems for insert with check (reporter_id = auth.uid() and public.is_booking_party(booking_id) and status = 'open');
drop policy if exists problems_admin on public.problems;
create policy problems_admin on public.problems for update using (public.is_admin()) with check (public.is_admin());
grant select, insert on public.problems to authenticated;
grant update on public.problems to authenticated;

create or replace function public.problem_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.problems where reporter_id = new.reporter_id and created_at > now() - interval '1 day') > 5 then
      raise exception 'problem limit: 5 per day';
    end if;
    select * into b from public.bookings where id = new.booking_id;
    perform public.notify(p.id, 'New problem report on a job.', '/admin') from public.profiles p where p.role = 'admin';
    perform public.notify(x, 'A problem was reported on your job. The NovaFides team will help.', '/orders/' || new.booking_id)
      from unnest(array[b.client_id, b.pro_id]) x where x is not null and x <> new.reporter_id;
  elsif new.status = 'resolved' and old.status = 'open' then
    new.resolved_at := now();
    perform public.notify(new.reporter_id, 'Your problem report was answered.', '/orders/' || new.booking_id);
  end if;
  return new;
end;
$$;
drop trigger if exists problems_after_insert on public.problems;
create trigger problems_after_insert before insert on public.problems for each row execute function public.problem_after();
drop trigger if exists problems_after_update on public.problems;
create trigger problems_after_update before update on public.problems for each row execute function public.problem_after();

-- A finished job frees its time (it already shows as free); only active jobs block double-booking.
drop index if exists public.bookings_no_double;
create unique index bookings_no_double on public.bookings (pro_id, starts_at)
  where status not in ('cancelled', 'done') and pro_id is not null and starts_at is not null;
