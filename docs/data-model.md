# Data model

This is what the app expects from the database. The TypeScript source of truth is
[`src/lib/types.ts`](../src/lib/types.ts), and every read and write goes through the
`DataStore` interface in [`src/lib/data/store.ts`](../src/lib/data/store.ts).

The app currently runs on fake in-memory data (`DATA_SOURCE=mock`). The Supabase schema
below lives in `supabase/migrations/` (the current shape comes from
`20261113000001_align_schema_with_app.sql`), with generated types in
`src/lib/database.types.ts`. A Supabase implementation of `DataStore` maps these tables to
the TypeScript types; switching `DATA_SOURCE=supabase` turns it on.

**Naming:** TypeScript uses `camelCase` and the database uses `snake_case`. For example,
`availableFrom` in TypeScript is `available_from` in the database. The table below uses the
database names.

## Tables

### `profiles`

One row per user. `id` matches `auth.users.id` from Supabase Auth.

| Column          | Type                 | Notes                                             |
| --------------- | -------------------- | ------------------------------------------------- |
| `id`            | uuid, PK             | references `auth.users(id)`                       |
| `email`         | text, unique         | `@ucla.edu` or `@g.ucla.edu`. Never shown publicly |
| `display_name`  | text, not null       |                                                   |
| `avatar_url`    | text, null           |                                                   |
| `grad_year`     | int, null            |                                                   |
| `bio`           | text, null           |                                                   |
| `email_verified`| boolean, default false |                                                 |
| `role`          | enum `student`/`admin`, default `student` |                              |
| `status`        | enum `active`/`suspended`, default `active` |                            |
| `created_at`    | timestamptz, default now() |                                             |

### `listings`

| Column               | Type                    | Notes                                                       |
| -------------------- | ----------------------- | ----------------------------------------------------------- |
| `id`                 | uuid, PK                |                                                             |
| `owner_id`           | uuid → `profiles.id`    |                                                             |
| `status`             | enum `draft`/`published`/`unavailable`/`closed`/`hidden` | only `published` appears in search. `hidden` is set by admins |
| `title`              | text                    |                                                             |
| `description`        | text                    |                                                             |
| `neighborhood`       | text                    | one of `NEIGHBORHOODS` in types.ts                          |
| `location_hint`      | text                    | approximate (cross streets). Never a unit number            |
| `housing_type`       | enum `apartment`/`house`/`townhouse`/`condo`/`other` |                                |
| `room_type`          | enum `private`/`shared`/`entire` |                                                    |
| `furnished`          | boolean                 |                                                             |
| `rent`               | int                     | whole dollars per month                                     |
| `security_deposit`   | int, null               |                                                             |
| `utilities_included` | boolean                 |                                                             |
| `utilities_estimate` | int, null               | monthly, when not included                                  |
| `available_from`     | date                    |                                                             |
| `available_to`       | date                    | must be after `available_from`                              |
| `flexible_dates`     | boolean                 |                                                             |
| `bedrooms`           | int                     | 0 = studio                                                  |
| `bathrooms`          | numeric(3,1)            | e.g. 1.5                                                    |
| `roommates`          | int                     | other people living there during the sublease               |
| `amenities`          | text[]                  | values from `AMENITIES` in types.ts                         |
| `house_rules`        | text, null              |                                                             |
| `lease_permission`   | enum `allowed`/`landlord_approved`/`pending` |                                        |
| `created_at`         | timestamptz             |                                                             |
| `updated_at`         | timestamptz             |                                                             |
| `published_at`       | timestamptz, null       | set by a trigger the first time it's published              |
| `search_text`        | text, generated         | lowercased title + description + neighborhood + location hint, for text search |

Publishing with `lease_permission = 'pending'` is allowed. The "at least 1 photo to publish"
rule is checked by the app, not the database.

Search (`DataStore.listings.search`) has to follow the rules in `src/lib/search.ts`. Text
search matches every word as a substring of `search_text` (trigram index). In SQL,
the date rule is roughly
`available_from - slack <= :from AND available_to + slack >= :to`, where
`slack = 7 days if flexible_dates else 0`.

Indexes worth having: `(status, published_at desc)`, `(owner_id)`, `(available_from, available_to)`, `(rent)`.

### `listing_images`

| Column       | Type                  | Notes                                       |
| ------------ | --------------------- | ------------------------------------------- |
| `id`         | uuid, PK              |                                             |
| `listing_id` | uuid → `listings.id`, on delete cascade |                           |
| `url`        | text                  | public URL the app displays (`url` in TypeScript) |
| `storage_path` | text, null          | object path in the `listing-images` bucket, when the photo lives there. Used for cleanup |
| `alt`        | text                  |                                             |
| `position`   | int                   | 0 = cover photo. Unique per listing         |

A listing can have at most 8 images (enforced by a trigger).

### `favorites`

| Column       | Type                 | Notes                     |
| ------------ | -------------------- | ------------------------- |
| `user_id`    | uuid → `profiles.id` | PK (`user_id`, `listing_id`) |
| `listing_id` | uuid → `listings.id` |                           |
| `created_at` | timestamptz          |                           |

### `inquiries`

A message a student sends to a listing's owner. The app emails it to the owner, so the
sender never sees the owner's email address.

| Column         | Type                 | Notes                                   |
| -------------- | -------------------- | --------------------------------------- |
| `id`           | uuid, PK             |                                         |
| `listing_id`   | uuid → `listings.id` |                                         |
| `sender_id`    | uuid → `profiles.id` |                                         |
| `recipient_id` | uuid → `profiles.id` | the listing owner when it was sent      |
| `message`      | text                 |                                         |
| `desired_from` | date, null           |                                         |
| `desired_to`   | date, null           |                                         |
| `status`       | enum `sent`/`read`/`archived` |                                |
| `created_at`   | timestamptz          |                                         |

### `reports`

| Column        | Type                 | Notes                                                                     |
| ------------- | -------------------- | ------------------------------------------------------------------------- |
| `id`          | uuid, PK             |                                                                           |
| `listing_id`  | uuid → `listings.id` |                                                                           |
| `reporter_id` | uuid → `profiles.id` |                                                                           |
| `reason`      | enum `scam`/`misleading`/`not_available`/`no_sublease_permission`/`inappropriate`/`other` | |
| `details`     | text, null           |                                                                           |
| `status`      | enum `open`/`resolved`/`dismissed` |                                                             |
| `resolved_by` | uuid → `profiles.id`, null |                                                                     |
| `resolved_at` | timestamptz, null    |                                                                           |
| `created_at`  | timestamptz          |                                                                           |

A student can have at most one `open` report per listing (partial unique index). They can
report again once it's resolved or dismissed.

## Auth sync

- A trigger on `auth.users` creates the `profiles` row at signup, with `email` (lowercased)
  and `email_verified`. A second trigger keeps both in sync when the user confirms or
  changes their email.
- Students can only update `display_name`, `avatar_url`, `grad_year` and `bio` on their own
  profile (column-level grants). `role`, `status` and `email` change only through the server.

## Access rules (Row Level Security)

The app's server code talks to the database with the **service role**, which bypasses these
policies, and checks permissions itself (`requireUser`, owner checks). The policies protect the
database from anyone calling the Supabase API directly with the public anon key or their own
token. They live in `supabase/migrations/20261113000002_rls_policies_v2.sql`.

Browsing is public: no sign-in needed to read public listings, their photos, or public profile
fields.

| Table            | Read                                                         | Write                                                        |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `profiles`       | anyone can read public fields of active users. `email`, `role` and `status` aren't readable through the API (column grants) | users update their own `display_name`, `avatar_url`, `grad_year`, `bio` |
| `listings`       | anyone can read `published` and `unavailable`. Owners read all of their own. Admins read all | owners insert and update their own. Only admins can set or clear `hidden` (trigger). Admins update any |
| `listing_images` | same as the parent listing                                   | owner of the parent listing                                  |
| `favorites`      | own rows only                                                | own rows, only for listings you can see                      |
| `inquiries`      | sender or recipient                                          | sender inserts on a public listing (`recipient_id` is set to the owner by a trigger). Recipient updates `status` only |
| `reports`        | admins, and reporters their own                              | signed-in users insert on listings they can see. Admins update `status`/`resolved_by`/`resolved_at` |

Every write needs an active (not suspended) account with a verified email
(`is_active_user()`). Admin checks use `is_admin()`.

## Storage

- Bucket `listing-images`, public, WebP only, 4 MB per file. Signed-in users can write only
  under their own folder, `{owner_id}/{filename}`. (Photos are uploaded before the listing
  exists, so the folder is the owner, not the listing.)
- The `avatars` bucket from the first storage migration still exists but the app doesn't use it.
- The app re-encodes every photo before storing it: WebP, at most 2000px on the long side,
  with metadata (including GPS location) removed. Uploads to the server are capped at 4 MB.
  See `src/lib/images.ts`.
- In the code, storage sits behind the `ImageStorage` interface in `src/lib/storage/`. In mock
  mode photos are written to `.data/uploads/` and served from `/uploads/{owner_id}/{file}.webp`.
  With `DATA_SOURCE=supabase` they're uploaded (with the service role, after `/api/uploads` has
  checked the user) to `listing-images/{owner_id}/{random}.webp`, and the listing stores the
  public URL plus `storage_path`. A listing only accepts photos from its owner's own folder.
- Photos removed from a listing, or left over from an abandoned form, stay in the bucket for now.
  `storage_path` is there so a cleanup job can find them later.

## Limits the app enforces

- At most 8 photos per listing, and at least 1 to publish.
- At most 5 open listings (draft, published, or unavailable) per student.
- The `location_hint` can't contain a street number or unit number.
