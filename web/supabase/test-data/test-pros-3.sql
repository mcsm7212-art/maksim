-- DEMO pro with her own trade (not one of the four): a dog groomer. Example only, not a real person;
-- marked "Demo profile", cannot be booked or messaged. Removed by supabase/test-data/remove-test-pros.sql.
-- Photos: web/public/test-pros/p11.webp (face) and f11.webp (full height).
do $$
declare uid uuid := '7e570000-0000-4000-8000-00000000000b';
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, email_confirmed_at, created_at, updated_at)
  values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-pro-11@example.com',
          jsonb_build_object('full_name', 'Lucía Morales', 'role', 'pro'), '{"provider":"email","providers":["email"]}', now(), now(), now())
  on conflict (id) do nothing;
  update public.profiles set role = 'pro', full_name = 'Lucía Morales' where id = uid;
  insert into public.pros (id, slug, display_name, trade, custom_trade, tiers, years_exp, area, bio, languages, photo_url, figure_url, accent, uniform_color, status, response_minutes, experience, skills, is_demo)
  values (uid, 'lucia-morales', 'Lucía Morales', 'other', 'Dog grooming', array['standard'], 9, 'San Carlos',
          'TEST PROFILE (example, not a real pro). Gentle grooming for small and medium dogs. Calm and patient, no rushing. I come to you in a mobile grooming van.',
          array['English','Spanish'], '/test-pros/p11.webp', '/test-pros/f11.webp', '#C8642E', null, 'verified', 38,
          '9 years grooming dogs on the Peninsula: poodles, doodles, terriers and shy rescue dogs.', array['Poodles and doodles','Hand scissoring','Anxious dogs'], true)
  on conflict (id) do nothing;
  insert into public.availability_rules (pro_id, weekday, start_time, end_time)
    select uid, d, '09:00', '17:00' from generate_series(2, 6) d
  on conflict do nothing;
  delete from public.pro_custom_services where pro_id = uid;
  insert into public.pro_custom_services (pro_id, category, name, price) values
    (uid, 'Full groom', 'Small dog full groom (up to 20 lb)', 95),
    (uid, 'Full groom', 'Medium dog full groom (20–50 lb)', 125),
    (uid, 'Full groom', 'Poodle or doodle full groom', 150),
    (uid, 'Full groom', 'Puppy''s first groom', 70),
    (uid, 'Bath & tidy', 'Bath, brush and blow-dry', 65),
    (uid, 'Bath & tidy', 'Face, feet and sanitary trim', 45),
    (uid, 'Bath & tidy', 'De-shedding treatment', 85),
    (uid, 'Extras', 'Nail trim', 20),
    (uid, 'Extras', 'Teeth brushing', 15),
    (uid, 'Extras', 'Ear cleaning', 15);
end $$;
