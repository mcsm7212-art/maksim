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
update public.pro_services set jobs_count = 500, price = 300 where pro_id = auth.uid();
insert into public.pro_services (pro_id, service_id, price, jobs_count) values (auth.uid(), 'running-toilet-repair', 200, 99);
select pg_temp.ok((select jobs_count from public.pro_services where pro_id = auth.uid() and service_id = 'running-toilet-repair') = 0, 'new service starts at 0 jobs');
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
-- 4) double booking, company fill-in, contacts, roles, online toggle
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
insert into public.bookings (client_id, pro_id, company_id, starts_at) values (auth.uid(), '00000000-0000-0000-0000-0000000000a2', null, '2030-01-01 10:00-08');
select pg_temp.ok((select company_id from public.bookings where starts_at = '2030-01-01 10:00-08') = '10000000-0000-0000-0000-000000000001', 'company filled from the chosen technician');
do $$ begin insert into public.bookings (client_id, pro_id, starts_at) values (auth.uid(), '00000000-0000-0000-0000-0000000000a2', '2030-01-01 10:00-08'); raise exception 'FAIL: double';
  exception when unique_violation then null; end $$;
select pg_temp.ok(true, 'same time cannot be booked twice');
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.pro_busy_times('00000000-0000-0000-0000-0000000000a2')) >= 1, 'public sees busy times without client details');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
select pg_temp.ok((select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000c2') = 1, 'technician sees own client contact');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select pg_temp.ok((select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000c2') = 0, 'other pro does not see that client');
select public.set_online(4);
select pg_temp.ok((select online_until > now() from public.pros where id = auth.uid()), 'pro goes online');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
select public.become('pro');
do $$ begin perform public.become('company'); raise exception 'FAIL: role twice'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
select pg_temp.ok((select role from public.profiles where id = auth.uid()) = 'pro', 'client becomes pro once');
-- 5) work photos
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
insert into public.pro_photos (pro_id, url, caption) values (auth.uid(), 'https://x/p1.jpg', 'Water heater install');
insert into public.pro_photos (pro_id, url, kind, booking_id) values (auth.uid(), 'https://x/b1.jpg', 'before', '20000000-0000-0000-0000-000000000002');
do $$ begin insert into public.pro_photos (pro_id, url, kind, booking_id) values (auth.uid(), 'https://x/b2.jpg', 'before', '20000000-0000-0000-0000-000000000001'); raise exception 'FAIL: photo on other job';
  exception when insufficient_privilege then null; end $$;
select pg_temp.ok(true, 'pro cannot attach photos to someone else''s job');
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.pro_photos) = 1, 'public sees portfolio only, not job photos');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select count(*) from public.pro_photos where kind = 'before') = 1, 'client sees before photo of own job');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
do $$ begin delete from public.pro_photos; end $$;
reset role;
select pg_temp.ok((select count(*) from public.pro_photos) = 2, 'other pro cannot delete photos');
-- 6) low rating cool-off, double-blind publishing
reset role;
update public.bookings set status = 'done' where id = '20000000-0000-0000-0000-000000000001';
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
insert into public.reviews (id, booking_id, client_id, pro_id, punctuality, workmanship, cleanliness, communication, pricing, body)
  values ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', auth.uid(), '00000000-0000-0000-0000-0000000000a2', 1, 2, 2, 1, 2, 'Late and messy');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
do $$ begin insert into public.review_replies (review_id, author_id, body) values ('30000000-0000-0000-0000-000000000002', auth.uid(), 'That is not true!'); raise exception 'FAIL: no cool-off';
  exception when others then if sqlerrm not like 'cool-off%' then raise; end if; end $$;
select pg_temp.ok(true, 'pro waits 1 hour before replying to a low rating');
select pg_temp.ok((select count(*) from public.reviews where id = '30000000-0000-0000-0000-000000000002') = 0, 'pro does not see the review before rating the client');
insert into public.client_ratings (booking_id, pro_id, client_id, agreements, access, payment) values ('20000000-0000-0000-0000-000000000001', auth.uid(), '00000000-0000-0000-0000-0000000000c1', 4, 5, 5);
select pg_temp.ok((select count(*) from public.reviews where id = '30000000-0000-0000-0000-000000000002') = 1, 'review published once both sides rated');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select count(*) from public.client_ratings) = 0, 'client cannot see how pro rated them');
-- 7) chat
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
insert into public.conversations (id, client_id, pro_id) values ('40000000-0000-0000-0000-000000000001', auth.uid(), '00000000-0000-0000-0000-0000000000a1');
insert into public.messages (conversation_id, sender_id, body) values ('40000000-0000-0000-0000-000000000001', auth.uid(), 'Hi, can you fix a leak? call me 650-555-1234');
select pg_temp.ok((select flagged from public.messages limit 1), 'phone number before booking is flagged');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select pg_temp.ok((select count(*) from public.messages) = 1, 'pro sees the message');
select pg_temp.ok((select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000c2') = 1, 'pro sees name of client who wrote');
select pg_temp.ok((select count(*) from public.notifications where link like '/messages/%') = 1, 'pro notified about the message');
insert into public.messages (conversation_id, sender_id, body) values ('40000000-0000-0000-0000-000000000001', auth.uid(), 'Sure, tomorrow at 10?');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
select pg_temp.ok((select count(*) from public.messages) = 0, 'other pro cannot read the chat');
do $$ begin insert into public.messages (conversation_id, sender_id, body) values ('40000000-0000-0000-0000-000000000001', auth.uid(), 'spam'); raise exception 'FAIL: outsider wrote';
  exception when insufficient_privilege then null; end $$;
select pg_temp.ok(true, 'outsider cannot write into the chat');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
do $$ begin insert into public.conversations (client_id, pro_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000a1'); raise exception 'FAIL: dup';
  exception when unique_violation then null; end $$;
select pg_temp.ok(true, 'one conversation per client and pro');
-- 8) photo messages
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
insert into public.messages (conversation_id, sender_id, body, photo_url) values ('40000000-0000-0000-0000-000000000001', auth.uid(), '', 'https://x/leak.jpg');
select pg_temp.ok(true, 'photo message without text is allowed');
do $$ begin insert into public.messages (conversation_id, sender_id, body) values ('40000000-0000-0000-0000-000000000001', auth.uid(), ''); raise exception 'FAIL: empty';
  exception when check_violation then null; end $$;
select pg_temp.ok(true, 'empty message without photo is rejected');
-- 9) online area
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select public.set_online(4, 'Redwood City');
select pg_temp.ok((select online_area = 'Redwood City' and online_until > now() from public.pros where id = auth.uid()), 'pro goes online in a chosen city');
select public.set_online(0);
select pg_temp.ok((select online_until is null from public.pros where id = auth.uid()), 'pro goes offline');
-- 10) invoices
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
insert into public.invoices (id, booking_id, created_by, items, tax_rate, subtotal, total, status) values
 ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', auth.uid(),
  '[{"kind":"labor","description":"Faucet install","qty":1,"price":200},{"kind":"material","description":"Faucet","qty":1,"price":100},{"kind":"discount","description":"Trip fee credit","qty":1,"price":95}]',
  9.375, 1, 1, 'draft');
select pg_temp.ok((select total from public.invoices) = 214.38, 'totals computed by server (labor + materials + tax on materials - credit)');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select count(*) from public.invoices) = 0, 'client does not see a draft');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
update public.invoices set status = 'sent';
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select count(*) from public.invoices where status = 'sent') = 1, 'client sees the sent invoice');
select pg_temp.ok((select count(*) from public.notifications where body like 'New invoice NF-%: $214.38.') = 1, 'client notified about the invoice');
update public.invoices set status = 'paid';
select pg_temp.ok((select status from public.invoices) = 'sent', 'client cannot mark an invoice paid');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
do $$ begin insert into public.invoices (booking_id, created_by, items) values ('20000000-0000-0000-0000-000000000002', auth.uid(), '[{"kind":"labor","description":"x","qty":1,"price":1}]'); raise exception 'FAIL: other pro billed';
  exception when insufficient_privilege then null; end $$;
select pg_temp.ok(true, 'another pro cannot bill this job');
select pg_temp.act('00000000-0000-0000-0000-0000000000a0');
select pg_temp.ok((select count(*) from public.invoices) = 1, 'company office sees its technician invoice');
update public.invoices set status = 'paid';
do $$ begin update public.invoices set notes = 'changed'; raise exception 'FAIL: edited paid'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
select pg_temp.ok((select paid_at is not null from public.invoices), 'office marks paid; paid invoice is locked');
-- 11) calendar
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
insert into public.pro_private (pro_id, calendar_token, busy_ics_url) values (auth.uid(), 'tok-abcdefghijklmnopqrstuvwxyz', 'https://calendar.google.com/calendar/ical/secret/basic.ics');
insert into public.pro_busy (pro_id, starts_at, ends_at) values (auth.uid(), '2030-01-02 09:00-08', '2030-01-02 12:00-08');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select pg_temp.ok((select count(*) from public.pro_private) = 0, 'other pros cannot see calendar secrets');
do $$ begin insert into public.pro_busy (pro_id, starts_at, ends_at) values ('00000000-0000-0000-0000-0000000000a2', '2030-01-03 09:00-08', '2030-01-03 10:00-08'); raise exception 'FAIL: wrote busy for other';
  exception when insufficient_privilege then null; end $$;
select pg_temp.ok(true, 'pro cannot add busy times for someone else');
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.pro_busy_ranges('00000000-0000-0000-0000-0000000000a2') where starts_at = '2030-01-02 09:00-08') = 1, 'public sees imported busy range (time only)');
select pg_temp.ok((select count(*) from public.calendar_feed('tok-abcdefghijklmnopqrstuvwxyz')) >= 1, 'calendar app reads jobs with the secret token');
select pg_temp.ok((select count(*) from public.calendar_feed('wrong-token-wrong-token-xx')) = 0, 'wrong token gets nothing');
\echo ALL RULE TESTS PASSED
