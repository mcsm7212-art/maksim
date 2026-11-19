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
\echo ALL RULE TESTS PASSED
