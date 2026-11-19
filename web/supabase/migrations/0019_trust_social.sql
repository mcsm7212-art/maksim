-- Trust badges with dates, insurance only confirmed by NovaFides, pinned posts and post types, colleague notifications.

-- ───────── when each check was done ─────────
alter table public.pros add column if not exists id_checked_at timestamptz;
alter table public.pros add column if not exists insurance_checked_at timestamptz;
alter table public.pros add column if not exists insurance_claimed boolean not null default false;

-- A pro may say they are insured (shown to the admin); only the admin turns on the "Insured" badge.
create or replace function public.pro_trust_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.insurance_claimed := coalesce(new.insured, false);
    new.insured := case when tg_op = 'INSERT' then false else old.insured end;
    if tg_op = 'UPDATE' then new.insurance_checked_at := old.insurance_checked_at; new.id_checked_at := old.id_checked_at; end if;
  else
    if new.id_verified and (tg_op = 'INSERT' or not old.id_verified) then new.id_checked_at := now(); end if;
    if new.insured and (tg_op = 'INSERT' or not old.insured) then new.insurance_checked_at := now(); end if;
    if not new.id_verified then new.id_checked_at := null; end if;
    if not new.insured then new.insurance_checked_at := null; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists pros_trust_fields on public.pros;
create trigger pros_trust_fields before insert or update of insured, id_verified, insurance_checked_at, id_checked_at on public.pros
  for each row execute function public.pro_trust_fields();
-- existing confirmed checks: use the approval time we have
update public.pros set insurance_claimed = insured where insured and not insurance_claimed;

-- ───────── posts: pinned and a type ─────────
alter table public.posts add column if not exists pinned boolean not null default false;
alter table public.posts add column if not exists tag text not null default 'work' check (tag in ('work', 'tip', 'question', 'partner'));
create policy posts_update on public.posts for update using (pro_id = auth.uid()) with check (pro_id = auth.uid());
grant update on public.posts to authenticated;
create or replace function public.limit_pins() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pinned and not coalesce(old.pinned, false) and (select count(*) from public.posts where pro_id = new.pro_id and pinned and id <> new.id) >= 3 then
    raise exception 'pin limit: 3 pinned posts';
  end if;
  return new;
end;
$$;
drop trigger if exists posts_pins on public.posts;
create trigger posts_pins before update of pinned on public.posts for each row execute function public.limit_pins();

-- ───────── colleagues: the other pro is told, and both see when it is mutual ─────────
create or replace function public.contact_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.colleague_id, format('%s added you as a colleague.', public.public_name(new.pro_id)),
    '/' || (select slug from public.pros where id = new.pro_id));
  return new;
end;
$$;
drop trigger if exists pro_contacts_notify on public.pro_contacts;
create trigger pro_contacts_notify after insert on public.pro_contacts for each row execute function public.contact_notify();

-- Who added me as a colleague (ids only) — to show "mutual".
create or replace function public.added_me() returns setof uuid
language sql stable security definer set search_path = public as $$
  select pro_id from public.pro_contacts where colleague_id = auth.uid();
$$;
grant execute on function public.added_me() to authenticated;
