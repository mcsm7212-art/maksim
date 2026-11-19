-- Terms of Use and Privacy Policy: which version each person accepted, and when.
alter table public.profiles
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;

-- New accounts: the sign-in form sends the accepted version with the sign-up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, terms_version, terms_accepted_at)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'client'),
          nullif(new.raw_user_meta_data ->> 'terms_version', ''),
          case when coalesce(new.raw_user_meta_data ->> 'terms_version', '') <> '' then now() end)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Existing accounts accept the current version when they sign in (the same checkbox).
create or replace function public.accept_terms(v text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if v is null or length(v) > 20 then raise exception 'bad version'; end if;
  update public.profiles set terms_version = v, terms_accepted_at = now()
  where id = auth.uid() and terms_version is distinct from v;
end;
$$;
revoke execute on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;
