-- The before-user-created hook runs as supabase_auth_admin, which does not bypass Row Level
-- Security. allowed_signup_domains has RLS on and no policies, so the hook saw an empty
-- allowlist and refused every new signup, UCLA addresses included. Let that role (and only
-- that role) read the table.
create policy "auth admin reads allowed signup domains"
  on public.allowed_signup_domains for select
  to supabase_auth_admin
  using (true);
