-- Demo data for a fresh subBruinLease database (DATA_SOURCE=supabase).
-- Generated from src/lib/data/mock/seed.ts: 6 posters, 11 listings with Unsplash photos,
-- and 1 open report so the admin queue has something in it. All people are fictional.
--
-- The posters' emails use the reserved .invalid domain (demo.subbruinlease.invalid): nobody can
-- receive mail there, so nobody can sign in as them, and nothing is emailed to a real
-- person when someone messages a demo listing (the message still shows up in the inbox).
--
-- Safe to run more than once. Remove it all with supabase/demo-data-remove.sql.
--   npx supabase db query --remote -f supabase/demo-data.sql

begin;

-- Posters. Inserting into auth.users fires on_auth_user_created, which creates each profile.
insert into auth.users
  (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
   created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('445890d8-96b8-43d0-a7d9-d1cd2678a414', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo@demo.subbruinlease.invalid', '2026-09-20T17:00:00.000Z', '{"provider":"email","providers":["email"]}', '{"display_name":"Demo Bruin"}', '2026-09-20T17:00:00.000Z', '2026-09-20T17:00:00.000Z', '', '', '', ''),
  ('efc76aa6-4d16-470d-a04f-d4321197e732', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jordan.lee@demo.subbruinlease.invalid', '2026-09-25T17:00:00.000Z', '{"provider":"email","providers":["email"]}', '{"display_name":"Jordan L."}', '2026-09-25T17:00:00.000Z', '2026-09-25T17:00:00.000Z', '', '', '', ''),
  ('0fe7203c-68b2-4902-a53d-a86b7c7cd483', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya.p@demo.subbruinlease.invalid', '2026-10-02T17:00:00.000Z', '{"provider":"email","providers":["email"]}', '{"display_name":"Priya P."}', '2026-10-02T17:00:00.000Z', '2026-10-02T17:00:00.000Z', '', '', '', ''),
  ('2069dbd0-55a7-41b8-a846-7893a70cb208', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mchen@demo.subbruinlease.invalid', '2026-10-05T17:00:00.000Z', '{"provider":"email","providers":["email"]}', '{"display_name":"Marcus C."}', '2026-10-05T17:00:00.000Z', '2026-10-05T17:00:00.000Z', '', '', '', ''),
  ('b71b853b-dd95-485f-a14f-f1227f8a91d7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sofia.ramirez@demo.subbruinlease.invalid', '2026-10-12T17:00:00.000Z', '{"provider":"email","providers":["email"]}', '{"display_name":"Sofia R."}', '2026-10-12T17:00:00.000Z', '2026-10-12T17:00:00.000Z', '', '', '', ''),
  ('a8d9a653-5a5c-4b89-a2ec-e7068f353df7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'emily.n@demo.subbruinlease.invalid', '2026-10-18T17:00:00.000Z', '{"provider":"email","providers":["email"]}', '{"display_name":"Emily N."}', '2026-10-18T17:00:00.000Z', '2026-10-18T17:00:00.000Z', '', '', '', '')
on conflict (id) do nothing;

update public.profiles p
set display_name = v.display_name, grad_year = v.grad_year, bio = v.bio, created_at = v.created_at::timestamptz
from (values
  ('445890d8-96b8-43d0-a7d9-d1cd2678a414', 'Demo Bruin', 2027, 'Third-year econ major. Studying abroad in Madrid this summer!', '2026-09-20T17:00:00.000Z'),
  ('efc76aa6-4d16-470d-a04f-d4321197e732', 'Jordan L.', 2027, 'CS major, interning in Seattle over the summer.', '2026-09-25T17:00:00.000Z'),
  ('0fe7203c-68b2-4902-a53d-a86b7c7cd483', 'Priya P.', 2026, 'Bioengineering. Clean, quiet, and always down for boba.', '2026-10-02T17:00:00.000Z'),
  ('2069dbd0-55a7-41b8-a846-7893a70cb208', 'Marcus C.', 2028, null, '2026-10-05T17:00:00.000Z'),
  ('b71b853b-dd95-485f-a14f-f1227f8a91d7', 'Sofia R.', 2027, 'Film student. Going home to San Diego for winter break.', '2026-10-12T17:00:00.000Z'),
  ('a8d9a653-5a5c-4b89-a2ec-e7068f353df7', 'Emily N.', 2026, 'Graduating in June, subleasing until my lease ends.', '2026-10-18T17:00:00.000Z')
) as v (id, display_name, grad_year, bio, created_at)
where p.id = v.id::uuid;

insert into public.listings
  (id, owner_id, status, title, description, neighborhood, location_hint, housing_type, room_type, furnished, rent, security_deposit, utilities_included, utilities_estimate, available_from, available_to, flexible_dates, bedrooms, bathrooms, roommates, amenities, house_rules, lease_permission, created_at, updated_at, published_at)
values
  ('bd1ee1cb-696a-46e0-a0ce-3de05acb9515', 'efc76aa6-4d16-470d-a04f-d4321197e732', 'published', 'Sunny private room on Landfair, 5 min to campus', 'My room in a 3-bedroom apartment on Landfair is open while I''m interning this summer. It gets great morning light, has a big closet, and you can walk to Bruin Plate in five minutes.

My two roommates are both staying for summer research. They''re friendly but pretty low-key. Looking for someone tidy who doesn''t mind a shared bathroom.', 'North Village', 'Landfair Ave near Strathmore', 'apartment', 'private', true, 1250, 500, false, 60, '2027-06-15', '2027-09-10', true, 3, 2, 2, array['on_site_laundry', 'kitchen', 'wifi', 'dishwasher']::text[], 'No smoking. Quiet hours after 11pm on weeknights.', 'landlord_approved', '2026-11-08T19:12:00.000Z', '2026-11-08T19:12:00.000Z', '2026-11-08T19:12:00.000Z'),
  ('146c4092-493e-4878-a995-a3e30db8437b', '0fe7203c-68b2-4902-a53d-a86b7c7cd483', 'published', 'Shared room in a friendly Gayley apartment', 'Taking over my half of a double for the summer. You''d share the room with one other student (she''s a 4th-year, super easygoing). Building has a gym and a rooftop with views of Westwood.', 'North Village', 'Gayley Ave near Levering', 'apartment', 'shared', true, 850, 300, true, null, '2027-06-20', '2027-08-31', false, 2, 2, 3, array['on_site_laundry', 'kitchen', 'wifi', 'gym', 'air_conditioning']::text[], 'Women only (shared bedroom). No overnight guests on weeknights.', 'allowed', '2026-11-07T22:40:00.000Z', '2026-11-07T22:40:00.000Z', '2026-11-07T22:40:00.000Z'),
  ('eba02ba4-7900-48cd-a217-cc4412a33078', '2069dbd0-55a7-41b8-a846-7893a70cb208', 'published', 'Entire studio on Kelton for winter quarter', 'Studying abroad in Tokyo winter quarter, so my studio is available January through March. Fully furnished, with a full kitchen, in-unit laundry, and a parking spot in the garage.', 'Westwood Village', 'Kelton Ave south of Weyburn', 'apartment', 'entire', true, 1900, 1000, false, 80, '2027-01-03', '2027-03-25', true, 0, 1, 0, array['in_unit_laundry', 'parking', 'kitchen', 'wifi', 'air_conditioning']::text[], null, 'allowed', '2026-11-05T16:05:00.000Z', '2026-11-05T16:05:00.000Z', '2026-11-05T16:05:00.000Z'),
  ('25c23c6d-4b00-44ad-abe5-8e3a728d773c', 'b71b853b-dd95-485f-a14f-f1227f8a91d7', 'published', 'Private room on Midvale for spring quarter', 'Doing a quarter in DC, so my room is open for spring. It''s a quiet street south of Wilshire, about 15 minutes'' walk to campus or a quick Big Blue Bus ride. Two roommates, both grad students.', 'South Westwood', 'Midvale Ave near Ohio', 'apartment', 'private', true, 1100, 400, true, null, '2027-03-28', '2027-06-15', false, 3, 1.5, 2, array['on_site_laundry', 'kitchen', 'wifi', 'parking']::text[], 'No pets please (roommate allergy).', 'landlord_approved', '2026-11-03T20:30:00.000Z', '2026-11-03T20:30:00.000Z', '2026-11-03T20:30:00.000Z'),
  ('aab1ac81-c326-4379-a8df-cdfd7cba6c48', 'a8d9a653-5a5c-4b89-a2ec-e7068f353df7', 'published', 'Room in a Palms house with a backyard', 'Big private room in a 4-bedroom house in Palms. Backyard, driveway parking, and a washer/dryer. About 20 minutes to campus by bike or the Culver CityBus 6.', 'Palms', 'Near Overland Ave & National Blvd', 'house', 'private', false, 950, 500, false, 75, '2027-06-01', '2027-08-31', true, 4, 2, 3, array['in_unit_laundry', 'parking', 'kitchen', 'wifi', 'pets_allowed']::text[], 'We have a very friendly cat named Mochi.', 'pending', '2026-11-01T18:00:00.000Z', '2026-11-01T18:00:00.000Z', '2026-11-01T18:00:00.000Z'),
  ('02ddcb8c-f07b-4237-a279-a1b3cde1786b', '445890d8-96b8-43d0-a7d9-d1cd2678a414', 'published', 'Affordable shared room on Veteran', 'My spot in a double is open while I''m abroad in Madrid. Super affordable for Westwood, and the apartment has a balcony. Looking for someone respectful and easy to live with.', 'Westwood Village', 'Veteran Ave near Gayley', 'apartment', 'shared', true, 780, 200, true, null, '2027-07-01', '2027-09-15', true, 2, 1, 3, array['on_site_laundry', 'kitchen', 'wifi', 'balcony']::text[], null, 'allowed', '2026-10-30T15:45:00.000Z', '2026-10-30T15:45:00.000Z', '2026-10-30T15:45:00.000Z'),
  ('157793dc-5d4e-4223-aaf7-9b4c0ba2a4d7', '0fe7203c-68b2-4902-a53d-a86b7c7cd483', 'published', 'Entire 1BR near Sawtelle Japantown', 'Whole one-bedroom available for summer while I''m doing research back east. Walk to Sawtelle''s ramen and boba spots; the 761 bus or a 10-minute drive gets you to campus.', 'Sawtelle', 'Near Sawtelle Blvd & Olympic', 'apartment', 'entire', true, 2300, 1200, false, 90, '2027-06-15', '2027-09-15', false, 1, 1, 0, array['in_unit_laundry', 'parking', 'kitchen', 'wifi', 'air_conditioning', 'dishwasher']::text[], 'No smoking. No parties.', 'landlord_approved', '2026-10-28T21:10:00.000Z', '2026-10-28T21:10:00.000Z', '2026-10-28T21:10:00.000Z'),
  ('f018c9e8-da4f-4207-a160-39af249b55d6', 'b71b853b-dd95-485f-a14f-f1227f8a91d7', 'published', 'Winter break room on Strathmore', 'Short stay! My room is free over winter break if you''re staying in LA for an internship or just need a place for a few weeks.', 'North Village', 'Strathmore Dr near Landfair', 'apartment', 'private', true, 1175, null, true, null, '2026-12-14', '2027-01-04', false, 2, 1, 1, array['on_site_laundry', 'kitchen', 'wifi']::text[], null, 'allowed', '2026-10-25T17:20:00.000Z', '2026-10-25T17:20:00.000Z', '2026-10-25T17:20:00.000Z'),
  ('8be27d50-4433-4ca2-ad0e-604e0b0c60f2', '2069dbd0-55a7-41b8-a846-7893a70cb208', 'unavailable', 'Private room in Brentwood townhouse', 'Quiet townhouse in Brentwood with a shared patio. Currently in talks with someone, so it''s marked unavailable for now.', 'Brentwood', 'Near Barrington Ave & Sunset', 'townhouse', 'private', true, 1400, 700, false, 70, '2027-01-05', '2027-06-20', true, 3, 2.5, 2, array['in_unit_laundry', 'parking', 'kitchen', 'wifi', 'air_conditioning']::text[], null, 'landlord_approved', '2026-10-20T19:00:00.000Z', '2026-10-20T19:00:00.000Z', '2026-10-20T19:00:00.000Z'),
  ('9b7b9e4f-d592-43bb-ae2b-9bc034667ce5', '445890d8-96b8-43d0-a7d9-d1cd2678a414', 'draft', 'Room on Glenrock (draft)', 'Still writing this one up. Private room in a two-bedroom on Glenrock, a short walk to campus.', 'North Village', 'Glenrock Ave', 'apartment', 'private', false, 1050, null, false, null, '2027-06-15', '2027-08-15', false, 2, 1, 1, array['kitchen']::text[], null, 'pending', '2026-11-09T23:00:00.000Z', '2026-11-09T23:00:00.000Z', null),
  ('d79e9dc7-92c1-484a-ae5a-26e5d03c714f', '445890d8-96b8-43d0-a7d9-d1cd2678a414', 'closed', 'Summer room in Santa Monica, near the beach', 'Found a subletter, thanks everyone!', 'Santa Monica', 'Near 14th St & Wilshire', 'apartment', 'private', true, 1350, 500, true, null, '2026-06-15', '2026-09-01', false, 2, 1, 1, array['kitchen', 'wifi', 'parking']::text[], null, 'allowed', '2026-04-02T18:00:00.000Z', '2026-04-02T18:00:00.000Z', '2026-04-02T18:00:00.000Z')
on conflict (id) do nothing;

insert into public.listing_images (listing_id, url, alt, position)
values
  ('bd1ee1cb-696a-46e0-a0ce-3de05acb9515', 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&q=80&auto=format&fit=crop', 'Private bedroom with a large window', 0),
  ('bd1ee1cb-696a-46e0-a0ce-3de05acb9515', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&auto=format&fit=crop', 'Shared living room', 1),
  ('bd1ee1cb-696a-46e0-a0ce-3de05acb9515', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80&auto=format&fit=crop', 'Shared kitchen', 2),
  ('146c4092-493e-4878-a995-a3e30db8437b', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&q=80&auto=format&fit=crop', 'Shared bedroom with two beds', 0),
  ('146c4092-493e-4878-a995-a3e30db8437b', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80&auto=format&fit=crop', 'Living room', 1),
  ('eba02ba4-7900-48cd-a217-cc4412a33078', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80&auto=format&fit=crop', 'Studio living area', 0),
  ('eba02ba4-7900-48cd-a217-cc4412a33078', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80&auto=format&fit=crop', 'Kitchen', 1),
  ('eba02ba4-7900-48cd-a217-cc4412a33078', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80&auto=format&fit=crop', 'Bathroom', 2),
  ('eba02ba4-7900-48cd-a217-cc4412a33078', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80&auto=format&fit=crop', 'Building exterior', 3),
  ('25c23c6d-4b00-44ad-abe5-8e3a728d773c', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80&auto=format&fit=crop', 'Private bedroom', 0),
  ('25c23c6d-4b00-44ad-abe5-8e3a728d773c', 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=1200&q=80&auto=format&fit=crop', 'Living room', 1),
  ('25c23c6d-4b00-44ad-abe5-8e3a728d773c', 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200&q=80&auto=format&fit=crop', 'Dining area', 2),
  ('aab1ac81-c326-4379-a8df-cdfd7cba6c48', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=1200&q=80&auto=format&fit=crop', 'Private bedroom', 0),
  ('aab1ac81-c326-4379-a8df-cdfd7cba6c48', 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1200&q=80&auto=format&fit=crop', 'Living room', 1),
  ('aab1ac81-c326-4379-a8df-cdfd7cba6c48', 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1200&q=80&auto=format&fit=crop', 'Dining room', 2),
  ('02ddcb8c-f07b-4237-a279-a1b3cde1786b', 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80&auto=format&fit=crop', 'Shared bedroom', 0),
  ('02ddcb8c-f07b-4237-a279-a1b3cde1786b', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80&auto=format&fit=crop', 'Living room', 1),
  ('157793dc-5d4e-4223-aaf7-9b4c0ba2a4d7', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80&auto=format&fit=crop', 'Living room', 0),
  ('157793dc-5d4e-4223-aaf7-9b4c0ba2a4d7', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80&auto=format&fit=crop', 'Bedroom', 1),
  ('157793dc-5d4e-4223-aaf7-9b4c0ba2a4d7', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80&auto=format&fit=crop', 'Kitchen', 2),
  ('f018c9e8-da4f-4207-a160-39af249b55d6', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80&auto=format&fit=crop', 'Living room', 0),
  ('f018c9e8-da4f-4207-a160-39af249b55d6', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80&auto=format&fit=crop', 'Bedroom', 1),
  ('8be27d50-4433-4ca2-ad0e-604e0b0c60f2', 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1200&q=80&auto=format&fit=crop', 'Living room', 0),
  ('8be27d50-4433-4ca2-ad0e-604e0b0c60f2', 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200&q=80&auto=format&fit=crop', 'Stairs to bedrooms', 1),
  ('d79e9dc7-92c1-484a-ae5a-26e5d03c714f', 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1200&q=80&auto=format&fit=crop', 'Living room', 0)
on conflict (listing_id, position) do nothing;

insert into public.reports (id, listing_id, reporter_id, reason, details, status, created_at)
values
  ('72b54bd2-ca62-42ac-a8df-cf0ed80f0de2', 'f018c9e8-da4f-4207-a160-39af249b55d6', 'efc76aa6-4d16-470d-a04f-d4321197e732', 'misleading', 'Photos look like they''re from a different apartment.', 'open', '2026-11-10T20:00:00.000Z')
on conflict (id) do nothing;

commit;
