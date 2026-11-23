-- "My trade is not in the list": a pro names their trade; admins see the requests and decide which trades to add next.
create table if not exists public.trade_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
alter table public.trade_requests enable row level security;
drop policy if exists trade_requests_insert on public.trade_requests;
create policy trade_requests_insert on public.trade_requests for insert with check (user_id = auth.uid());
drop policy if exists trade_requests_read on public.trade_requests;
create policy trade_requests_read on public.trade_requests for select using (user_id = auth.uid() or public.is_admin());
grant select, insert on public.trade_requests to authenticated;

-- At most 5 requests per person.
create or replace function public.limit_trade_requests() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.trade_requests where user_id = new.user_id) >= 5 then raise exception 'trade request limit: 5'; end if;
  new.name := btrim(new.name);
  return new;
end;
$$;
drop trigger if exists trade_requests_limit on public.trade_requests;
create trigger trade_requests_limit before insert on public.trade_requests for each row execute function public.limit_trade_requests();
