-- Service area as a polygon the pro draws on the map (any US place, not only California).
alter table public.pros drop constraint if exists pros_base_lat_check;
alter table public.pros drop constraint if exists pros_base_lng_check;
alter table public.pros drop constraint if exists pros_service_radius_mi_check;
alter table public.pros add constraint pros_base_lat_check check (base_lat between 17 and 72);
alter table public.pros add constraint pros_base_lng_check check (base_lng between -180 and -60);
alter table public.pros add constraint pros_service_radius_mi_check check (service_radius_mi between 1 and 1500);
alter table public.pros add column if not exists service_polygon jsonb
  check (service_polygon is null or (jsonb_typeof(service_polygon) = 'array' and jsonb_array_length(service_polygon) between 3 and 60));
