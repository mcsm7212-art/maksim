-- Community: comments on posts, questions answered by verified pros, and the pros-only Lounge.
-- Names shown next to comments/questions are saved when written: pros by their public name,
-- everyone else by first name + last initial ("Anna C."), so clients never expose their full name.

create or replace function public.public_name(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select display_name from public.pros where id = uid),
    (select case when position(' ' in trim(full_name)) > 0
              then split_part(trim(full_name), ' ', 1) || ' ' || left(split_part(trim(full_name), ' ', 2), 1) || '.'
              else nullif(trim(full_name), '') end
       from public.profiles where id = uid),
    'NovaFides member');
$$;

create or replace function public.is_verified_pro(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pros where id = uid and status = 'verified');
$$;

-- Same daily limit helper for every table below.
create or replace function public.daily_count(tbl text, col text, uid uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare n int;
begin
  execute format('select count(*) from public.%I where %I = $1 and created_at > now() - interval ''1 day''', tbl, col) into n using uid;
  return n;
end;
$$;
revoke execute on function public.daily_count(text, text, uuid) from public, anon, authenticated;

-- ───────── comments on feed posts ─────────
create table public.post_comments (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null default '',
  author_slug text,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments (post_id, created_at);
alter table public.post_comments enable row level security;
create policy post_comments_read on public.post_comments for select using (exists (select 1 from public.posts p where p.id = post_id));
create policy post_comments_insert on public.post_comments for insert with check (user_id = auth.uid());
create policy post_comments_delete on public.post_comments for delete using (
  user_id = auth.uid() or public.is_admin() or exists (select 1 from public.posts p where p.id = post_id and p.pro_id = auth.uid()));

create or replace function public.post_comment_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.daily_count('post_comments', 'user_id', new.user_id) >= 40 then raise exception 'comment limit: 40 per day'; end if;
  new.author_name := public.public_name(new.user_id);
  new.author_slug := (select slug from public.pros where id = new.user_id and status = 'verified');
  return new;
end;
$$;
create trigger post_comments_before before insert on public.post_comments for each row execute function public.post_comment_before();

create or replace function public.post_comment_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select pro_id into owner from public.posts where id = new.post_id;
  if owner is distinct from new.user_id then
    perform public.notify(owner, format('%s commented on your post.', new.author_name), '/feed/' || new.post_id);
  end if;
  return new;
end;
$$;
create trigger post_comments_notify after insert on public.post_comments for each row execute function public.post_comment_notify();

-- ───────── questions answered by verified pros ─────────
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null default '',
  trade text check (trade in ('plumbing', 'electrical', 'handyman')),
  city text check (char_length(city) <= 60),
  title text not null check (char_length(title) between 5 and 140),
  body text not null default '' check (char_length(body) <= 2000),
  photos text[] not null default '{}' check (cardinality(photos) <= 4),
  best_answer_id bigint,
  created_at timestamptz not null default now()
);
create index questions_created_idx on public.questions (created_at desc);
alter table public.questions enable row level security;
create policy questions_read on public.questions for select using (true);
create policy questions_insert on public.questions for insert with check (user_id = auth.uid() and best_answer_id is null);
create policy questions_delete on public.questions for delete using (user_id = auth.uid() or public.is_admin());

create or replace function public.question_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.daily_count('questions', 'user_id', new.user_id) >= 5 then raise exception 'question limit: 5 per day'; end if;
  new.author_name := public.public_name(new.user_id);
  return new;
end;
$$;
create trigger questions_before before insert on public.questions for each row execute function public.question_before();

create table public.answers (
  id bigint generated always as identity primary key,
  question_id uuid not null references public.questions (id) on delete cascade,
  pro_id uuid not null references public.pros (id) on delete cascade,
  author_name text not null default '',
  body text not null check (char_length(body) between 2 and 2000),
  created_at timestamptz not null default now(),
  unique (question_id, pro_id)
);
create index answers_q_idx on public.answers (question_id);
alter table public.answers enable row level security;
create policy answers_read on public.answers for select using (true);
create policy answers_insert on public.answers for insert with check (pro_id = auth.uid() and public.is_verified_pro(auth.uid()));
create policy answers_delete on public.answers for delete using (pro_id = auth.uid() or public.is_admin());
alter table public.questions add constraint questions_best_fk foreign key (best_answer_id) references public.answers (id) on delete set null;

create or replace function public.answer_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.daily_count('answers', 'pro_id', new.pro_id) >= 30 then raise exception 'answer limit: 30 per day'; end if;
  new.author_name := public.public_name(new.pro_id);
  return new;
end;
$$;
create trigger answers_before before insert on public.answers for each row execute function public.answer_before();

create or replace function public.answer_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(q.user_id, format('%s answered your question.', new.author_name), '/questions/' || q.id)
    from public.questions q where q.id = new.question_id and q.user_id <> new.pro_id;
  return new;
end;
$$;
create trigger answers_notify after insert on public.answers for each row execute function public.answer_notify();

create table public.answer_votes (
  answer_id bigint not null references public.answers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);
alter table public.answer_votes enable row level security;
create policy answer_votes_read on public.answer_votes for select using (true);
create policy answer_votes_insert on public.answer_votes for insert with check (
  user_id = auth.uid() and not exists (select 1 from public.answers a where a.id = answer_id and a.pro_id = auth.uid()));
create policy answer_votes_delete on public.answer_votes for delete using (user_id = auth.uid());

-- The person who asked picks the most helpful answer (or clears it with null).
create or replace function public.mark_best(q uuid, a bigint) returns void
language plpgsql security definer set search_path = public as $$
declare pro uuid; who text;
begin
  if not exists (select 1 from public.questions where id = q and user_id = auth.uid()) then raise exception 'not your question'; end if;
  if a is not null then
    select pro_id into pro from public.answers where id = a and question_id = q;
    if pro is null then raise exception 'answer not found'; end if;
  end if;
  update public.questions set best_answer_id = a where id = q;
  if pro is not null then
    who := public.public_name(auth.uid());
    perform public.notify(pro, format('%s picked your answer as the best.', who), '/questions/' || q);
  end if;
end;
$$;
grant execute on function public.mark_best(uuid, bigint) to authenticated;

-- ───────── the Lounge: verified pros only ─────────
create table public.lounge_posts (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references public.pros (id) on delete cascade,
  author_name text not null default '',
  author_slug text,
  kind text not null default 'talk' check (kind in ('talk', 'help', 'handoff')),
  trade text check (trade in ('plumbing', 'electrical', 'handyman')),
  city text check (char_length(city) <= 60),
  body text not null check (char_length(body) between 2 and 1500),
  photos text[] not null default '{}' check (cardinality(photos) <= 4),
  created_at timestamptz not null default now()
);
create index lounge_posts_created_idx on public.lounge_posts (created_at desc);
alter table public.lounge_posts enable row level security;
create policy lounge_posts_read on public.lounge_posts for select using (public.is_verified_pro(auth.uid()) or public.is_admin());
create policy lounge_posts_insert on public.lounge_posts for insert with check (pro_id = auth.uid() and public.is_verified_pro(auth.uid()));
create policy lounge_posts_delete on public.lounge_posts for delete using (pro_id = auth.uid() or public.is_admin());

create table public.lounge_replies (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.lounge_posts (id) on delete cascade,
  pro_id uuid not null references public.pros (id) on delete cascade,
  author_name text not null default '',
  author_slug text,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index lounge_replies_post_idx on public.lounge_replies (post_id, created_at);
alter table public.lounge_replies enable row level security;
create policy lounge_replies_read on public.lounge_replies for select using (public.is_verified_pro(auth.uid()) or public.is_admin());
create policy lounge_replies_insert on public.lounge_replies for insert with check (pro_id = auth.uid() and public.is_verified_pro(auth.uid()));
create policy lounge_replies_delete on public.lounge_replies for delete using (pro_id = auth.uid() or public.is_admin());

create or replace function public.lounge_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'lounge_posts' and public.daily_count('lounge_posts', 'pro_id', new.pro_id) >= 10 then raise exception 'lounge limit: 10 posts per day'; end if;
  if tg_table_name = 'lounge_replies' and public.daily_count('lounge_replies', 'pro_id', new.pro_id) >= 60 then raise exception 'lounge limit: 60 replies per day'; end if;
  new.author_name := public.public_name(new.pro_id);
  new.author_slug := (select slug from public.pros where id = new.pro_id);
  return new;
end;
$$;
create trigger lounge_posts_before before insert on public.lounge_posts for each row execute function public.lounge_before();
create trigger lounge_replies_before before insert on public.lounge_replies for each row execute function public.lounge_before();

create or replace function public.lounge_reply_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(p.pro_id, format('%s replied in the Lounge.', new.author_name), '/lounge#' || p.id)
    from public.lounge_posts p where p.id = new.post_id and p.pro_id <> new.pro_id;
  return new;
end;
$$;
create trigger lounge_replies_notify after insert on public.lounge_replies for each row execute function public.lounge_reply_notify();

grant select on public.post_comments, public.questions, public.answers, public.answer_votes to anon, authenticated;
grant insert, delete on public.post_comments, public.questions, public.answers, public.answer_votes, public.lounge_posts, public.lounge_replies to authenticated;
grant select on public.lounge_posts, public.lounge_replies to authenticated;
grant execute on function public.public_name(uuid), public.is_verified_pro(uuid) to anon, authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Chats between two verified pros (colleagues) may share phones and emails freely: no contact warning there.
create or replace function public.message_before() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations;
begin
  select * into c from public.conversations where id = new.conversation_id;
  new.flagged := new.body ~* '(\d{3}[\s.)-]*\d{3}[\s.-]*\d{4})|([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(https?://|www\.)'
    and not (c.pro_id is not null and public.is_verified_pro(c.client_id) and public.is_verified_pro(c.pro_id))
    and not exists (select 1 from public.bookings b where b.client_id = c.client_id
      and (b.pro_id = c.pro_id or b.company_id = c.company_id) and b.status in ('confirmed', 'on_the_way', 'in_progress', 'done'));
  return new;
end;
$$;
