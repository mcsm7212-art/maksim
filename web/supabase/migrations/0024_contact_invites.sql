-- Contact: a pro may show a phone number and call hours on their page (off by default).
alter table public.pros
  add column if not exists public_phone text check (char_length(public_phone) <= 30),
  add column if not exists call_hours text check (char_length(call_hours) <= 80);

-- Company invites can carry a prefilled profile (the office fills it, the technician checks and finishes it).
alter table public.company_invites add column if not exists prefill jsonb not null default '{}'::jsonb;

create or replace function public.invite_prefill(invite_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select i.prefill from public.company_invites i
  where i.code = invite_code and i.used_by is null and i.expires_at > now();
$$;
revoke execute on function public.invite_prefill(text) from public, anon;
grant execute on function public.invite_prefill(text) to authenticated;
