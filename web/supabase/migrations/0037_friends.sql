-- Pro friends: two pros who added each other. A post can be for friends only (photos and news clients do not see).
create or replace function public.is_friend(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
    and exists (select 1 from public.pro_contacts where pro_id = auth.uid() and colleague_id = other)
    and exists (select 1 from public.pro_contacts where pro_id = other and colleague_id = auth.uid());
$$;
grant execute on function public.is_friend(uuid) to authenticated, anon;

alter table public.posts add column if not exists audience text not null default 'public' check (audience in ('public', 'friends'));

drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (
  pro_id = auth.uid() or public.is_admin()
  or (audience = 'public' and exists (select 1 from public.pros p where p.id = pro_id and p.status = 'verified'))
  or (audience = 'friends' and public.is_friend(pro_id)));

-- My friends (mutual), people who added me and wait for an answer, people I added who did not add me back.
create or replace function public.my_friends() returns table (pro_id uuid, kind text)
language sql stable security definer set search_path = public as $$
  select coalesce(a.colleague_id, b.pro_id),
         case when a.colleague_id is not null and b.pro_id is not null then 'friend' when b.pro_id is not null then 'incoming' else 'outgoing' end
  from (select colleague_id from public.pro_contacts where pro_id = auth.uid()) a
  full join (select pro_id from public.pro_contacts where colleague_id = auth.uid()) b on a.colleague_id = b.pro_id;
$$;
grant execute on function public.my_friends() to authenticated;
