-- Going online with a place and a radius. The place is rounded to about 1 km before it is saved:
-- clients see only an approximate area, never the pro's exact position.
alter table public.pros add column if not exists online_lat numeric(6,2);
alter table public.pros add column if not exists online_lng numeric(7,2);
alter table public.pros add column if not exists online_radius_mi int check (online_radius_mi between 1 and 60);
alter table public.pros add column if not exists online_live boolean not null default false; -- the pro lets the page refresh the area while driving

create or replace function public.set_online_spot(hours int, lat numeric default null, lng numeric default null, radius int default null, live boolean default false, area text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if lat is not null and (lat not between 17 and 72 or lng not between -180 and -60) then raise exception 'place out of range'; end if;
  update public.pros set
    online_until = case when hours > 0 then now() + make_interval(hours => least(hours, 12)) else null end,
    online_area = case when hours > 0 then coalesce(nullif(left(set_online_spot.area, 60), ''), pros.online_area, pros.area) else pros.online_area end,
    online_lat = case when hours > 0 then round(lat, 2) else null end,
    online_lng = case when hours > 0 then round(lng, 2) else null end,
    online_radius_mi = case when hours > 0 and lat is not null then least(greatest(coalesce(radius, 10), 1), 60) else null end,
    online_live = hours > 0 and lat is not null and coalesce(live, false)
  where id = auth.uid();
end;
$$;
grant execute on function public.set_online_spot(int, numeric, numeric, int, boolean, text) to authenticated;

-- While online with "update while I drive": move the approximate area (nothing else changes).
create or replace function public.move_online_spot(lat numeric, lng numeric, area text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if lat not between 17 and 72 or lng not between -180 and -60 then raise exception 'place out of range'; end if;
  update public.pros set online_lat = round(lat, 2), online_lng = round(lng, 2), online_area = coalesce(nullif(left(move_online_spot.area, 60), ''), pros.online_area)
  where id = auth.uid() and online_live and online_until > now();
end;
$$;
grant execute on function public.move_online_spot(numeric, numeric, text) to authenticated;
