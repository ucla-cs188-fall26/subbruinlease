-- ============================================================================
-- subBruinLease -- row-level security for the aligned schema
--
-- The app's server code uses the service role and checks permissions itself
-- (requireUser, owner checks). These policies guard everything else: anyone
-- calling the Supabase API directly with the public anon key, or a signed-in
-- student's own token.
--
-- Browsing is public: published and unavailable listings, their photos, and
-- public profile fields are readable without signing in. Everything else
-- needs a signed-in, email-verified, active (not suspended) user.
-- ============================================================================

-- ----------------------------------------------------------- helper functions
-- security definer so policies can ask about other tables in one pass without
-- re-entering those tables' policies.

-- Signed in, verified email, and not suspended. Gates every write.
create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.email_verified
      and p.status = 'active'
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  );
$$;

-- Public listings, plus your own in any status, plus everything for admins.
create or replace function public.listing_is_visible(p_listing_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_listing_id
      and (l.status in ('published', 'unavailable')
           or l.owner_id = auth.uid()
           or public.is_admin())
  );
$$;

create or replace function public.is_listing_owner(p_listing_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_listing_id and l.owner_id = auth.uid()
  );
$$;

drop function if exists public.is_verified_user();

revoke execute on function
  public.is_active_user(), public.is_admin(),
  public.listing_is_visible(uuid), public.is_listing_owner(uuid)
  from public;
grant execute on function
  public.is_active_user(), public.is_admin(),
  public.listing_is_visible(uuid), public.is_listing_owner(uuid)
  to anon, authenticated;

-- ------------------------------------------------------------------ profiles
-- RLS filters rows, not columns, so email/role/status are hidden with
-- column grants. The server reads them with the service role.
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, avatar_url, grad_year, bio, email_verified, created_at)
  on public.profiles to anon, authenticated;

drop policy if exists "profiles readable by signed-in users" on public.profiles;
drop policy if exists "users update their own profile" on public.profiles;

create policy "public profile fields are readable"
  on public.profiles for select to anon, authenticated
  using (status = 'active' or id = (select auth.uid()) or (select public.is_admin()));

-- Column grants (previous migration) limit this to display_name, avatar_url,
-- grad_year and bio.
create policy "active users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and (select public.is_active_user()))
  with check (id = (select auth.uid()));

-- ------------------------------------------------------------------ listings
create policy "public listings readable by anyone"
  on public.listings for select to anon, authenticated
  using (status in ('published', 'unavailable'));

create policy "owners read their own listings"
  on public.listings for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "admins read all listings"
  on public.listings for select to authenticated
  using ((select public.is_admin()));

create policy "active users create their own listings"
  on public.listings for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select public.is_active_user())
    and status in ('draft', 'published')
  );

create policy "owners update their own listings"
  on public.listings for update to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()))
  with check (owner_id = (select auth.uid()));

create policy "admins update any listing"
  on public.listings for update to authenticated
  using ((select public.is_admin()))
  with check (true);

create policy "owners delete their own listings"
  on public.listings for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Only admins hide and unhide listings. An owner's update policy can't tell
-- which status they're moving to, so a trigger checks it for API callers.
-- The service role and direct SQL (migrations, seeds) are not restricted.
-- Not security definer: it must see the caller's role in current_user.
create or replace function public.guard_hidden_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user::text not in ('anon', 'authenticated') then
    return new;
  end if;
  if (new.status = 'hidden' or (tg_op = 'UPDATE' and old.status = 'hidden'))
     and (tg_op = 'INSERT' or new.status is distinct from old.status)
     and not public.is_admin() then
    raise exception 'Only admins can hide or unhide listings'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

create trigger listings_guard_hidden before insert or update on public.listings
  for each row execute function public.guard_hidden_status();

-- ------------------------------------------------------------ listing images
create policy "images follow listing visibility"
  on public.listing_images for select to anon, authenticated
  using (public.listing_is_visible(listing_id));

create policy "owners manage their listing images"
  on public.listing_images for all to authenticated
  using (public.is_listing_owner(listing_id) and (select public.is_active_user()))
  with check (public.is_listing_owner(listing_id) and (select public.is_active_user()));

-- ----------------------------------------------------------------- favorites
create policy "users read their own favorites"
  on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));

create policy "active users save visible listings"
  on public.favorites for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_user())
    and public.listing_is_visible(listing_id)
  );

create policy "users remove their own favorites"
  on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------- inquiries
-- recipient_id is always the listing's owner, set here so it can't be spoofed.
create or replace function public.set_inquiry_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select l.owner_id into new.recipient_id
  from public.listings l where l.id = new.listing_id;
  if new.recipient_id is null then
    raise exception 'Listing not found' using errcode = 'foreign_key_violation';
  end if;
  return new;
end $$;

create trigger inquiries_set_recipient before insert on public.inquiries
  for each row execute function public.set_inquiry_recipient();

create policy "senders and recipients read inquiries"
  on public.inquiries for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

create policy "active users message public listings"
  on public.inquiries for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select public.is_active_user())
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status in ('published', 'unavailable')
    )
  );

-- Recipients only change status (read / archived).
revoke update on public.inquiries from anon, authenticated;
grant update (status) on public.inquiries to authenticated;

create policy "recipients update inquiry status"
  on public.inquiries for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- ------------------------------------------------------------------- reports
create policy "active users report visible listings"
  on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (select public.is_active_user())
    and status = 'open'
    and public.listing_is_visible(listing_id)
  );

create policy "reporters read their own reports"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

create policy "admins read all reports"
  on public.reports for select to authenticated
  using ((select public.is_admin()));

revoke update on public.reports from anon, authenticated;
grant update (status, resolved_by, resolved_at) on public.reports to authenticated;

create policy "admins resolve reports"
  on public.reports for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- -------------------------------------------------------------------- storage
-- listing-images becomes a public bucket laid out as {owner_id}/{file}.webp,
-- which is how the app stores photos (it uploads before the listing exists).
-- Public means reads need no policy; writes are limited to your own folder.
update storage.buckets
set public = true,
    file_size_limit = 4194304,
    allowed_mime_types = array['image/webp']
where id = 'listing-images';

drop policy if exists "read images of visible listings" on storage.objects;
drop policy if exists "owners upload listing images"    on storage.objects;
drop policy if exists "owners replace listing images"   on storage.objects;
drop policy if exists "owners delete listing images"    on storage.objects;

-- Only the old listing-images policies above used these.
drop function if exists public.path_listing_is_visible(text);
drop function if exists public.path_is_listing_owner(text);

create policy "users upload to their own listing-images folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_active_user())
  );

create policy "users replace files in their own listing-images folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users delete files in their own listing-images folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
