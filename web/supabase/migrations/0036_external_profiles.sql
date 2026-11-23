-- A pro's profiles on other review sites (Yelp, Google, Thumbtack, Nextdoor, Angi): links only, so clients can
-- open them and read the history there. NovaFides never copies ratings or reviews from those sites.
-- An admin checks that each link really is this pro's profile; changing the links removes the "checked" mark.
alter table public.pros add column if not exists ext_links jsonb not null default '{}'::jsonb;
alter table public.pros add column if not exists ext_checked_at timestamptz;

create or replace function public.ext_links_ok(j jsonb) returns boolean language sql immutable as $$
  select jsonb_typeof(j) = 'object' and not exists (
    select 1 from jsonb_each_text(j) e where char_length(e.value) > 400 or not (
      (e.key = 'yelp' and e.value ~* '^https://(www\.|m\.)?yelp\.com/biz/[^ ]+$') or
      (e.key = 'google' and e.value ~* '^https://(www\.google\.com/maps|maps\.google\.com|maps\.app\.goo\.gl|g\.page|g\.co|share\.google)/[^ ]+$') or
      (e.key = 'thumbtack' and e.value ~* '^https://(www\.)?thumbtack\.com/[^ ]+$') or
      (e.key = 'nextdoor' and e.value ~* '^https://(www\.)?nextdoor\.com/pages/[^ ]+$') or
      (e.key = 'angi' and e.value ~* '^https://(www\.)?angi\.com/[^ ]+$')))
$$;
alter table public.pros drop constraint if exists pros_ext_links_check;
alter table public.pros add constraint pros_ext_links_check check (public.ext_links_ok(ext_links));

create or replace function public.pros_ext_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then new.ext_checked_at := null;
  elsif new.ext_links is distinct from old.ext_links then new.ext_checked_at := null;
  else new.ext_checked_at := old.ext_checked_at; end if;
  return new;
end;
$$;
drop trigger if exists pros_ext_guard on public.pros;
create trigger pros_ext_guard before insert or update on public.pros for each row execute function public.pros_ext_guard();
