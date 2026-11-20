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
     '11 years of handyman work for families and seniors. Careful, tidy, on time.',array['Doors and locks','Caulking','Childproofing'])
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
 ('7e570000-0000-4000-8000-000000000006','childproofing',240),('7e570000-0000-4000-8000-000000000006','weatherstripping',150)
on conflict do nothing;
