-- ============================================================================
-- subBruinLease -- storage buckets and policies
--
-- Path convention carries the authorization: the first folder segment is the
-- owning entity's id, and the policies check that segment.
--   listing-images/<listing_id>/<uuid>.jpg
--   avatars/<user_id>/<uuid>.jpg
--
-- Both buckets are private, because browsing is gated to signed-in UCLA
-- students. A private bucket refuses every read without a matching select
-- policy -- signed URLs included, so createSignedUrl() returns 400 without
-- the policies below.
--
-- If `supabase db push` rejects policy creation for lack of ownership on
-- storage.objects, create these six through Dashboard -> Storage -> Policies
-- and keep only the bucket insert in this file. The expressions are identical.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', false, 5242880,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', false, 2097152,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- -------------------------------------------------------------- listing images
create policy "read images of visible listings"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'listing-images'
    and public.path_listing_is_visible((storage.foldername(name))[1])
  );

create policy "owners upload listing images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and public.path_is_listing_owner((storage.foldername(name))[1])
  );

create policy "owners replace listing images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'listing-images'
    and public.path_is_listing_owner((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'listing-images'
    and public.path_is_listing_owner((storage.foldername(name))[1])
  );

create policy "owners delete listing images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and public.path_is_listing_owner((storage.foldername(name))[1])
  );

-- --------------------------------------------------------------------- avatars
create policy "read avatars"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

create policy "users manage their own avatar"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
