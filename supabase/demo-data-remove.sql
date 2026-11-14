-- Removes everything supabase/demo-data.sql added. Deleting the demo auth users cascades to
-- their profiles, listings, photos, and reports, plus any favorites, messages, or reports
-- real users made on demo listings.
--   npx supabase db query --remote -f supabase/demo-data-remove.sql

delete from auth.users where email like '%@demo.subbruinlease.invalid';
