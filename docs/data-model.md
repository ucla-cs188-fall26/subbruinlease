# Data model

This is what the app expects from the database. The TypeScript source of truth is
[`src/lib/types.ts`](../src/lib/types.ts), and every read and write goes through the
`DataStore` interface in [`src/lib/data/store.ts`](../src/lib/data/store.ts).

The app currently runs on fake in-memory data (`DATA_SOURCE=mock`). When the Supabase
database is ready, we add a Supabase implementation of `DataStore` that maps these tables
to the TypeScript types, then switch `DATA_SOURCE=supabase`.

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
| `published_at`       | timestamptz, null       | set the first time it's published                           |

Search (`DataStore.listings.search`) has to follow the rules in `src/lib/search.ts`. In SQL,
the date rule is roughly
`available_from - slack <= :from AND available_to + slack >= :to`, where
`slack = 7 days if flexible_dates else 0`.

Indexes worth having: `(status, published_at desc)`, `(owner_id)`, `(available_from, available_to)`, `(rent)`.

### `listing_images`

| Column       | Type                  | Notes                                       |
| ------------ | --------------------- | ------------------------------------------- |
| `id`         | uuid, PK              |                                             |
| `listing_id` | uuid → `listings.id`, on delete cascade |                           |
| `storage_path` | text                | path in the `listing-images` storage bucket. The app turns it into a URL (`url` in TypeScript) |
| `alt`        | text                  |                                             |
| `position`   | int                   | 0 = cover photo. Unique per listing         |

A listing can have at most 8 images.

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

## Access rules (Row Level Security)

The app checks these in server code too, but the database should enforce them as well.

| Table            | Read                                                         | Write                                                        |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `profiles`       | signed-in users can read public fields (not `email`). Users read their own row in full | users update their own row (not `role`/`status`). Admins update any |
| `listings`       | anyone can read `published` and `unavailable`. Owners read all of their own. Admins read all | owners insert and update their own. Admins update any (to set `hidden`) |
| `listing_images` | same as the parent listing                                   | owner of the parent listing                                  |
| `favorites`      | own rows only                                                | own rows only                                                |
| `inquiries`      | sender or recipient                                          | sender inserts. Recipient updates `status`                   |
| `reports`        | admins only (reporters can read their own)                   | any signed-in user inserts. Admins update                    |

Suspended users shouldn't be able to insert anything.

## Storage

- Bucket `listing-images`, publicly readable. Only the listing owner can write, under the path
  `{owner_id}/{filename}`.
- The app re-encodes every photo before storing it: WebP, at most 2000px on the long side,
  with metadata (including GPS location) removed. Uploads to the server are capped at 4 MB.
  See `src/lib/images.ts`.
- In the code, storage sits behind the `ImageStorage` interface in `src/lib/storage/`. Locally
  photos are written to `.data/uploads/` and served from `/uploads/{owner_id}/{file}.webp`.
  A Supabase version only needs to implement `save()` and return the bucket's public URL.

## Limits the app enforces

- At most 8 photos per listing, and at least 1 to publish.
- At most 5 open listings (draft, published, or unavailable) per student.
- The `location_hint` can't contain a street number or unit number.
