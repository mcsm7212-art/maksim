-- "Usually replies in N min": measured from real chats. For each client chat of the last 90 days: time from the
-- client's first message to the pro's first reply. The middle value (median) is shown once there are 3 chats.
create or replace function public.recalc_response(p uuid) returns void
language plpgsql security definer set search_path = public as $$
declare med numeric; n int;
begin
  select percentile_cont(0.5) within group (order by extract(epoch from (answered - asked)) / 60), count(*) into med, n
  from (
    select (select min(m.created_at) from public.messages m where m.conversation_id = c.id and m.sender_id = c.client_id) as asked,
           (select min(m.created_at) from public.messages m where m.conversation_id = c.id and m.sender_id = p) as answered
    from public.conversations c where c.pro_id = p and c.peer_id is null and c.created_at > now() - interval '90 days'
  ) x where asked is not null and answered > asked;
  if n >= 3 then update public.pros set response_minutes = least(greatest(round(med)::int, 1), 2880) where id = p and is_demo is not true; end if;
end;
$$;
revoke all on function public.recalc_response(uuid) from public, anon, authenticated;

create or replace function public.messages_response_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations;
begin
  select * into c from public.conversations where id = new.conversation_id;
  -- only the pro's first reply in a client chat changes the number
  if c.pro_id = new.sender_id and c.peer_id is null
     and not exists (select 1 from public.messages m where m.conversation_id = new.conversation_id and m.sender_id = new.sender_id and m.id <> new.id) then
    perform public.recalc_response(c.pro_id);
  end if;
  return null;
end;
$$;
drop trigger if exists messages_response on public.messages;
create trigger messages_response after insert on public.messages for each row execute function public.messages_response_trg();
