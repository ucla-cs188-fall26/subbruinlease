-- ============================================================================
-- subBruinLease -- restrict signups to UCLA email domains
--
-- After pushing this migration, turn the hook on:
--   Dashboard -> Authentication -> Hooks -> Before User Created
--   Hook type: Postgres function
--   Function:  public.hook_restrict_signup_to_ucla
--
-- Unlike a generic ".edu" check, this is an allowlist of UCLA domains, per
-- the spec's "checks whether the address belongs to an allowed UCLA email
-- domain". Add rows to the table to admit more; no code change needed.
--
-- The hook fires on email, OTP, magic-link, OAuth and invite signups alike,
-- so there is no side door.
-- ============================================================================

create table public.allowed_signup_domains (
  domain text primary key,
  note   text
);

insert into public.allowed_signup_domains (domain, note) values
  ('ucla.edu',   'UCLA primary'),
  ('g.ucla.edu', 'UCLA Google Workspace');

alter table public.allowed_signup_domains enable row level security;
-- Deliberately no policies: only supabase_auth_admin ever reads this table.

create or replace function public.hook_restrict_signup_to_ucla(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_email  text := lower(event -> 'user' ->> 'email');
  v_domain text;
begin
  if v_email is null or v_email = '' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 400,
      'message', 'A UCLA email address is required to sign up.'));
  end if;

  v_domain := split_part(v_email, '@', 2);

  if exists (
    select 1 from public.allowed_signup_domains d
    where d.domain = v_domain
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'subBruinLease is open to UCLA students. Please sign up with your @ucla.edu or @g.ucla.edu address.'));
end $$;

-- The hook runs as supabase_auth_admin; that role, and only that role, needs access.
grant usage  on schema public to supabase_auth_admin;
grant select on public.allowed_signup_domains to supabase_auth_admin;
grant execute on function public.hook_restrict_signup_to_ucla(jsonb)
  to supabase_auth_admin;
revoke execute on function public.hook_restrict_signup_to_ucla(jsonb)
  from authenticated, anon, public;
