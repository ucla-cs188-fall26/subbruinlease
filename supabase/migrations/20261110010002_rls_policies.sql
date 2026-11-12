-- ============================================================================
-- subBruinLease -- row-level security
--
-- Browsing is gated: every policy targets `authenticated`, so the `anon` role
-- sees nothing at all. Signing in requires a UCLA address (see the auth hook
-- migration), which is what makes "verified UCLA students only" true.
--
-- Writes additionally require a confirmed email address. With magic-link /
-- OTP login that is true by construction, but the check is what the spec
-- asks for and it becomes load-bearing the day password login is added.
-- ============================================================================

alter table public.profiles        enable row level security;
alter table public.listings        enable row level security;
alter table public.listing_private enable row level security;
alter table public.listing_contact enable row level security;
alter table public.listing_images  enable row level security;
alter table public.favorites       enable row level security;
alter table public.reports         enable row level security;

-- ----------------------------------------------------------- helper functions
-- A policy on a child table that subqueries its parent re-enters the parent's
-- policies: slow, and recursive once policies point both ways. These are
-- security definer, so they answer the ownership question in one pass.

create or replace function public.is_verified_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

create or replace function public.listing_is_visible(p_listing_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_listing_id
      and (l.status = 'published' or l.owner_id = auth.uid())
  );
$$;

create or replace function public.is_listing_owner(p_listing_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_listing_id and l.owner_id = auth.uid()
  );
$$;

-- Storage policies get a folder name, which may be any string at all. The
-- regex guard stops a junk path from raising a cast error; CASE guarantees
-- the cast is only reached once the pattern matched.
create or replace function public.path_listing_is_visible(p_folder text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when p_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.listing_is_visible(p_folder::uuid)
    else false
  end;
$$;

create or replace function public.path_is_listing_owner(p_folder text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when p_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.is_listing_owner(p_folder::uuid)
    else false
  end;
$$;

revoke execute on function
  public.is_verified_user(),
  public.listing_is_visible(uuid),
  public.is_listing_owner(uuid),
  public.path_listing_is_visible(text),
  public.path_is_listing_owner(text)
  from public, anon;

grant execute on function
  public.is_verified_user(),
  public.listing_is_visible(uuid),
  public.is_listing_owner(uuid),
  public.path_listing_is_visible(text),
  public.path_is_listing_owner(text)
  to authenticated;

-- ------------------------------------------------------------------ profiles
-- Insert is handled by the signup trigger; the row dies with the auth user.
create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated
  using (true);

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ------------------------------------------------------------------ listings
create policy "published listings readable, own drafts too"
  on public.listings for select to authenticated
  using (status = 'published' or owner_id = (select auth.uid()));

create policy "verified users create their own listings"
  on public.listings for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select public.is_verified_user())
  );

create policy "owners update their own listings"
  on public.listings for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Closing is preferred over deleting, but the owner may delete. Storage
-- objects must be removed first; nothing in Postgres knows about them.
create policy "owners delete their own listings"
  on public.listings for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ------------------------------------------- unit number: owner only, always
create policy "owners manage private listing details"
  on public.listing_private for all to authenticated
  using (public.is_listing_owner(listing_id))
  with check (public.is_listing_owner(listing_id));

-- ------------------- contact details: visible wherever the listing is visible
create policy "contact details follow listing visibility"
  on public.listing_contact for select to authenticated
  using (public.listing_is_visible(listing_id));

create policy "owners manage their contact details"
  on public.listing_contact for all to authenticated
  using (public.is_listing_owner(listing_id))
  with check (public.is_listing_owner(listing_id));

-- ------------------------------------------------------------ listing images
create policy "images follow listing visibility"
  on public.listing_images for select to authenticated
  using (public.listing_is_visible(listing_id));

create policy "owners manage their listing images"
  on public.listing_images for all to authenticated
  using (public.is_listing_owner(listing_id))
  with check (public.is_listing_owner(listing_id));

-- ----------------------------------------------------------------- favorites
create policy "users read their own favorites"
  on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));

create policy "verified users save visible listings"
  on public.favorites for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_verified_user())
    and public.listing_is_visible(listing_id)
  );

create policy "users remove their own favorites"
  on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

-- ------------------------------------------------------------------- reports
-- Reporters can file and can see what they filed. Nobody reads the whole
-- table through the API: you read it in the dashboard, where the service
-- role bypasses RLS. There is deliberately no admin role.
create policy "verified users report visible listings"
  on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (select public.is_verified_user())
    and public.listing_is_visible(listing_id)
  );

create policy "reporters read their own reports"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

-- No update and no delete policy: a filed report is not editable by its
-- author, and resolving one happens in the dashboard.
