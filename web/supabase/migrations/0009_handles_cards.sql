-- Short addresses (novafides.com/max) and business cards.
-- The pro's handle is pros.slug. Old handles are kept here so printed cards and QR codes keep working after a change.
create table public.pro_handles (
  handle text primary key,
  pro_id uuid not null references public.pros (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.pro_handles enable row level security;
create policy pro_handles_read on public.pro_handles for select using (true);
grant select on public.pro_handles to anon, authenticated;

-- Phone number the pro chooses to print on their own cards (never shown on the website).
alter table public.pro_private add column if not exists card_phone text check (char_length(card_phone) <= 30);

create or replace function public.is_reserved_handle(h text) returns boolean language sql immutable as $$
  select h = any (array['search','companies','company','pro','online','ask','login','join','account','business','admin','messages',
    'invoice','book','rules','api','auth','lang','invite','about','help','support','privacy','terms','contact','blog','pros','novafides',
    'www','app','static','assets','public','settings','signup','signin','logout','dashboard','map','card','cards','qr','new','edit']);
$$;

-- Change my short address. Returns the new handle. The old one keeps pointing to me.
create or replace function public.set_handle(new_handle text) returns text
language plpgsql security definer set search_path = public as $$
declare h text := lower(trim(new_handle)); cur text;
begin
  if h !~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$' or h like '%--%' then raise exception 'handle: 3-30 letters, digits or dashes'; end if;
  if public.is_reserved_handle(h) then raise exception 'handle: this address is reserved'; end if;
  select slug into cur from public.pros where id = auth.uid();
  if cur is null then raise exception 'not a pro'; end if;
  if h = cur then return h; end if;
  if exists (select 1 from public.pros where slug = h) or exists (select 1 from public.companies where slug = h)
     or exists (select 1 from public.pro_handles where handle = h and pro_id <> auth.uid()) then
    raise exception 'handle: this address is taken';
  end if;
  insert into public.pro_handles (handle, pro_id) values (cur, auth.uid()) on conflict (handle) do nothing;
  delete from public.pro_handles where handle = h and pro_id = auth.uid();
  update public.pros set slug = h where id = auth.uid();
  return h;
end;
$$;
grant execute on function public.set_handle(text) to authenticated;
