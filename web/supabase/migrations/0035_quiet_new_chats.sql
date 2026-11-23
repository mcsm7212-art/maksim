-- While a pro is not taking new jobs, a NEW client can still write (after a warning on the site),
-- but the chat is "quiet": the pro gets no notification until they take jobs again or answer.
-- Clients the pro already worked with (a booking) or already chatted with are never quiet.
alter table public.conversations add column if not exists quiet boolean not null default false;

create or replace function public.conversation_quiet() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.quiet := new.pro_id is not null and new.peer_id is null and not public.pro_accepting(new.pro_id)
    and not exists (select 1 from public.bookings b where b.pro_id = new.pro_id and b.client_id = new.client_id);
  return new;
end;
$$;
drop trigger if exists conversations_quiet on public.conversations;
create trigger conversations_quiet before insert on public.conversations for each row execute function public.conversation_quiet();

create or replace function public.message_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations; who text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  update public.conversations set last_message_at = new.created_at,
    -- the pro answered: from now on it is a normal chat
    quiet = case when c.quiet and new.sender_id = c.pro_id then false else quiet end
  where id = c.id;
  who := public.public_name(new.sender_id);
  if c.peer_id is not null then
    perform public.notify(case when new.sender_id = c.client_id then c.peer_id else c.client_id end, format('New message from %s.', who), '/messages/' || c.id);
  elsif new.sender_id = c.client_id then
    -- quiet chat while the pro is not taking jobs: no notification
    if c.pro_id is not null and not (c.quiet and not public.pro_accepting(c.pro_id)) then
      perform public.notify(c.pro_id, format('New message from %s.', who), '/messages/' || c.id);
    end if;
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
