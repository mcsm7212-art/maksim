-- More DEMO pros (examples, not real people; marked "Demo profile", cannot be booked or messaged).
-- Ids end in one hex character (6, 7, …), so supabase/test-data/remove-test-pros.sql removes them too.
-- Photos: web/public/test-pros/pN.webp (face) and fN.webp (full height).
do $$
declare
  p record;
  uid uuid;
begin
  for p in select * from (values
    ('6',6,'Renee Jackson','renee-jackson','handyman',11,'Foster City',array['English'],'#2F7A55',
     'Small jobs done right: doors, locks, caulking, smoke detectors, childproofing.',
     '11 years of handyman work for families and seniors. Careful, tidy, on time.',array['Doors and locks','Caulking','Childproofing']),
    ('7',7,'Laura Bennett','laura-bennett','plumbing',15,'Burlingame',array['English'],'#1F8A8A',
     'Water heaters, leaks and main water lines. I explain the options and the price before I start.',
     '15 years of residential plumbing on the Peninsula, including copper and PEX service lines.',array['Water heaters','Main water lines','Leak detection']),
    ('8',8,'Carlos Mendoza','carlos-mendoza','electrical',12,'San Mateo',array['English','Spanish'],'#D9763A',
     'EV chargers, lighting and panel upgrades. Hablo español. Permits handled when the city needs them.',
     '12 years as a licensed electrician, residential and small commercial.',array['EV chargers','Panel upgrades','Lighting']),
    ('9',9,'Roberto Alvarez','roberto-alvarez','construction',24,'Redwood City',array['English','Spanish'],'#4F7F6E',
     'Decks, fences, patios and foundation repair. A clear written scope before any deposit.',
     '24 years building and repairing homes around Redwood City. Licensed B general contractor.',array['Decks and fences','Foundations','Framing']),
    ('a',10,'Priya Raman','priya-raman','construction',14,'Sunnyvale',array['English','Hindi','Tamil'],'#B46A3C',
     'Kitchen and bath remodels, ADUs and garage conversions, from plans to final inspection.',
     '14 years as a general contractor in the South Bay. One schedule, one point of contact.',array['Remodels','ADUs','Permits and inspections'])
  ) as t(c,n,name,slug,trade,yrs,area,langs,accent,bio,exp,skills)
  loop
    uid := ('7e570000-0000-4000-8000-00000000000'||p.c)::uuid;
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, email_confirmed_at, created_at, updated_at)
    values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'test-pro-'||p.n||'@example.com', jsonb_build_object('full_name', p.name, 'role', 'pro'), '{"provider":"email","providers":["email"]}', now(), now(), now())
    on conflict (id) do nothing;
    update public.profiles set role = 'pro', full_name = p.name where id = uid;
    insert into public.pros (id, slug, display_name, trade, tiers, years_exp, area, bio, languages, photo_url, figure_url, accent, uniform_color, status, response_minutes, experience, skills, is_demo)
    values (uid, p.slug, p.name, p.trade, array['standard'], p.yrs, p.area,
            'TEST PROFILE (example, not a real pro). '||p.bio, p.langs, '/test-pros/p'||p.n||'.webp', '/test-pros/f'||p.n||'.webp', p.accent, null, 'verified', 15 + p.n * 3, p.exp, p.skills, true)
    on conflict (id) do nothing;
    insert into public.availability_rules (pro_id, weekday, start_time, end_time)
      select uid, d, '08:00', '17:00' from generate_series(1, 5) d
    on conflict do nothing;
  end loop;
end $$;

insert into public.pro_services (pro_id, service_id, price) values
 ('7e570000-0000-4000-8000-000000000006','door-repair-and-adjustment',160),('7e570000-0000-4000-8000-000000000006','door-lock-and-hardware-replacement',150),
 ('7e570000-0000-4000-8000-000000000006','caulking-kitchen-bath-windows',170),('7e570000-0000-4000-8000-000000000006','battery-smoke-detector-replacement',120),
 ('7e570000-0000-4000-8000-000000000006','childproofing',240),('7e570000-0000-4000-8000-000000000006','weatherstripping',150),
 ('7e570000-0000-4000-8000-000000000007','water-heater-repair',null),('7e570000-0000-4000-8000-000000000007','tankless-water-heater-installation',null),
 ('7e570000-0000-4000-8000-000000000007','water-service-line-replacement-meter-to-house',null),('7e570000-0000-4000-8000-000000000007','leak-detection',350),
 ('7e570000-0000-4000-8000-000000000007','pipe-leak-repair',420),('7e570000-0000-4000-8000-000000000007','shut-off-valve-replacement',260),
 ('7e570000-0000-4000-8000-000000000008','level-2-ev-charger-installation',null),('7e570000-0000-4000-8000-000000000008','panel-upgrade-100a-to-200a',null),
 ('7e570000-0000-4000-8000-000000000008','light-fixture-replacement',230),('7e570000-0000-4000-8000-000000000008','recessed-lighting',290),
 ('7e570000-0000-4000-8000-000000000008','ceiling-fan-installation',400),('7e570000-0000-4000-8000-000000000008','gfci-outlet-installation',210),
 ('7e570000-0000-4000-8000-000000000009','deck-building',null),('7e570000-0000-4000-8000-000000000009','new-fence-installation',null),
 ('7e570000-0000-4000-8000-000000000009','concrete-patio-or-driveway',null),('7e570000-0000-4000-8000-000000000009','foundation-repair',null),
 ('7e570000-0000-4000-8000-000000000009','structural-framing-repair',null),
 ('7e570000-0000-4000-8000-00000000000a','kitchen-remodel',null),('7e570000-0000-4000-8000-00000000000a','bathroom-remodel',null),
 ('7e570000-0000-4000-8000-00000000000a','adu-construction',null),('7e570000-0000-4000-8000-00000000000a','garage-conversion',null),
 ('7e570000-0000-4000-8000-00000000000a','interior-wall-removal',null)
on conflict do nothing;

-- Fictional 555-01xx numbers (never assigned) so the demo shows the "Call" button and call hours.
update public.pros set public_phone = '(650) 555-01' || lpad((10 + row_number)::text, 2, '0'), call_hours = 'Mon–Fri 8am–6pm, Sat 9am–1pm'
from (select id, row_number() over (order by id) as row_number from public.pros where id::text like '7e570000-0000-4000-8000-00000000000_') d
where public.pros.id = d.id;

-- Service areas on the map (circle around each demo pro's city).
update public.pros p set base_lat = v.lat, base_lng = v.lng, service_radius_mi = v.r
from (values ('Mei Tanaka',37.563,-122.3255,15),('Daniel Brooks',37.4852,-122.2364,25),('Marcus Hill',37.4852,-122.2364,20),('Sofia Reyes',37.5072,-122.2605,12),
             ('Kenji Nakamura',37.453,-122.1817,20),('Renee Jackson',37.5585,-122.2711,10),('Laura Bennett',37.5841,-122.3661,18),('Carlos Mendoza',37.563,-122.3255,30),
             ('Roberto Alvarez',37.4852,-122.2364,35),('Priya Raman',37.3688,-122.0363,40)) v(name, lat, lng, r)
where p.display_name = v.name and p.id::text like '7e570000-0000-4000-8000-00000000000_';
