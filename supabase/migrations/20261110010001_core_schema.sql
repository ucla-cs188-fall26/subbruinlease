-- ============================================================================
-- subBruinLease -- core schema
--
-- Seven application tables. The spec lists six; `inquiries` is gone (contact
-- details are listed on the listing instead of any in-app contact flow), and
-- two narrow tables were added to carry fields with different visibility from
-- the listing row itself, since RLS filters rows and not columns:
--   listing_private  -- unit number, owner only
--   listing_contact  -- how to reach the owner, visible on published listings
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------- enums
create type public.listing_status as enum ('draft', 'published', 'closed', 'hidden');
create type public.room_type      as enum ('private_room', 'shared_room', 'entire_apartment');
create type public.sublease_permission as enum ('unconfirmed', 'confirmed');
create type public.contact_method  as enum ('email', 'text', 'either');
create type public.report_reason   as enum ('misleading', 'scam', 'inappropriate', 'other');
create type public.report_status   as enum ('pending', 'reviewed', 'resolved');

-- ------------------------------------------------------------------ profiles
-- No email and no verification flag here: both come from Supabase Auth.
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text not null check (char_length(trim(display_name)) between 1 and 60),
  avatar_path     text,
  graduation_year integer check (graduation_year between 2000 and 2100),
  bio             text check (char_length(bio) <= 1000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------------------ listings
create table public.listings (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(trim(title)) between 4 and 120),
  description text not null check (char_length(trim(description)) between 1 and 5000),

  -- Location. Exact street address is readable on published listings; the
  -- unit number is not, and lives in listing_private.
  neighborhood   text not null,
  street_address text not null,
  city           text not null default 'Los Angeles',
  region         text not null default 'CA',
  postal_code    text,
  latitude       numeric(9,6)  check (latitude between -90 and 90),
  longitude      numeric(9,6)  check (longitude between -180 and 180),

  -- Housing
  room_type         public.room_type not null,
  bedrooms          integer not null check (bedrooms >= 0),
  bathrooms         numeric(3,1) not null check (bathrooms > 0),
  total_roommates   integer check (total_roommates >= 0),
  furnished         boolean not null default false,
  utilities_included boolean not null default false,
  parking_available boolean not null default false,
  laundry_available boolean not null default false,
  wifi_included     boolean not null default false,

  -- Pricing. numeric, never float: exact decimal arithmetic for money.
  monthly_rent     numeric(10,2) not null check (monthly_rent > 0),
  security_deposit numeric(10,2) check (security_deposit >= 0),
  utilities_cost   numeric(10,2) check (utilities_cost >= 0),

  -- Availability
  available_from  date not null,
  available_until date not null,
  dates_flexible  boolean not null default false,

  -- Lease authorization
  sublease_permission_status public.sublease_permission not null default 'unconfirmed',

  -- Management
  status     public.listing_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  search_tsv tsvector generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(neighborhood, '') || ' ' ||
      coalesce(description, ''))
  ) stored,

  constraint listings_dates_ordered check (available_until > available_from),
  -- A listing cannot go public until the owner confirms they may sublease.
  constraint listings_permission_before_publish
    check (status <> 'published' or sublease_permission_status = 'confirmed')
);

-- ---------------------------------------------- unit number, owner-only
create table public.listing_private (
  listing_id  uuid primary key references public.listings (id) on delete cascade,
  unit        text,
  entry_notes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------- how to reach the owner, off-platform
-- Its own table so a 24-row browse query does not ship two dozen students'
-- phone numbers to the client, and so draft listings expose nothing.
create table public.listing_contact (
  listing_id       uuid primary key references public.listings (id) on delete cascade,
  contact_email    text check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone    text check (char_length(trim(contact_phone)) between 7 and 20),
  preferred_method public.contact_method not null default 'email',
  note             text check (char_length(note) <= 500),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint listing_contact_needs_one_channel
    check (contact_email is not null or contact_phone is not null)
);

-- ------------------------------------------------------------ listing images
create table public.listing_images (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings (id) on delete cascade,
  storage_path  text not null unique,
  display_order smallint not null default 0 check (display_order between 0 and 7),
  width         integer,
  height        integer,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------- favorites
create table public.favorites (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ------------------------------------------------------------------- reports
-- Submitted by students; read by you in the Supabase dashboard. No admin role.
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      public.report_reason not null,
  description text check (char_length(description) <= 1000),
  status      public.report_status not null default 'pending',
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint reports_one_per_user_per_listing unique (listing_id, reporter_id)
);

-- -------------------------------------------------------------------- indexes
create index listings_published_dates_idx
  on public.listings (available_from, available_until) where status = 'published';
create index listings_published_rent_idx
  on public.listings (monthly_rent) where status = 'published';
create index listings_published_facets_idx
  on public.listings (neighborhood, room_type, furnished) where status = 'published';
create index listings_owner_idx  on public.listings (owner_id, status);
create index listings_search_idx on public.listings using gin (search_tsv);

create index listing_images_listing_idx on public.listing_images (listing_id, display_order);
create index favorites_listing_idx      on public.favorites (listing_id);
create index reports_listing_idx        on public.reports (listing_id, status);

-- ------------------------------------------------------------------- triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();
create trigger listing_private_touch before update on public.listing_private
  for each row execute function public.touch_updated_at();
create trigger listing_contact_touch before update on public.listing_contact
  for each row execute function public.touch_updated_at();

-- A profile for every new auth user. security definer so it can write before
-- any policy applies to the brand-new user; empty search_path so nothing can
-- be hijacked by a shadowing schema.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- At most 8 photos per listing (the spec's 1-8 range; the lower bound is
-- enforced at publish time below).
create or replace function public.enforce_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.listing_images i
      where i.listing_id = new.listing_id) >= 8 then
    raise exception 'A listing can have at most 8 photos'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger listing_images_cap before insert on public.listing_images
  for each row execute function public.enforce_photo_limit();

-- Publishing requires confirmed sublease permission, at least one photo, and
-- a way to be contacted. The permission rule is also a check constraint on
-- the table, which is the real guarantee; it is repeated here only because a
-- BEFORE trigger runs ahead of constraint checks, so without it the owner
-- would see "add a photo" and never learn the permission box was unticked.
create or replace function public.enforce_publish_requirements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'published' then
    return new;
  end if;

  -- already published and staying published: nothing to re-check
  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;

  if new.sublease_permission_status <> 'confirmed' then
    raise exception 'Confirm you have permission to sublease before publishing'
      using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.listing_images i where i.listing_id = new.id) then
    raise exception 'Add at least one photo before publishing'
      using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.listing_contact c where c.listing_id = new.id) then
    raise exception 'Add contact details before publishing'
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

create trigger listings_publish_gate before insert or update on public.listings
  for each row execute function public.enforce_publish_requirements();
