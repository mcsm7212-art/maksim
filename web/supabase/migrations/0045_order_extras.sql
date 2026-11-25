-- Orders: when the job was marked done, the pro's warranty, moving a visit to another time,
-- and confirming the job by itself when the client stays silent for 5 days (unless a problem is open).
alter table public.bookings add column if not exists done_at timestamptz;
alter table public.bookings add column if not exists warranty_days int check (warranty_days between 0 and 3650);
alter table public.bookings add column if not exists auto_confirmed boolean not null default false;
update public.bookings b set done_at = coalesce(
  (select max(e.created_at) from public.booking_events e where e.booking_id = b.id and e.type = 'status' and e.payload->>'status' = 'done'), b.starts_at, b.created_at)
where b.status = 'done' and b.done_at is null;

-- Same rules as before, plus: the moment of "done" is kept; the "rate your pro" note is sent by its own trigger.
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
  update public.bookings set status = new_status, done_at = case when new_status = 'done' then now() else done_at end where id = b_id;
  insert into public.booking_events (booking_id, actor_id, type, payload) values (b_id, auth.uid(), 'status', jsonb_build_object('status', new_status));
  if new_status = 'done' and b.service_id is not null and b.pro_id is not null then
    perform set_config('nf.trusted', '1', true);
    insert into public.pro_services (pro_id, service_id, jobs_count) values (b.pro_id, b.service_id, 1)
      on conflict (pro_id, service_id) do update set jobs_count = public.pro_services.jobs_count + 1;
    perform set_config('nf.trusted', '', true);
  end if;
  if new_status = 'on_the_way' then perform public.notify(b.client_id, 'Your pro is on the way.', '/orders/' || b_id); end if;
  if new_status = 'done' and b.pro_id is null then perform public.notify(b.client_id, 'The job is marked done. Please confirm.', '/orders/' || b_id); end if;
end;
$$;

create or replace function public.booking_done_rate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' and new.pro_id is not null then
    perform public.notify(new.client_id, 'Your pro marked the job done. Confirm it and rate your pro: one tap on a star is enough.', '/orders/' || new.id || '#rate');
  end if;
  return null;
end;
$$;

-- The pro states the warranty on the work (in days) while the job is in progress or done.
create or replace function public.set_warranty(b_id uuid, days int) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = b_id for update;
  if b.id is null or not (b.pro_id = auth.uid() or (b.company_id is not null and public.is_company_staff(b.company_id))) then raise exception 'not your job'; end if;
  if b.status not in ('in_progress', 'done') then raise exception 'the job has not started'; end if;
  if days is null or days < 0 or days > 3650 then raise exception 'bad warranty'; end if;
  update public.bookings set warranty_days = days where id = b_id;
  insert into public.booking_events (booking_id, actor_id, type, payload) values (b_id, auth.uid(), 'warranty', jsonb_build_object('days', days));
end;
$$;
grant execute on function public.set_warranty(uuid, int) to authenticated;

-- The client moves a visit to another free time. The pro confirms the new time again.
create or replace function public.reschedule_booking(b_id uuid, starts timestamptz) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = b_id for update;
  if b.id is null or b.client_id <> auth.uid() then raise exception 'not your job'; end if;
  if b.status not in ('requested', 'confirmed') or b.pro_id is null then raise exception 'this visit cannot be moved now'; end if;
  if starts is null or starts < now() + interval '1 hour' then raise exception 'pick a time in the future'; end if;
  if starts = b.starts_at then return; end if;
  update public.bookings set starts_at = starts, status = 'requested' where id = b_id;
  insert into public.booking_events (booking_id, actor_id, type, payload) values (b_id, auth.uid(), 'rescheduled', jsonb_build_object('from', b.starts_at, 'to', starts));
  perform public.notify(b.pro_id, 'The client moved the visit to another time. Please confirm the new time.', '/orders/' || b_id);
end;
$$;
grant execute on function public.reschedule_booking(uuid, timestamptz) to authenticated;

-- Silent client: 5 days after "done" the job counts as confirmed, unless a problem report is open.
create or replace function public.auto_confirm_done() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with x as (
    update public.bookings b set client_confirmed_at = now(), auto_confirmed = true
    where b.status = 'done' and b.client_confirmed_at is null and b.done_at < now() - interval '5 days'
      and not exists (select 1 from public.problems p where p.booking_id = b.id and p.status = 'open')
    returning b.id, b.client_id)
  insert into public.booking_events (booking_id, actor_id, type) select id, client_id, 'auto_confirmed' from x;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.auto_confirm_done() to authenticated;
