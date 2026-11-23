-- Profiles are written in English (the site translates only its own menus and buttons, never what people type).
-- The database refuses non-Latin letters (Cyrillic, Greek, Hebrew, Arabic, Indic, Chinese, Japanese, Korean …)
-- in everything clients see on a pro or company page. Accented Latin names (Lucía, José, Peña) are fine.
create or replace function public.non_latin(t text) returns boolean language sql immutable as $$
  select coalesce(t, '') ~ '[Ѐ-ԯͰ-Ͽ֐-ۿऀ-෿฀-໿぀-ヿ㐀-鿿가-힯]'
$$;
grant execute on function public.non_latin(text) to anon, authenticated;

create or replace function public.pros_clean_words() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if public.bad_text(concat_ws(' ', new.display_name, new.custom_trade, new.bio, new.experience, array_to_string(new.skills, ' '))) then
    raise exception 'inappropriate words';
  end if;
  if public.non_latin(concat_ws(' ', new.display_name, new.custom_trade, new.bio, new.experience, array_to_string(new.skills, ' '), new.area, array_to_string(new.languages, ' '))) then
    raise exception 'english only: profile';
  end if;
  return new;
end;
$$;
drop trigger if exists pros_clean_words on public.pros;
create trigger pros_clean_words before insert or update of display_name, custom_trade, bio, experience, skills, area, languages on public.pros
  for each row execute function public.pros_clean_words();

create or replace function public.jobs_clean_words() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if public.bad_text(concat_ws(' ', new.name, new.category)) then raise exception 'inappropriate words'; end if;
  if public.non_latin(concat_ws(' ', new.name, new.category)) then raise exception 'english only: jobs'; end if;
  return new;
end;
$$;

create or replace function public.trade_requests_clean() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.bad_text(new.name) then raise exception 'inappropriate words'; end if;
  if public.non_latin(new.name) then raise exception 'english only: trade'; end if;
  return new;
end;
$$;

create or replace function public.companies_clean_words() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if public.bad_text(concat_ws(' ', new.name, new.about, new.city)) then raise exception 'inappropriate words'; end if;
  if public.non_latin(concat_ws(' ', new.name, new.about, new.city)) then raise exception 'english only: company'; end if;
  return new;
end;
$$;
drop trigger if exists companies_clean_words on public.companies;
create trigger companies_clean_words before insert or update of name, about, city on public.companies
  for each row execute function public.companies_clean_words();
