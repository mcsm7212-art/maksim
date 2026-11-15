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
