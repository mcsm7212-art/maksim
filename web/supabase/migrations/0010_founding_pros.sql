-- Launch period: NovaFides charges nothing. Every pro who joins before the subscription start date is a Founding Pro
-- and keeps that mark (and the special terms announced with the start date). When billing is announced, a later
-- migration sets the default to false so new pros are no longer founding.
alter table public.pros add column if not exists founding_pro boolean not null default true;
-- The pro cannot change it themselves (only through this default or an admin).
create or replace function public.protect_founding() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.founding_pro is distinct from old.founding_pro and not public.is_admin() then
    new.founding_pro := old.founding_pro;
  end if;
  if tg_op = 'INSERT' and not public.is_admin() then
    new.founding_pro := (select column_default::boolean from information_schema.columns
                         where table_schema = 'public' and table_name = 'pros' and column_name = 'founding_pro');
  end if;
  return new;
end;
$$;
create trigger pros_protect_founding before insert or update on public.pros
  for each row execute function public.protect_founding();
