-- 5 TEST pros for trying the site. Not real people: every bio starts with "TEST PROFILE".
-- Photos: web/public/test-pros/p1..p5.webp. Remove them all with supabase/test-data/remove-test-pros.sql.
do $$
declare
  p record;
begin
  for p in select * from (values
    (1,'Mei Tanaka','mei-tanaka','handyman',12,'San Mateo',array['English','Japanese'],'#C08A62',array['standard','premium'],
     'TV mounting, shelves and careful furniture assembly. I bring drop cloths and clean up after myself.',
     '12 years of handyman work in San Mateo County: condos, older homes, small offices.',array['TV mounting','Furniture assembly','Drywall patches']),
    (2,'Daniel Brooks','daniel-brooks','electrical',7,'Redwood City',array['English'],'#4F8FD6',array['standard','premium'],
     'EV chargers, lighting and smart switches. Clear quote before I start.',
     '7 years as a residential electrician, 150+ Level 2 EV chargers installed.',array['EV chargers','Recessed lighting','Smart home']),
    (3,'Marcus Hill','marcus-hill','plumbing',18,'Redwood City',array['English'],'#E2B48C',array['economy','standard','premium'],
     'Water heaters, leaks and clogs. Same-day when I can, honest price on the spot.',
     '18 years of plumbing on the Peninsula. Tank and tankless water heaters are my specialty.',array['Tankless water heaters','Leak repair','Drain clearing']),
    (4,'Sofia Reyes','sofia-reyes','handyman',6,'San Carlos',array['English','Spanish'],'#3FBF6B',array['economy','standard'],
     'Painting, drywall and the small fixes nobody else wants to come out for.',
     '6 years of handyman and painting work. I take photos before and after every job.',array['Interior painting','Drywall repair','Caulking']),
    (5,'Kenji Nakamura','kenji-nakamura','electrical',10,'Menlo Park',array['English','Japanese'],'#E08A3C',array['standard','premium'],
     'Panels, breakers and troubleshooting: I find the problem first, then fix it.',
     '10 years in residential and light commercial electrical work. Panel upgrades and tricky outages.',array['Panel upgrades','Troubleshooting','GFCI and outlets'])
  ) as t(n,name,slug,trade,yrs,area,langs,accent,tiers,bio,exp,skills)
  loop
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, email_confirmed_at, created_at, updated_at)
    values (('7e570000-0000-4000-8000-00000000000'||p.n)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'test-pro-'||p.n||'@example.com', jsonb_build_object('full_name', p.name, 'role', 'pro'), '{"provider":"email","providers":["email"]}', now(), now(), now())
    on conflict (id) do nothing;
    update public.profiles set role = 'pro', full_name = p.name where id = ('7e570000-0000-4000-8000-00000000000'||p.n)::uuid;
    insert into public.pros (id, slug, display_name, trade, tiers, years_exp, area, bio, languages, photo_url, accent, uniform_color, status, response_minutes, experience, skills)
    values (('7e570000-0000-4000-8000-00000000000'||p.n)::uuid, p.slug, p.name, p.trade, p.tiers, p.yrs, p.area,
            'TEST PROFILE (example, not a real pro). '||p.bio, p.langs, '/test-pros/p'||p.n||'.webp', p.accent, null, 'verified', 20 + p.n * 5, p.exp, p.skills)
    on conflict (id) do nothing;
    insert into public.availability_rules (pro_id, weekday, start_time, end_time)
      select ('7e570000-0000-4000-8000-00000000000'||p.n)::uuid, d, '08:00', '17:00' from generate_series(1, 6) d;
  end loop;
end $$;

insert into public.pro_services (pro_id, service_id, price) values
 ('7e570000-0000-4000-8000-000000000001','tv-wall-mounting',189),('7e570000-0000-4000-8000-000000000001','shelves-installation',140),
 ('7e570000-0000-4000-8000-000000000001','furniture-assembly',120),('7e570000-0000-4000-8000-000000000001','pictures-mirrors-and-art-hanging',110),
 ('7e570000-0000-4000-8000-000000000001','curtain-rods-and-blinds',150),('7e570000-0000-4000-8000-000000000001','drywall-patch-and-repair',260),
 ('7e570000-0000-4000-8000-000000000002','level-2-ev-charger-installation',null),('7e570000-0000-4000-8000-000000000002','light-fixture-replacement',240),
 ('7e570000-0000-4000-8000-000000000002','recessed-lighting',280),('7e570000-0000-4000-8000-000000000002','ceiling-fan-installation',420),
 ('7e570000-0000-4000-8000-000000000002','smart-switch-installation',210),('7e570000-0000-4000-8000-000000000002','outlet-replacement',180),
 ('7e570000-0000-4000-8000-000000000003','tank-water-heater-replacement',null),('7e570000-0000-4000-8000-000000000003','tankless-water-heater-installation',null),
 ('7e570000-0000-4000-8000-000000000003','water-heater-repair',null),('7e570000-0000-4000-8000-000000000003','faucet-replacement',320),
 ('7e570000-0000-4000-8000-000000000003','clogged-toilet',190),('7e570000-0000-4000-8000-000000000003','shut-off-valve-replacement',280),
 ('7e570000-0000-4000-8000-000000000003','under-sink-leak-repair',240),
 ('7e570000-0000-4000-8000-000000000004','paint-touch-up-one-wall-or-room',520),('7e570000-0000-4000-8000-000000000004','drywall-patch-and-repair',240),
 ('7e570000-0000-4000-8000-000000000004','caulking-kitchen-bath-windows',180),('7e570000-0000-4000-8000-000000000004','door-repair-and-adjustment',170),
 ('7e570000-0000-4000-8000-000000000004','furniture-assembly',110),
 ('7e570000-0000-4000-8000-000000000005','panel-upgrade-100a-to-200a',null),('7e570000-0000-4000-8000-000000000005','breaker-replacement',290),
 ('7e570000-0000-4000-8000-000000000005','troubleshooting-tripping-breaker-partial-outage',300),('7e570000-0000-4000-8000-000000000005','gfci-outlet-installation',220),
 ('7e570000-0000-4000-8000-000000000005','subpanel-installation',null)
on conflict do nothing;

-- Two of them online now (12 h) so the map and "Urgent help" have something to show; Marcus takes urgent calls.
update public.pros set online_until = now() + interval '12 hours', online_area = area where id in ('7e570000-0000-4000-8000-000000000002','7e570000-0000-4000-8000-000000000003');
update public.pros set urgent_ok = true, urgent_fee = 75 where id = '7e570000-0000-4000-8000-000000000003';

-- Full-height figures and glow colours taken from their clothes.
update public.pros p set figure_url = '/test-pros/f' || right(p.id::text, 1) || '.webp', accent = v.acc
from (values ('1','#C99F6E'),('2','#C68A62'),('3','#4F86C6'),('4','#D0603F'),('5','#C67643')) v(n, acc)
where p.id::text = '7e570000-0000-4000-8000-00000000000' || v.n;
