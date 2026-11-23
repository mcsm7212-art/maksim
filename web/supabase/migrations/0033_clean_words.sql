-- Keeps rude words out of what clients see: names, own trades, own jobs and categories, bio, experience, skills.
-- English, Spanish and Russian (also Russian typed in Latin letters); common tricks like sh1t or f@ck are undone first.
-- Own trades, jobs and categories must be in Latin letters (profiles are in English).
create or replace function public.bad_text_plain(s text) returns boolean language sql immutable as $$
  select s ~ '(fuck|shit|bitch|cunt|asshole|whore|nigg|fagg|porn|pussy|motherf|mierda|chingad|pendej|cabron|maricon|хуй|хуе|хуя|пизд|бляд|блят|шлюх|дерьм|говн|залуп|пидор|пидар|гандон|pizd|blyad|blyat|pidor|zalup)'
      or s ~ '(^|[^a-zа-я])(cock|cocks|sex|sexy|anal|cum|tits|boobs?|penis|vagina|rape|slut|bastard|retard|nude|ass|puta|puto|culo|verga|joto|pinche|жоп[аыуе]|сук[аи]|мудак|мраз[ьи]|еба[лт]|ебл[аио]|zhop[ae]|suka)($|[^a-zа-я])'
      or s ~ '(^|[^a-zа-я])(ебан|заеб|уеб|выеб|отъеб)'
$$;
create or replace function public.bad_text(t text) returns boolean
language plpgsql immutable as $$
declare s text := translate(lower(translate(coalesce(t, ''), '0134@$5!|', 'oieaassii')), 'ё', 'е'); v text;
begin
  -- a "*" may stand for any vowel (f*ck, sh*t, b*tch): try each
  foreach v in array array['u', 'i', 'a', 'o', 'e'] loop
    if public.bad_text_plain(replace(s, '*', v)) then return true; end if;
  end loop;
  return false;
end;
$$;
grant execute on function public.bad_text(text) to anon, authenticated;
create or replace function public.has_cyrillic(t text) returns boolean language sql immutable as $$ select coalesce(t, '') ~ '[А-Яа-яЁё]' $$;

create or replace function public.pros_clean_words() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if public.bad_text(concat_ws(' ', new.display_name, new.custom_trade, new.bio, new.experience, array_to_string(new.skills, ' '))) then
    raise exception 'inappropriate words';
  end if;
  if public.has_cyrillic(new.custom_trade) then raise exception 'english only: trade'; end if;
  return new;
end;
$$;
drop trigger if exists pros_clean_words on public.pros;
create trigger pros_clean_words before insert or update of display_name, custom_trade, bio, experience, skills on public.pros
  for each row execute function public.pros_clean_words();

create or replace function public.jobs_clean_words() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if public.bad_text(concat_ws(' ', new.name, new.category)) then raise exception 'inappropriate words'; end if;
  if public.has_cyrillic(new.name) or public.has_cyrillic(new.category) then raise exception 'english only: jobs'; end if;
  return new;
end;
$$;
drop trigger if exists pro_custom_services_clean on public.pro_custom_services;
create trigger pro_custom_services_clean before insert or update on public.pro_custom_services for each row execute function public.jobs_clean_words();

create or replace function public.trade_requests_clean() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.bad_text(new.name) then raise exception 'inappropriate words'; end if;
  return new;
end;
$$;
drop trigger if exists trade_requests_clean on public.trade_requests;
create trigger trade_requests_clean before insert on public.trade_requests for each row execute function public.trade_requests_clean();
