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
