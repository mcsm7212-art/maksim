-- Job history on a pro's page: every finished job with its date, service, the photos the client allowed to show
-- and the published review. No client name beyond the review signature, no address.
create or replace function public.pro_jobs(p uuid, lim int default 40)
returns table (id uuid, day date, service_id text, rating numeric, review text, author text, before_urls text[], after_urls text[])
language sql stable security definer set search_path = public as $$
  select b.id, (coalesce(b.starts_at, b.created_at) at time zone 'America/Los_Angeles')::date, b.service_id,
    round((r.punctuality + r.workmanship + r.cleanliness + r.communication + r.pricing) / 5.0, 1), left(r.body, 500), r.author_name,
    array(select ph.url from public.pro_photos ph where ph.booking_id = b.id and ph.kind = 'before' and ph.public and not ph.client_hidden order by ph.created_at),
    array(select ph.url from public.pro_photos ph where ph.booking_id = b.id and ph.kind = 'after' and ph.public and not ph.client_hidden order by ph.created_at)
  from public.bookings b
  left join public.reviews r on r.booking_id = b.id and r.publish_at <= now() and not r.hidden
  where b.pro_id = p and b.status = 'done' and exists (select 1 from public.pros x where x.id = p and x.status = 'verified')
  order by 2 desc limit least(greatest(lim, 1), 100);
$$;
grant execute on function public.pro_jobs(uuid, int) to anon, authenticated;

-- When a job is marked done, the client gets a note with a one-tap rating link.
create or replace function public.booking_done_rate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' and new.pro_id is not null then
    perform public.notify(new.client_id, 'The job is done. Rate your pro: one tap on a star is enough.', '/orders/' || new.id || '#rate');
  end if;
  return null;
end;
$$;
drop trigger if exists bookings_done_rate on public.bookings;
create trigger bookings_done_rate after update of status on public.bookings for each row execute function public.booking_done_rate();
