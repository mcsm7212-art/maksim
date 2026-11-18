-- Urgent calls: a pro says "I take urgent calls" (optionally with an extra call-out fee).
-- Clients see the pro as ready for urgent calls only while the pro is also online.
alter table public.pros add column if not exists urgent_ok boolean not null default false;
alter table public.pros add column if not exists urgent_fee numeric(8,2);
alter table public.pros drop constraint if exists pros_urgent_fee_check;
alter table public.pros add constraint pros_urgent_fee_check check (urgent_fee is null or (urgent_fee >= 0 and urgent_fee <= 500));

create or replace function public.set_urgent(take boolean, fee numeric default null) returns void
language sql security definer set search_path = public as $$
  update public.pros set urgent_ok = coalesce(set_urgent.take, false),
    urgent_fee = case when set_urgent.take then set_urgent.fee else pros.urgent_fee end
  where id = auth.uid();
$$;
revoke all on function public.set_urgent(boolean, numeric) from public, anon;
grant execute on function public.set_urgent(boolean, numeric) to authenticated;
