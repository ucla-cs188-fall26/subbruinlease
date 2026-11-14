-- ============================================================================
-- subBruinLease -- align the schema with the app's data model
--
-- The app (src/lib/types.ts, docs/data-model.md) was built against a different
-- model from the first migrations. The app's types are the source of truth, so
-- this migration reshapes the database to match them:
--
--   profiles        altered in place (keeps existing users): adds email,
--                   email_verified, role, status; renames avatar_path and
--                   graduation_year to match the app.
--   listings,       dropped and recreated with the app's columns. They held
--   listing_images, no data when this was written. listing_private and
--   favorites,      listing_contact are dropped: the app keeps no exact
--   reports         address and contacts owners through inquiries instead.
--   inquiries       new.
--
-- Rules the app checks in its own validation (field lengths, 5 open listings
-- per student, rate limits) are only loosely mirrored here as sanity bounds.
-- Row Level Security is enabled on every new table with no policies, so
-- nothing is readable through the API until the policies migration lands.
-- ============================================================================

create extension if not exists pg_trgm with schema extensions;

-- ------------------------------------------------------- drop the old model
drop table if exists public.reports         cascade;
drop table if exists public.favorites       cascade;
drop table if exists public.listing_images  cascade;
drop table if exists public.listing_contact cascade;
drop table if exists public.listing_private cascade;
drop table if exists public.listings        cascade;

drop function if exists public.enforce_publish_requirements();
drop function if exists public.enforce_photo_limit();

drop type if exists public.listing_status;
drop type if exists public.room_type;
drop type if exists public.sublease_permission;
drop type if exists public.contact_method;
drop type if exists public.report_reason;
drop type if exists public.report_status;

-- ---------------------------------------------------------------------- enums
create type public.user_role        as enum ('student', 'admin');
create type public.account_status   as enum ('active', 'suspended');
create type public.listing_status   as enum ('draft', 'published', 'unavailable', 'closed', 'hidden');
create type public.housing_type     as enum ('apartment', 'house', 'townhouse', 'condo', 'other');
create type public.room_type        as enum ('private', 'shared', 'entire');
create type public.lease_permission as enum ('allowed', 'landlord_approved', 'pending');
create type public.inquiry_status   as enum ('sent', 'read', 'archived');
create type public.report_reason    as enum (
  'scam', 'misleading', 'not_available', 'no_sublease_permission', 'inappropriate', 'other');
create type public.report_status    as enum ('open', 'resolved', 'dismissed');

-- ------------------------------------------------------------------ profiles
alter table public.profiles rename column avatar_path     to avatar_url;
alter table public.profiles rename column graduation_year to grad_year;

alter table public.profiles
  add column email          text,
  add column email_verified boolean not null default false,
  add column role           public.user_role      not null default 'student',
  add column status         public.account_status not null default 'active';

-- Backfill existing users from Supabase Auth, then require an email.
update public.profiles p
set email          = lower(u.email),
    email_verified = u.email_confirmed_at is not null
from auth.users u
where u.id = p.id;

alter table public.profiles alter column email set not null;
alter table public.profiles add constraint profiles_email_key unique (email);

-- The existing "users update their own profile" policy covers whole rows.
-- Limit the columns students can write so nobody can make themselves an
-- admin, unsuspend themselves, or change their email through the API.
-- Admin changes go through the server with the service role.
revoke update on public.profiles from authenticated, anon;
grant update (display_name, avatar_url, grad_year, bio) on public.profiles to authenticated;

-- ------------------------------------------------------------------ listings
create table public.listings (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  status       public.listing_status not null default 'draft',

  -- Basics
  title         text not null check (char_length(trim(title)) between 1 and 120),
  description   text not null check (char_length(trim(description)) between 1 and 5000),
  neighborhood  text not null check (neighborhood in (
    'North Village', 'Westwood Village', 'South Westwood', 'Westwood (Wilshire Corridor)',
    'Brentwood', 'Sawtelle', 'Palms', 'Santa Monica', 'Culver City', 'Other')),
  -- Approximate only (cross streets). The app rejects street and unit numbers.
  location_hint text not null check (char_length(trim(location_hint)) between 1 and 120),
  housing_type  public.housing_type not null,
  room_type     public.room_type    not null,
  furnished     boolean not null default false,

  -- Pricing (whole dollars per month) and availability
  rent               integer not null check (rent > 0),
  security_deposit   integer check (security_deposit >= 0),
  utilities_included boolean not null default false,
  utilities_estimate integer check (utilities_estimate >= 0),
  available_from     date not null,
  available_to       date not null,
  flexible_dates     boolean not null default false,

  -- Apartment details
  bedrooms    integer not null check (bedrooms >= 0),
  bathrooms   numeric(3,1) not null check (bathrooms > 0),
  roommates   integer not null default 0 check (roommates >= 0),
  amenities   text[] not null default '{}' check (amenities <@ array[
    'in_unit_laundry', 'on_site_laundry', 'parking', 'kitchen', 'wifi',
    'air_conditioning', 'dishwasher', 'gym', 'pool', 'balcony',
    'pets_allowed', 'wheelchair_accessible']::text[]),
  house_rules text check (char_length(house_rules) <= 2000),

  lease_permission public.lease_permission not null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Set the first time the listing is published (see trigger below).
  published_at timestamptz,

  -- Lowercased text the explore search matches against (substring per word,
  -- same as matchesText in src/lib/search.ts).
  search_text text generated always as (
    lower(title || ' ' || description || ' ' || neighborhood || ' ' || location_hint)
  ) stored,

  constraint listings_dates_ordered check (available_to > available_from)
);

-- ------------------------------------------------------------ listing images
create table public.listing_images (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  -- What the app displays: a public URL. For photos in our storage bucket,
  -- storage_path is the object's path so it can be cleaned up later.
  url          text not null,
  storage_path text,
  alt          text not null default '' check (char_length(alt) <= 200),
  -- 0 is the cover photo.
  position     smallint not null check (position between 0 and 7),
  created_at   timestamptz not null default now(),
  constraint listing_images_position_key unique (listing_id, position)
);

-- ----------------------------------------------------------------- favorites
create table public.favorites (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ----------------------------------------------------------------- inquiries
-- A message to a listing's owner. The app emails it, so the sender never sees
-- the owner's address.
create table public.inquiries (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  sender_id    uuid not null references public.profiles (id) on delete cascade,
  -- The listing's owner when the inquiry was sent.
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  message      text not null check (char_length(trim(message)) between 1 and 2000),
  desired_from date,
  desired_to   date,
  status       public.inquiry_status not null default 'sent',
  created_at   timestamptz not null default now(),
  constraint inquiries_not_to_self check (sender_id <> recipient_id),
  constraint inquiries_dates_ordered
    check (desired_from is null or desired_to is null or desired_to > desired_from)
);

-- ------------------------------------------------------------------- reports
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      public.report_reason not null,
  details     text check (char_length(details) <= 2000),
  status      public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- -------------------------------------------------------------------- indexes
create index listings_status_published_idx on public.listings (status, published_at desc);
create index listings_owner_idx            on public.listings (owner_id, status);
create index listings_dates_idx            on public.listings (available_from, available_to);
create index listings_rent_idx             on public.listings (rent);
create index listings_search_text_idx
  on public.listings using gin (search_text extensions.gin_trgm_ops);

create index favorites_listing_idx           on public.favorites (listing_id);
create index inquiries_sender_idx            on public.inquiries (sender_id, created_at desc);
create index inquiries_recipient_idx         on public.inquiries (recipient_id, created_at desc);
create index inquiries_listing_idx           on public.inquiries (listing_id);
create index reports_status_idx              on public.reports (status, created_at desc);
create index reports_listing_idx             on public.reports (listing_id);
create index reports_reporter_idx            on public.reports (reporter_id, created_at desc);
-- At most one open report per student per listing; they can report again
-- once it's resolved or dismissed.
create unique index reports_one_open_per_reporter
  on public.reports (listing_id, reporter_id) where status = 'open';

-- ------------------------------------------------------------------- triggers
create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

-- published_at is set the first time a listing is published, and never moves.
create or replace function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end $$;

create trigger listings_set_published_at before insert or update on public.listings
  for each row execute function public.set_published_at();

-- At most 8 photos per listing.
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

-- A profile for every new auth user, now carrying email and verification.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, email_verified, display_name)
  values (
    new.id,
    lower(new.email),
    new.email_confirmed_at is not null,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end $$;

-- With email OTP, the auth user exists before the code is entered; keep the
-- profile's email and verified flag in step with Supabase Auth.
create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email          = lower(new.email),
      email_verified = new.email_confirmed_at is not null
  where id = new.id;
  return new;
end $$;

create trigger on_auth_user_updated
  after update of email, email_confirmed_at on auth.users
  for each row execute function public.sync_user_email();

-- ------------------------------------------------------------ row level security
-- Deny-all until the policies migration adds rules.
alter table public.listings       enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites      enable row level security;
alter table public.inquiries      enable row level security;
alter table public.reports        enable row level security;
