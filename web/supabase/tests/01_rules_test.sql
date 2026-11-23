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
-- 12) short addresses
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select pg_temp.ok(public.set_handle('Mike-Plumber') = 'mike-plumber', 'pro picks a short address');
select pg_temp.ok((select pro_id from public.pro_handles where handle = 'mike') = auth.uid(), 'old address keeps pointing to the pro');
do $$ begin perform public.set_handle('search'); raise exception 'FAIL: reserved'; exception when others then if sqlerrm not like 'handle:%' then raise; end if; end $$;
select pg_temp.ok(true, 'site words like "search" are reserved');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
do $$ begin perform public.set_handle('mike'); raise exception 'FAIL: took old handle'; exception when others then if sqlerrm not like 'handle:%' then raise; end if; end $$;
select pg_temp.ok(true, 'nobody can take another pro''s old address');
do $$ begin perform public.set_handle('a'); raise exception 'FAIL: short'; exception when others then if sqlerrm not like 'handle:%' then raise; end if; end $$;
select pg_temp.ok(true, 'too short address rejected');
-- 13) founding pros
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
update public.pros set founding_pro = false where id = auth.uid();
select pg_temp.ok((select founding_pro from public.pros where id = auth.uid()), 'pros who joined at launch are Founding Pros and cannot remove or fake it');
-- 14) social
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
insert into public.pro_saves (user_id, pro_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000a1');
insert into public.pro_saves (user_id, pro_id, status) values (auth.uid(), '00000000-0000-0000-0000-0000000000a2', 'hidden');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
select pg_temp.ok((select count(*) from public.pro_saves) = 0, 'nobody sees another person''s saved or hidden pros');
select pg_temp.ok((select saves from public.save_counts(array['00000000-0000-0000-0000-0000000000a1'::uuid])) = 1, 'public sees only the number of saves');
do $$ begin insert into public.posts (pro_id, body) values ('00000000-0000-0000-0000-0000000000a1', 'fake'); raise exception 'FAIL: client posted as pro';
  exception when insufficient_privilege then null; end $$;
select pg_temp.ok(true, 'a client cannot post as a pro');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
insert into public.posts (id, pro_id, body) values ('60000000-0000-0000-0000-000000000001', auth.uid(), 'New tankless heater in San Carlos');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select count(*) from public.notifications where body like 'New post from%') = 1, 'people who saved the pro are notified about a new post');
insert into public.post_likes (post_id, user_id) values ('60000000-0000-0000-0000-000000000001', auth.uid());
do $$ begin insert into public.post_likes (post_id, user_id) values ('60000000-0000-0000-0000-000000000001', auth.uid()); raise exception 'FAIL: double like';
  exception when unique_violation then null; end $$;
select pg_temp.ok(true, 'one like per person');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
insert into public.posts (pro_id, body) values (auth.uid(), 'two'), (auth.uid(), 'three');
do $$ begin insert into public.posts (pro_id, body) values (auth.uid(), 'four'); raise exception 'FAIL: spam';
  exception when others then if sqlerrm not like 'post limit%' then raise; end if; end $$;
select pg_temp.ok(true, 'max 3 posts per day');
insert into public.pro_recommendations (pro_id, colleague_id, note) values (auth.uid(), '00000000-0000-0000-0000-0000000000a2', 'Great for drains');
do $$ begin insert into public.pro_recommendations (pro_id, colleague_id) values (auth.uid(), auth.uid()); raise exception 'FAIL: self rec';
  exception when check_violation then null; end $$;
select pg_temp.ok(true, 'a pro cannot recommend themselves');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
select pg_temp.ok((select count(*) from public.notifications where body like '%recommends you%') = 1, 'the colleague is notified about the recommendation');
do $$ begin insert into public.pro_recommendations (pro_id, colleague_id) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2'); raise exception 'FAIL: rec as other';
  exception when insufficient_privilege or unique_violation then null; end $$;
select pg_temp.ok(true, 'nobody can recommend on behalf of another pro');
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.popular_pros(8)) >= 1, 'popular pros list works for visitors');
-- 15) urgent calls
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select public.set_urgent(true, 75);
select pg_temp.ok((select urgent_ok and urgent_fee = 75 from public.pros where id = auth.uid()), 'a pro turns on urgent calls with a call-out fee');
do $$ begin perform public.set_urgent(true, 9999); raise exception 'FAIL: huge urgent fee';
  exception when check_violation then null; end $$;
select pg_temp.ok(true, 'urgent fee is capped at $500');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select public.set_urgent(true, 10);
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.pros where urgent_ok) = 1, 'a client cannot switch on urgent calls for anyone; visitors can see who takes them');
-- 16) community: comments, questions & answers, the Lounge
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
insert into public.post_comments (post_id, user_id, body) values ('60000000-0000-0000-0000-000000000001', auth.uid(), 'Looks great!');
select pg_temp.ok((select author_name from public.post_comments limit 1) = 'Anna', 'comment shows a short public name');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
delete from public.post_comments;
select pg_temp.ok((select count(*) from public.post_comments) = 1, 'nobody deletes someone else''s comment');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select pg_temp.ok((select count(*) from public.notifications where body like '%commented on your post.') = 1, 'pro is notified about a comment');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
insert into public.questions (id, user_id, trade, title, body) values ('70000000-0000-0000-0000-000000000001', auth.uid(), 'plumbing', 'Why do my pipes bang?', 'When I close the tap.');
do $$ begin insert into public.answers (question_id, pro_id, body) values ('70000000-0000-0000-0000-000000000001', auth.uid(), 'fake'); raise exception 'FAIL: client answered';
  exception when insufficient_privilege or foreign_key_violation then null; end $$;
select pg_temp.ok(true, 'only verified pros answer questions');
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.questions) = 1, 'visitors can read questions');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
insert into public.answers (id, question_id, pro_id, body) overriding system value values (900, '70000000-0000-0000-0000-000000000001', auth.uid(), 'Water hammer: add an arrestor.');
do $$ begin insert into public.answers (question_id, pro_id, body) values ('70000000-0000-0000-0000-000000000001', auth.uid(), 'again'); raise exception 'FAIL: two answers';
  exception when unique_violation then null; end $$;
select pg_temp.ok(true, 'one answer per pro per question');
do $$ begin insert into public.answer_votes (answer_id, user_id) values (900, auth.uid()); raise exception 'FAIL: self vote';
  exception when insufficient_privilege then null; end $$;
select pg_temp.ok(true, 'a pro cannot upvote their own answer');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
insert into public.answer_votes (answer_id, user_id) values (900, auth.uid());
do $$ begin perform public.mark_best('70000000-0000-0000-0000-000000000001', 900); raise exception 'FAIL: stranger picked best';
  exception when others then if sqlerrm not like 'not your question%' then raise; end if; end $$;
select pg_temp.ok(true, 'only the asker picks the best answer');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select count(*) from public.notifications where body like '%answered your question.') = 1, 'asker is notified about an answer');
select public.mark_best('70000000-0000-0000-0000-000000000001', 900);
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
select pg_temp.ok((select count(*) from public.notifications where body like '%picked your answer as the best.') = 1, 'pro is notified when picked as best');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
insert into public.lounge_posts (id, pro_id, kind, body) values ('80000000-0000-0000-0000-000000000001', auth.uid(), 'handoff', 'Have a panel job in Belmont next week, need an electrician.');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
insert into public.lounge_replies (post_id, pro_id, body) values ('80000000-0000-0000-0000-000000000001', auth.uid(), 'I can take it.');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select count(*) from public.lounge_posts) = 0, 'clients cannot see the pros Lounge');
do $$ begin insert into public.lounge_posts (pro_id, body) values (auth.uid(), 'hello'); raise exception 'FAIL: client posted in lounge';
  exception when insufficient_privilege or foreign_key_violation then null; end $$;
select pg_temp.ok(true, 'clients cannot post in the Lounge');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select pg_temp.ok((select count(*) from public.lounge_replies) = 1 and (select count(*) from public.notifications where body like '%replied in the Lounge.') = 1, 'pros read Lounge replies and get notified');
-- 17) taking jobs, colleague chat settings, neighbors, construction
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select public.set_accepting(false, null);
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
do $$ begin insert into public.bookings (client_id, company_id, pro_id, service_id, chosen_by, starts_at)
  values (auth.uid(), '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'faucet-replacement', 'client', now() + interval '2 days');
  raise exception 'FAIL: booked a paused pro';
exception when others then if sqlerrm not like 'pro not accepting%' then raise; end if; end $$;
select pg_temp.ok(true, 'a pro who paused jobs cannot be booked');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select public.set_accepting(false, (now() - interval '1 day')::date);
select pg_temp.ok(public.pro_accepting(auth.uid()), 'a pause with an end date ends by itself');
select public.set_accepting(true, null);
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
update public.pros set colleague_chat = 'off' where id = auth.uid();
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
do $$ begin insert into public.conversations (client_id, pro_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000a2'); raise exception 'FAIL: wrote to closed colleague';
  exception when others then if sqlerrm not like 'colleague chat closed%' then raise; end if; end $$;
select pg_temp.ok(true, 'colleague chat off: other pros cannot start a chat');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
update public.pros set colleague_chat = 'contacts' where id = auth.uid();
insert into public.pro_contacts (pro_id, colleague_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000a1');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
insert into public.conversations (id, client_id, pro_id) values ('90000000-0000-0000-0000-000000000001', auth.uid(), '00000000-0000-0000-0000-0000000000a2');
insert into public.messages (conversation_id, sender_id, body) values ('90000000-0000-0000-0000-000000000001', auth.uid(), 'My cell is 650 555 0100');
select pg_temp.ok((select not flagged from public.messages where body like 'My cell%'), 'only colleagues in my list: they can write, phones allowed');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
update public.pros set colleague_chat = 'off' where id = auth.uid();
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
do $$ begin insert into public.messages (conversation_id, sender_id, body) values ('90000000-0000-0000-0000-000000000001', auth.uid(), 'hello?'); raise exception 'FAIL: wrote after off';
  exception when others then if sqlerrm not like 'colleague chat closed%' then raise; end if; end $$;
select pg_temp.ok(true, 'turning colleague chat off also stops old chats');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
insert into public.neighbor_settings (user_id, open, city, scope, interests) values (auth.uid(), true, 'San Carlos', 'city', '{electrical}');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
insert into public.neighbor_settings (user_id, open, city, street, scope) values (auth.uid(), true, 'San Carlos', 'Elm St', 'street');
select pg_temp.ok((select count(*) from public.my_neighbors()) = 0, 'street circle: a neighbor without the same street is not shown');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select count(*) from public.neighbor_settings) = 1, 'nobody reads other people''s neighbor settings');
update public.neighbor_settings set street = ' elm st' where user_id = auth.uid();
select pg_temp.ok((select street from public.my_neighbors() limit 1) = 'Elm St', 'same street: neighbors find each other');
insert into public.conversations (id, client_id, peer_id) values ('90000000-0000-0000-0000-000000000002', auth.uid(), '00000000-0000-0000-0000-0000000000c2');
insert into public.messages (conversation_id, sender_id, body) values ('90000000-0000-0000-0000-000000000002', auth.uid(), 'Hi neighbor!');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
select pg_temp.ok((select count(*) from public.messages where conversation_id = '90000000-0000-0000-0000-000000000002') = 1
  and (select count(*) from public.notifications where body like 'New message from Anna%') = 1, 'neighbor gets the message and a notification');
insert into public.neighbor_blocks (user_id, blocked_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000c1');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
do $$ begin insert into public.messages (conversation_id, sender_id, body) values ('90000000-0000-0000-0000-000000000002', auth.uid(), 'hello?'); raise exception 'FAIL: wrote after block';
  exception when others then if sqlerrm not like 'neighbor chat closed%' then raise; end if; end $$;
select pg_temp.ok(true, 'a blocked neighbor cannot write any more');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
do $$ begin insert into public.conversations (client_id, peer_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000a1'); raise exception 'FAIL: chat with non-neighbor';
  exception when others then if sqlerrm not like 'neighbor chat closed%' then raise; end if; end $$;
select pg_temp.ok(true, 'no chat with people who are not matched neighbors');
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.services where trade = 'construction') >= 10, 'construction services are in the catalog');
-- 18) job photos in the portfolio, photo-search allowance
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
insert into public.pro_photos (id, pro_id, url, kind, booking_id) values ('a0000000-0000-0000-0000-000000000001', auth.uid(), 'https://x/after.jpg', 'after', '20000000-0000-0000-0000-000000000002');
select pg_temp.ok((select service_id from public.pro_photos where id = 'a0000000-0000-0000-0000-000000000001') = 'faucet-replacement', 'job photos are tagged with the job''s service');
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.pro_photos where id = 'a0000000-0000-0000-0000-000000000001') = 0, 'job photos are private by default');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
update public.pro_photos set public = true where id = 'a0000000-0000-0000-0000-000000000001';
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.pro_photos where id = 'a0000000-0000-0000-0000-000000000001') = 1, 'a pro can show a job photo on their page');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select public.hide_job_photos('20000000-0000-0000-0000-000000000002');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
update public.pro_photos set public = true where id = 'a0000000-0000-0000-0000-000000000001';
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.pro_photos where id = 'a0000000-0000-0000-0000-000000000001') = 0, 'the client can hide job photos, and the pro cannot show them again');
select pg_temp.ok(public.photo_search_quota('t', 2) and public.photo_search_quota('t', 2) and not public.photo_search_quota('t', 2), 'photo search has a daily allowance');
-- 19) parts installed on jobs
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
do $$ begin insert into public.job_parts (booking_id, pro_id, brand, part_no, name) values ('20000000-0000-0000-0000-000000000002', auth.uid(), 'Grohe', '47678000', 'cartridge'); raise exception 'FAIL: part on someone else''s job';
  exception when insufficient_privilege then null; end $$;
select pg_temp.ok(true, 'a pro records parts only on their own jobs');
update public.bookings set status = 'done' where id = '20000000-0000-0000-0000-000000000001';
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
insert into public.job_parts (booking_id, pro_id, brand, part_no, name) values ('20000000-0000-0000-0000-000000000001', auth.uid(), 'Grohe', '47 678 000', 'Pressure balance cartridge');
select pg_temp.act(null);
select pg_temp.ok((select exact from public.parts_lookup(array['G47678000'], null, null)) and (select exact from public.parts_lookup(array['47-678-000'], null, null)) and (select count(*) from public.parts_lookup(array['678000'], null, null)) = 1 and (select count(*) from public.parts_lookup(array['999'], null, null)) = 0, 'part number lookup ignores spaces, dashes and a brand prefix');
select pg_temp.ok((select count(*) from public.parts_lookup('{}', 'GROHE', 'shower pressure balance cartridge')) = 1, 'lookup by brand and part words works for visitors');
-- 20) quotes in chat → agreed price → time → done → client confirms; problem reports
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
insert into public.conversations (id, client_id, pro_id) values ('91000000-0000-0000-0000-000000000001', auth.uid(), '00000000-0000-0000-0000-0000000000a1');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
create temp table qv (n int, id uuid);
grant all on qv to authenticated;
insert into qv select 1, public.send_quote('91000000-0000-0000-0000-000000000001', 'Replace shower cartridge',
  '[{"kind":"labor","label":"Labor","amount":250},{"kind":"material","label":"Cartridge","amount":120},{"kind":"discount","label":"First visit","amount":20}]', 'Old part removed', null, null, 'shower-valve-cartridge-replacement');
select pg_temp.ok((select total from public.quotes where id = (select id from qv where n = 1)) = 350, 'quote total is computed by the server (discount subtracted)');
insert into qv select 2, public.send_quote('91000000-0000-0000-0000-000000000001', 'Replace shower cartridge + stops', '[{"kind":"labor","label":"Labor","amount":300},{"kind":"material","label":"Cartridge and stops","amount":150}]');
select pg_temp.ok((select status from public.quotes where id = (select id from qv where n = 1)) = 'replaced' and (select version from public.quotes where id = (select id from qv where n = 2)) = 2, 'a new quote is a new version; the old one stays as replaced');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
select pg_temp.ok((select count(*) from public.quotes) = 0, 'other people cannot see a quote');
do $$ begin perform public.accept_quote((select id from qv where n = 2)); raise exception 'FAIL: stranger accepted';
  exception when others then if sqlerrm not like 'not your quote%' then raise; end if; end $$;
select pg_temp.ok(true, 'only the client can accept a quote');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
do $$ begin perform public.accept_quote((select id from qv where n = 1)); raise exception 'FAIL: accepted old version';
  exception when others then if sqlerrm not like 'quote is no longer open%' then raise; end if; end $$;
insert into qv select 3, public.accept_quote((select id from qv where n = 2));
select pg_temp.ok((select status = 'needs_time' and price_estimate = 450 from public.bookings where id = (select id from qv where n = 3)), 'accepting creates a job with the agreed price that still needs a time');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
do $$ begin perform public.set_booking_status((select id from qv where n = 3), 'confirmed'); raise exception 'FAIL: confirmed without time';
  exception when others then if sqlerrm not like '%not picked a time%' then raise; end if; end $$;
select pg_temp.ok(true, 'the pro cannot confirm before the client picks a time');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select public.set_booking_time((select id from qv where n = 3), now() + interval '3 days', '100 Main St, San Carlos');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select public.set_booking_status((select id from qv where n = 3), 'confirmed');
select public.set_booking_status((select id from qv where n = 3), 'done');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select public.confirm_done((select id from qv where n = 3));
select pg_temp.ok((select client_confirmed_at is not null from public.bookings where id = (select id from qv where n = 3)), 'the client confirms the finished job');
insert into public.problems (booking_id, reporter_id, kind, body) values ((select id from qv where n = 3), auth.uid(), 'quality', 'The shower still drips.');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select pg_temp.ok((select count(*) from public.problems) = 1 and (select count(*) from public.notifications where body like 'A problem was reported%') = 1, 'the pro sees the problem report and is notified');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
select pg_temp.ok((select count(*) from public.problems) = 0, 'outsiders cannot see problem reports');
-- 21) trust fields, pinned posts, colleague notifications
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
update public.pros set insured = true where id = auth.uid();
select pg_temp.ok((select not insured and insurance_claimed from public.pros where id = auth.uid()), 'a pro cannot give themselves the Insured badge (only a claim)');
update public.posts set pinned = true where pro_id = auth.uid();
select pg_temp.ok((select count(*) from public.posts where pinned) = 3, 'a pro pins up to 3 posts') ;
-- 22) demo profiles cannot be booked; work requests are private to the two sides
select pg_temp.act(null);
reset role;
update public.pros set is_demo = true where id = '00000000-0000-0000-0000-0000000000a2';
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
do $$ begin insert into public.bookings (client_id, pro_id, service_id, chosen_by, starts_at) values (auth.uid(), '00000000-0000-0000-0000-0000000000a2', 'faucet-replacement', 'client', now() + interval '5 days');
  raise exception 'FAIL: booked a demo profile';
exception when others then if sqlerrm not like 'demo profile%' then raise; end if; end $$;
select pg_temp.ok(true, 'demo profiles cannot be booked');
insert into public.work_requests (client_id, pro_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000a1');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
select pg_temp.ok((select count(*) from public.work_requests) = 0, 'others cannot see who asked a pro');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
update public.pros set is_demo = false where id = auth.uid();
select pg_temp.ok((select is_demo from public.pros where id = auth.uid()), 'a pro cannot remove the demo label');
-- 23) honest rating: patterns count less, honest one-off negatives count in full, helpful votes
select pg_temp.act(null);
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000b1','b1@x','{"role":"pro"}'), ('00000000-0000-0000-0000-0000000000b2','b2@x','{"role":"pro"}'), ('00000000-0000-0000-0000-0000000000b3','b3@x','{"role":"pro"}'),
 ('00000000-0000-0000-0000-0000000000e1','e1@x','{"role":"client"}'), ('00000000-0000-0000-0000-0000000000e2','e2@x','{"role":"client"}'), ('00000000-0000-0000-0000-0000000000e3','e3@x','{"role":"client"}'),
 ('00000000-0000-0000-0000-0000000000e4','e4@x','{"role":"client"}'), ('00000000-0000-0000-0000-0000000000e5','e5@x','{"role":"client"}'), ('00000000-0000-0000-0000-0000000000e6','e6@x','{"role":"client"}'),
 ('00000000-0000-0000-0000-0000000000e7','e7@x','{"role":"client"}');
set session_replication_role = replica;
insert into public.pros (id, slug, display_name, trade) select ('00000000-0000-0000-0000-0000000000' || p)::uuid, 'rate-' || p, 'Pro ' || p, 'plumbing' from unnest(array['b1','b2','b3']) p;
insert into public.bookings (id, client_id, pro_id, service_id, status, chosen_by, starts_at)
select ('5' || c || p || '000-0000-0000-0000-000000000000')::uuid, ('00000000-0000-0000-0000-0000000000' || c)::uuid, ('00000000-0000-0000-0000-0000000000' || p)::uuid,
       'faucet-replacement', 'done', 'client', now() - interval '3 days'
from unnest(array['e1','e2','e3','e4','e5','e6','e7']) c, unnest(array['b1','b2','b3']) p;
set session_replication_role = origin;
create or replace function pg_temp.rv(c text, p text, sc int) returns void language sql as $$
  insert into public.reviews (id, booking_id, client_id, pro_id, punctuality, workmanship, cleanliness, communication, pricing, publish_at)
  values (('6' || c || p || '000-0000-0000-0000-000000000000')::uuid, ('5' || c || p || '000-0000-0000-0000-000000000000')::uuid,
          ('00000000-0000-0000-0000-0000000000' || c)::uuid, ('00000000-0000-0000-0000-0000000000' || p)::uuid, sc, sc, sc, sc, sc, now() - interval '1 minute') $$;
create or replace function pg_temp.w(c text, p text) returns numeric language sql as $$
  select weight from public.reviews where id = ('6' || c || p || '000-0000-0000-0000-000000000000')::uuid $$;
select pg_temp.rv(c, p, 5) from unnest(array['e1','e2','e3']) c, unnest(array['b1','b2','b3']) p;
select pg_temp.rv('e4', 'b3', 5); select pg_temp.rv('e4', 'b1', 1); select pg_temp.rv('e4', 'b2', 1);
select pg_temp.ok(pg_temp.w('e4','b1') = 0 and pg_temp.w('e4','b2') = 0 and pg_temp.w('e4','b3') = 0
  and (select bool_and(needs_review and weight_reason = 'competitor') from public.reviews where client_id = '00000000-0000-0000-0000-0000000000e4'),
  'praising one pro while trashing well-rated others: not counted, sent to the moderator');
select pg_temp.rv('e5', 'b1', 1);
select pg_temp.ok(pg_temp.w('e5','b1') = 1, 'an honest one-off negative review counts in full');
select pg_temp.rv('e6', 'b1', 2); select pg_temp.rv('e6', 'b2', 2); select pg_temp.rv('e6', 'b3', 2);
select pg_temp.ok(pg_temp.w('e6','b1') = 0.25 and (select weight_reason from public.reviews where id = '6e6b1000-0000-0000-0000-000000000000') = 'harsh',
  'an author who is always far below everyone else counts 25%');
update public.reviews set resolved = true where id = '6e5b1000-0000-0000-0000-000000000000';
select pg_temp.ok(pg_temp.w('e5','b1') = 0.5, 'a low review resolved with the pro counts 50%');
select pg_temp.act('00000000-0000-0000-0000-0000000000e7');
insert into public.reviews (id, booking_id, client_id, pro_id, punctuality, workmanship, cleanliness, communication, pricing, weight, helpful_count, needs_review)
  values ('6e7b1000-0000-0000-0000-000000000000', '5e7b1000-0000-0000-0000-000000000000', auth.uid(), '00000000-0000-0000-0000-0000000000b1', 5,5,5,5,5, 0, 99, true);
select pg_temp.ok((select weight = 1 and helpful_count = 0 and not needs_review from public.reviews where id = '6e7b1000-0000-0000-0000-000000000000'), 'a client cannot set the weight or helpful count');
do $$ begin perform public.admin_review_decide('6e6b1000-0000-0000-0000-000000000000', 'count'); raise exception 'FAIL: client decided';
  exception when others then if sqlerrm not like 'not allowed%' then raise; end if; end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000ad');
select public.admin_review_decide('6e6b1000-0000-0000-0000-000000000000', 'count');
select pg_temp.act(null); reset role;
update public.reviews set publish_at = now() - interval '1 minute' where pro_id = '00000000-0000-0000-0000-0000000000b1';
update public.reviews set pricing = 2 where id = '6e6b2000-0000-0000-0000-000000000000';
select pg_temp.ok(pg_temp.w('e6','b1') = 1 and (select not needs_review from public.reviews where id = '6e6b1000-0000-0000-0000-000000000000'), 'a moderator decision stays after recalculation');
update public.pros set status = 'verified' where id::text like '%0000b_';
select pg_temp.act(null);
select pg_temp.ok((select rating = 4.09 and reviews = 7 and not_full = 2 from public.pro_stats where pro_id = '00000000-0000-0000-0000-0000000000b1'),
  'the public rating is weighted (4.09, not 3.43); every review still shows');
select pg_temp.ok((select abs(rank_score - 4.2) < abs(rating - 4.2) from public.pro_stats where pro_id = '00000000-0000-0000-0000-0000000000b1'), 'search order uses a cautious (Bayesian) score');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
insert into public.review_helpful (review_id) values ('6e5b1000-0000-0000-0000-000000000000');
select pg_temp.ok((select helpful_count from public.reviews where id = '6e5b1000-0000-0000-0000-000000000000') = 1, 'a reader marks a review helpful');
do $$ begin insert into public.review_helpful (review_id) values ('6e5b1000-0000-0000-0000-000000000000'); raise exception 'FAIL: voted twice';
  exception when unique_violation then null; end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
do $$ begin insert into public.review_helpful (review_id) values ('6e5b1000-0000-0000-0000-000000000000'); raise exception 'FAIL: own vote';
  exception when insufficient_privilege then null; end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
do $$ begin insert into public.review_helpful (review_id) values ('6e5b1000-0000-0000-0000-000000000000'); raise exception 'FAIL: pro vote';
  exception when insufficient_privilege then null; end $$;
select pg_temp.ok(true, 'one vote per person; not the author, not the pro');
-- 24) terms: the version accepted at sign-up is saved; existing accounts accept on sign-in
select pg_temp.act(null); reset role;
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000f1','f1@x','{"role":"client","terms_version":"2026-11-19"}');
select pg_temp.ok((select terms_version = '2026-11-19' and terms_accepted_at is not null from public.profiles where id = '00000000-0000-0000-0000-0000000000f1'), 'sign-up saves the accepted terms version');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
select public.accept_terms('2026-11-19');
select pg_temp.ok((select terms_version = '2026-11-19' from public.profiles where id = auth.uid()), 'an existing account accepts the current terms');
select pg_temp.act(null);
do $$ begin perform public.accept_terms('2026-11-19'); raise exception 'FAIL: anon accepted';
  exception when insufficient_privilege then null; when others then if sqlerrm not like 'sign in first%' then raise; end if; end $$;
select pg_temp.ok(true, 'visitors cannot call accept_terms');
-- 25) discovery: similar clients, saved searches, client projects confirmed by the pro, client card
select pg_temp.act(null); reset role;
update public.pros set trade = 'electrical' where id = '00000000-0000-0000-0000-0000000000b3';
select pg_temp.act('00000000-0000-0000-0000-0000000000e7');
select pg_temp.ok((select count(*) from public.similar_picks('electrical') where pro_id = '00000000-0000-0000-0000-0000000000b3' and n >= 3) = 1,
  'clients who like the same plumber as me lead to an electrician they like (3+ clients agree)');
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
select pg_temp.ok((select count(*) from public.similar_picks(null)) = 0, 'no picks without my own likes');
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.also_chosen('00000000-0000-0000-0000-0000000000b1')) = 2, 'a pro page shows what their clients also choose');
do $$ begin perform * from public.client_likes(); raise exception 'FAIL: likes are public';
  exception when insufficient_privilege then null; end $$;
select pg_temp.ok(true, 'who likes whom stays private');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
insert into public.saved_searches (trade, city) values ('plumbing', 'San Mateo');
select pg_temp.act(null); reset role;
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000b9','b9@x','{"role":"pro"}');
insert into public.pros (id, slug, display_name, trade, area, status) values ('00000000-0000-0000-0000-0000000000b9', 'new-sm', 'New Pro', 'plumbing', 'San Mateo', 'verified');
select pg_temp.ok((select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-0000000000c1' and body like 'New verified pro on NovaFides: New Pro.') = 1,
  'a saved search tells the client about a new verified pro in their city');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
insert into public.client_projects (id, client_id, pro_id, body, photos, status) values ('92000000-0000-0000-0000-000000000001', auth.uid(), '00000000-0000-0000-0000-0000000000a1', 'New kitchen faucet', array['https://x/p.jpg'], 'confirmed');
select pg_temp.ok((select status from public.client_projects where id = '92000000-0000-0000-0000-000000000001') = 'pending', 'a client project starts as pending');
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.client_projects) = 0, 'a pending project is not public');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
do $$ begin insert into public.client_projects (client_id, pro_id, photos) values (auth.uid(), '00000000-0000-0000-0000-0000000000b1', array['x']); raise exception 'FAIL: pro posted a client project';
  exception when others then if sqlerrm not like 'only clients%' then raise; end if; end $$;
select public.decide_project('92000000-0000-0000-0000-000000000001', true);
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.client_projects where status = 'confirmed') = 1, 'after the pro confirms, the project is public');
select pg_temp.ok((select projects = 1 and not is_pro from public.client_card('00000000-0000-0000-0000-0000000000c1')), 'the client card shows confirmed projects');
-- 26) invites carry a prefilled profile; only signed-in people can read it, and only while the invite is valid
select pg_temp.act(null); reset role;
insert into public.company_invites (code, company_id, role, prefill) values ('pref1', '10000000-0000-0000-0000-000000000001', 'technician', '{"name":"Joe Tech","trade":"plumbing"}');
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
select pg_temp.ok((select public.invite_prefill('pref1') ->> 'name') = 'Joe Tech', 'a technician sees the profile the office prepared');
select pg_temp.act(null);
do $$ begin perform public.invite_prefill('pref1'); raise exception 'FAIL: anon read prefill';
  exception when insufficient_privilege then null; end $$;
select pg_temp.ok(true, 'visitors cannot read invite details');
-- 27) a pro's own services; without a license nothing over $1,000
select pg_temp.act(null); reset role;
update public.pros set license_no = null, company_id = null where id = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
insert into public.pro_custom_services (pro_id, name, price) values (auth.uid(), 'Garage shelving', 400);
do $$ begin insert into public.pro_custom_services (pro_id, name, price) values (auth.uid(), 'Whole kitchen', 5000); raise exception 'FAIL: unlicensed big job';
  exception when others then if sqlerrm not like 'license needed%' then raise; end if; end $$;
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.pro_custom_services) = 1, 'own services are public; without a license nothing over $1,000');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
do $$ begin insert into public.pro_custom_services (pro_id, name, price) values ('00000000-0000-0000-0000-0000000000b2', 'Fake', 10); raise exception 'FAIL: wrote another pro''s service';
  exception when insufficient_privilege then null; end $$;
select pg_temp.ok(true, 'only the pro edits their own services');

-- 0028 trade requests: own insert, private to the author and admins
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
insert into public.trade_requests (name) values ('  Roofing ');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select count(*) from public.trade_requests) = 0, 'other people do not see trade requests');
do $$ begin insert into public.trade_requests (user_id, name) values ('00000000-0000-0000-0000-0000000000b2', 'Fake'); raise exception 'FAIL: wrote a request for someone else';
  exception when insufficient_privilege then null; end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
select pg_temp.ok((select name from public.trade_requests) = 'Roofing', 'a pro asks for a new trade (name trimmed)');

-- 0029 own trade: 'other' needs a name; categories on own services; limit 60; $1,000 or more needs a license
reset role;
do $$ begin update public.pros set trade = 'other' where id = '00000000-0000-0000-0000-0000000000b2'; raise exception 'FAIL: other trade without a name';
  exception when check_violation then null; end $$;
update public.pros set trade = 'other', custom_trade = 'Roofing' where id = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
insert into public.pro_custom_services (pro_id, name, price, category) values (auth.uid(), 'Shingle repair', 450, ' Repairs ');
select pg_temp.ok((select category from public.pro_custom_services where name = 'Shingle repair') = 'Repairs', 'own trade: jobs grouped in own categories');
do $$ begin insert into public.pro_custom_services (pro_id, name, price) values (auth.uid(), 'Exactly a grand', 1000); raise exception 'FAIL: $1,000 without a license';
  exception when others then if sqlerrm not like 'license needed%' then raise; end if; end $$;
select pg_temp.ok(true, '$1,000 or more needs a CSLB license');

-- 0030 license check: no self-verification, no swapping a checked number, new numbers wait for the admin
select pg_temp.act(null);
reset role;
update public.pros set license_no = '1121547', license_status = 'verified' where id = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
do $$ begin update public.pros set license_no = '9999999' where id = auth.uid(); raise exception 'FAIL: swapped a checked license';
  exception when others then if sqlerrm not like 'license number changes%' then raise; end if; end $$;
do $$ begin perform public.submit_license('12ab'); raise exception 'FAIL: bad format accepted';
  exception when others then if sqlerrm not like 'license format%' then raise; end if; end $$;
select public.submit_license('1234567');
select pg_temp.ok((select license_no||'/'||license_status from public.pros where id = auth.uid()) = '1234567/pending', 'a new license number waits for the admin check');

-- 0031 CSLB list: the typed number is compared with the list automatically; pros cannot read the list or fake the result
select pg_temp.act(null);
reset role;
insert into public.cslb_licenses (license_no, name, status, classes, expires) values
  ('1234567', 'SMITH JOHN', 'CLEAR', '{C36}', current_date + 300), ('7654321', 'OLD CO', 'CLEAR', '{C36}', current_date - 1), ('5555555', 'SPARKS', 'CLEAR', '{C10}', current_date + 300);
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
select pg_temp.act(null); reset role; update public.pros set trade = 'plumbing', custom_trade = null where id = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
select public.submit_license('1234567');
select pg_temp.ok((select license_auto->>'result' from public.pros where id = auth.uid()) = 'ok', 'CSLB list: an active C-36 license fits a plumber');
select public.submit_license('7654321');
select pg_temp.ok((select license_auto->>'result' from public.pros where id = auth.uid()) = 'inactive', 'CSLB list: an expired license is marked');
select public.submit_license('5555555');
select pg_temp.ok((select license_auto->>'result' from public.pros where id = auth.uid()) = 'class', 'CSLB list: an electrical license does not fit a plumber');
select public.submit_license('99999');
select pg_temp.ok((select license_auto->>'result' from public.pros where id = auth.uid()) = 'not_found', 'CSLB list: an unknown number is marked not found');
update public.pros set license_auto = '{"result":"ok"}' where id = auth.uid();
select pg_temp.ok((select license_auto->>'result' from public.pros where id = auth.uid()) = 'not_found', 'a pro cannot fake the CSLB result');
select pg_temp.ok((select count(*) from public.cslb_licenses) = 0, 'pros cannot read the CSLB list directly');

-- 0032 a $1,000+ own job with a license number that is still being checked waits for approval and is hidden from clients
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
insert into public.pro_custom_services (pro_id, name, price) values (auth.uid(), 'Full repipe', 6000);
select pg_temp.ok((select needs_approval from public.pro_custom_services where name = 'Full repipe'), 'big job with a pending license waits for approval');
select pg_temp.act(null);
select pg_temp.ok((select count(*) from public.pro_custom_services where name = 'Full repipe') = 0, 'clients do not see jobs waiting for approval');

-- 0033 clean words: rude words refused (with tricks), Latin letters for own trades and jobs; normal words pass
select pg_temp.ok(public.bad_text('жопа') and public.bad_text('Sh1t repair') and public.bad_text('f*ck') and public.bad_text('PUTA madre') and public.bad_text('pizdec'), 'rude words are found, also with tricks');
select pg_temp.ok(not public.bad_text('Canal and analysis, document, cucumber, Sussex, употребление, колебания, Mesa, Hui Chen, Dick Smith'), 'normal words are not flagged');
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
do $$ begin update public.pros set bio = 'I fix shit fast' where id = auth.uid(); raise exception 'FAIL: rude bio saved';
  exception when others then if sqlerrm not like 'inappropriate words%' then raise; end if; end $$;
do $$ begin insert into public.pro_custom_services (pro_id, name, price) values (auth.uid(), 'Ремонт крана', 100); raise exception 'FAIL: Cyrillic job saved';
  exception when others then if sqlerrm not like 'english only%' then raise; end if; end $$;
do $$ begin insert into public.trade_requests (name) values ('жопа'); raise exception 'FAIL: rude trade request saved';
  exception when others then if sqlerrm not like 'inappropriate words%' then raise; end if; end $$;
select pg_temp.ok(true, 'rude bio, Cyrillic job names and rude trade requests are refused by the database');

-- 0034 English only: non-Latin letters refused in profiles; accented Latin names are fine
select pg_temp.ok(public.non_latin('Сантехник') and public.non_latin('水管工') and not public.non_latin('Lucía Peña, José — 24/7 “fast”'), 'non-Latin letters are found, accented Latin is fine');
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
do $$ begin update public.pros set bio = 'Чиню краны быстро' where id = auth.uid(); raise exception 'FAIL: Russian bio saved';
  exception when others then if sqlerrm not like 'english only%' then raise; end if; end $$;
update public.pros set display_name = 'José Peña' where id = auth.uid();
select pg_temp.ok((select display_name from public.pros where id = auth.uid()) = 'José Peña', 'a pro profile in English is saved (accented names too)');

-- 0035 quiet chats: a new client writes to a pro who is not taking jobs → no notification until the pro answers
select pg_temp.act(null); reset role;
update public.pros set accepting = false, paused_until = null, status = 'verified' where id = '00000000-0000-0000-0000-0000000000b2';
delete from public.conversations where pro_id = '00000000-0000-0000-0000-0000000000b2';
delete from public.notifications where user_id = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
insert into public.conversations (id, client_id, pro_id) values ('40000000-0000-0000-0000-0000000000b2', auth.uid(), '00000000-0000-0000-0000-0000000000b2');
insert into public.messages (conversation_id, sender_id, body) values ('40000000-0000-0000-0000-0000000000b2', auth.uid(), 'Hello, are you free?');
select pg_temp.act(null); reset role;
select pg_temp.ok((select quiet from public.conversations where id = '40000000-0000-0000-0000-0000000000b2')
  and (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-0000000000b2') = 0, 'new client while not taking jobs: quiet chat, no notification');
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
insert into public.messages (conversation_id, sender_id, body) values ('40000000-0000-0000-0000-0000000000b2', auth.uid(), 'Yes, tomorrow');
select pg_temp.act(null); reset role;
select pg_temp.ok(not (select quiet from public.conversations where id = '40000000-0000-0000-0000-0000000000b2'), 'the pro answered: the chat is normal again');
update public.pros set accepting = true where id = '00000000-0000-0000-0000-0000000000b2';

-- 0036 profiles on other review sites: only real links to known sites; a pro cannot mark them checked
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
do $$ begin update public.pros set ext_links = '{"yelp":"https://evil.example/biz/x"}' where id = auth.uid(); raise exception 'FAIL: foreign link saved';
  exception when check_violation then null; end $$;
update public.pros set ext_links = '{"yelp":"https://www.yelp.com/biz/max-plumbing-redwood-city","google":"https://maps.app.goo.gl/AbCd123"}', ext_checked_at = now() where id = auth.uid();
select pg_temp.ok((select ext_checked_at is null and ext_links ? 'yelp' from public.pros where id = auth.uid()), 'review-site links are saved; only an admin can mark them checked');

-- 0037 friends: a friends-only post is seen by mutual friends only
select pg_temp.act(null); reset role;
delete from public.pro_contacts where 'a1' is not null and (pro_id in ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2') or colleague_id in ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2'));
update public.pros set colleague_chat = 'all' where id in ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2');
delete from public.posts where pro_id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
insert into public.pro_contacts (pro_id, colleague_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000a2');
insert into public.posts (id, pro_id, body, audience) values ('50000000-0000-0000-0000-0000000000f1', auth.uid(), 'Only for my friends', 'friends');
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
select pg_temp.ok((select count(*) from public.posts where id = '50000000-0000-0000-0000-0000000000f1') = 0 and (select kind from public.my_friends() where pro_id = '00000000-0000-0000-0000-0000000000a1') = 'incoming', 'not friends yet: the post is hidden, the request is incoming');
insert into public.pro_contacts (pro_id, colleague_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000a1');
select pg_temp.ok((select count(*) from public.posts where id = '50000000-0000-0000-0000-0000000000f1') = 1, 'mutual friends see the friends-only post');
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select count(*) from public.posts where id = '50000000-0000-0000-0000-0000000000f1') = 0, 'clients do not see friends-only posts');
\echo ALL RULE TESTS PASSED
