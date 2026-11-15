-- Rules test: run after the stub, the migration, seed and grants. Every check raises on failure.
\set ON_ERROR_STOP 1
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000c1','c1@x','{"role":"client","full_name":"Anna"}'),
 ('00000000-0000-0000-0000-0000000000c2','c2@x','{"role":"client"}'),
 ('00000000-0000-0000-0000-0000000000a0','o@x','{"role":"company","full_name":"Owner"}'),
 ('00000000-0000-0000-0000-0000000000a1','t1@x','{"role":"pro"}'),
 ('00000000-0000-0000-0000-0000000000a2','t2@x','{"role":"pro"}'),
 ('00000000-0000-0000-0000-0000000000ad','admin@x','{"role":"client"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

create or replace function pg_temp.act(uid text) returns void language plpgsql as $$
begin
  if uid is null then perform set_config('role', 'anon', false); perform set_config('request.jwt.claim.sub', '', false);
  else perform set_config('role', 'authenticated', false); perform set_config('request.jwt.claim.sub', uid, false); end if;
end $$;
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if cond is not true then raise exception 'FAIL: %', what; end if; raise notice 'ok  %', what; end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- signup trigger
select pg_temp.ok((select count(*) from public.profiles) = 6, 'profiles created on signup');
-- role cannot be self-promoted
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
do $$ begin update public.profiles set role = 'admin' where id = auth.uid(); raise exception 'FAIL: self-promotion'; exception when insufficient_privilege or check_violation then null; when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
select pg_temp.ok((select role from public.profiles where id = auth.uid()) = 'client', 'client cannot make self admin');

-- company signup (pending)
select pg_temp.act('00000000-0000-0000-0000-0000000000a0');
insert into public.companies (id, slug, name, trade, owner_id) values ('10000000-0000-0000-0000-000000000001','bayline','Bayline Plumbing','plumbing', auth.uid());
insert into public.company_members values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'owner');
do $$ begin update public.companies set status = 'verified' where slug = 'bayline'; raise exception 'FAIL: self-verify'; exception when insufficient_privilege then null; end $$;
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.companies) = 0, 'pending company hidden from public, owner cannot self-verify');

-- technicians join by invite
select pg_temp.act('00000000-0000-0000-0000-0000000000a0');
insert into public.company_invites (code, company_id) values ('inv1','10000000-0000-0000-0000-000000000001'), ('inv2','10000000-0000-0000-0000-000000000001');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
insert into public.pros (id, slug, display_name, trade, id_verified) values (auth.uid(), 'mike', 'Mike R.', 'plumbing', false);
do $$ begin update public.pros set id_verified = true where id = auth.uid(); exception when others then null; end $$;
select pg_temp.ok((select not id_verified from public.pros where id = auth.uid()), 'pro cannot self-verify ID');
select public.accept_invite('inv1');
do $$ begin perform public.accept_invite('inv1'); raise exception 'FAIL: reuse'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
select pg_temp.ok(true, 'invite cannot be reused');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
insert into public.pros (id, slug, display_name, trade) values (auth.uid(), 'tom', 'Tom K.', 'plumbing');
select public.accept_invite('inv2');

-- admin verifies
select pg_temp.act('00000000-0000-0000-0000-0000000000ad');
update public.companies set status = 'verified';
update public.pros set status = 'verified', license_status = 'verified', id_verified = true;
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.companies) = 1 and (select count(*) from public.pros) = 2, 'public sees verified company and pros');

-- 1) Request a visit: office assigns, then swaps freely, client notified
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
insert into public.bookings (id, client_id, company_id, service_id, status, chosen_by, day_pref)
 values ('20000000-0000-0000-0000-000000000001', auth.uid(), '10000000-0000-0000-0000-000000000001', 'faucet-replacement', 'assigning', 'office', 'today');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
select pg_temp.ok((select count(*) from public.bookings) = 0, 'other client cannot see the booking');
select pg_temp.act('00000000-0000-0000-0000-0000000000a0');
select pg_temp.ok(public.office_assign('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1', now() + interval '3 hours') = 'assigned', 'office assigns a technician');
select pg_temp.ok(public.office_assign('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a2', null) = 'reassigned', 'office-chosen: office swaps without approval');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select count(*) from public.notifications where body like '%changed your technician: Mike R. → Tom K.%') = 1, 'client notified about the swap');
select pg_temp.ok((select pro_id from public.bookings where id = '20000000-0000-0000-0000-000000000001') = '00000000-0000-0000-0000-0000000000a2', 'client sees assigned technician');

-- 2) Client chose the technician: office can only propose
insert into public.bookings (id, client_id, company_id, pro_id, service_id, chosen_by, starts_at)
 values ('20000000-0000-0000-0000-000000000002', auth.uid(), '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'faucet-replacement', 'client', now() + interval '1 day');
select pg_temp.act('00000000-0000-0000-0000-0000000000a0');
select pg_temp.ok(public.office_assign('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a2', null) = 'proposed', 'client-chosen: office only proposes');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select pro_id from public.bookings where id = '20000000-0000-0000-0000-000000000002') = '00000000-0000-0000-0000-0000000000a1', 'technician unchanged until client agrees');
select public.answer_swap('20000000-0000-0000-0000-000000000002', false);
select pg_temp.ok((select pro_id is not null and swap_proposed_pro is null from public.bookings where id = '20000000-0000-0000-0000-000000000002'), 'client keeps their technician');
-- client cannot change status/pro directly
do $$ begin update public.bookings set pro_id = '00000000-0000-0000-0000-0000000000a2' where id = '20000000-0000-0000-0000-000000000002'; exception when insufficient_privilege then null; end $$;
select pg_temp.ok((select pro_id from public.bookings where id = '20000000-0000-0000-0000-000000000002') = '00000000-0000-0000-0000-0000000000a1', 'direct booking edits blocked');

-- 3) Job done -> verified counter, review, reply
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select public.set_booking_status('20000000-0000-0000-0000-000000000002', 'done');
select pg_temp.ok((select jobs_count from public.pro_services where pro_id = auth.uid() and service_id = 'faucet-replacement') = 1, 'job counter +1 on done');
do $$ begin update public.pro_services set jobs_count = 500 where pro_id = auth.uid(); exception when others then null; end $$;
select pg_temp.ok((select jobs_count from public.pro_services where pro_id = auth.uid() and service_id = 'faucet-replacement') = 1, 'pro cannot inflate job counter');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
do $$ begin insert into public.reviews (booking_id, client_id, pro_id, punctuality, workmanship, cleanliness, communication, pricing)
  values ('20000000-0000-0000-0000-000000000002', auth.uid(), '00000000-0000-0000-0000-0000000000a1', 1,1,1,1,1); raise exception 'FAIL: fake review';
  exception when insufficient_privilege then null; end $$;
select pg_temp.ok(true, 'stranger cannot review');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
insert into public.reviews (id, booking_id, client_id, pro_id, company_id, punctuality, workmanship, cleanliness, communication, pricing, body)
  values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002', auth.uid(), '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001', 5,5,4,5,5, 'Great job');
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.reviews) = 0, 'review hidden until publish date');
reset role; update public.reviews set publish_at = now() - interval '1 minute'; 
select pg_temp.act(null);
select pg_temp.ok((select rating from public.pro_stats where pro_id = '00000000-0000-0000-0000-0000000000a1') = 4.80, 'public rating 4.80 after publish');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
do $$ begin insert into public.review_replies (review_id, author_id, body) values ('30000000-0000-0000-0000-000000000001', auth.uid(), repeat('x', 601)); raise exception 'FAIL: long reply';
  exception when check_violation then null; end $$;
insert into public.review_replies (review_id, author_id, body) values ('30000000-0000-0000-0000-000000000001', auth.uid(), 'Thank you!');
select pg_temp.ok(true, 'reply limited to 600 chars');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
do $$ begin update public.reviews set workmanship = 5; delete from public.reviews; end $$;
reset role;
select pg_temp.ok((select count(*) from public.reviews where cleanliness = 4) = 1, 'pro cannot edit or delete reviews');
\echo ALL RULE TESTS PASSED
