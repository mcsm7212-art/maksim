-- Service area on a map: a point (the pro's base) and a radius in miles. Only the pro's own row; shown as a circle, never an exact address.
alter table public.pros
  add column if not exists base_lat numeric(8,5) check (base_lat between 32 and 42.5),
  add column if not exists base_lng numeric(8,5) check (base_lng between -125 and -114),
  add column if not exists service_radius_mi int check (service_radius_mi between 1 and 150);
