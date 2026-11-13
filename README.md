# subBruinLease

Short-term housing, Bruin to Bruin. A place for UCLA students to post and find subleases for
summer, study abroad, internships, and other times they're away.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, Cache Components) + React 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4 — theme tokens live in `src/app/globals.css`
- [lucide-react](https://lucide.dev) icons
- Supabase (auth, database, storage). Until the database is ready, the app runs on fake data
  from local files.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional; defaults to fake data
npm run dev
```

Open http://localhost:3000.

| Script              | What it does              |
| ------------------- | ------------------------- |
| `npm run dev`       | Start the dev server      |
| `npm run build`     | Production build          |
| `npm run lint`      | ESLint                    |
| `npm run typecheck` | TypeScript, no emit       |
| `npm test`          | Unit tests (Vitest)       |

## Project structure

```
src/
  app/                 routes (pages, layouts)
  components/
    layout/            header, footer, logo
    ui/                Button, Card, Badge, form fields, Container
    listings/          listing display components
  lib/
    types.ts           data model (source of truth)
    data/              data-access layer: getDataStore()
      store.ts         the DataStore interface
      mock/            fake in-memory data (seed.ts) + implementation
    search.ts          Explore filters: date matching, URL params, sorting
    format.ts          money/date formatting
    labels.ts          human-readable labels for enums
docs/data-model.md     tables + access rules for the database
public/brand/          logo
```

## Data

Pages never talk to a database directly. They call `getDataStore()` from `@/lib/data`, which
returns an implementation of the `DataStore` interface:

- `DATA_SOURCE=mock` (default): fake data from `src/lib/data/mock/seed.ts`. Edits live in
  memory and reset when the dev server restarts.
- `DATA_SOURCE=supabase`: not built yet. See [docs/data-model.md](docs/data-model.md) for the
  tables the database needs.

Fake accounts: `demo@ucla.edu` (regular student with a few listings) and `admin@ucla.edu`.

### Supabase setup (from `main`)

The real database work lives alongside the fake data and isn't switched on yet:

- `supabase/migrations/`: tables, Row Level Security, the UCLA-only signup hook, and storage buckets
- `src/lib/database.types.ts`: TypeScript types generated from that schema
- `src/lib/supabase/`: browser and server clients, plus `updateSession` (session refresh, to be
  called from `src/proxy.ts`)
- `src/app/auth/confirm/`: the magic-link confirmation route, with `src/lib/auth/safe-next.ts`
  guarding its redirects (`npm run test:redirect`)

## Search & filters

The Explore page (`/`) keeps every filter in the URL, for example
`/?from=2027-06-15&to=2027-08-15&room=private&maxRent=1500`, so searches can be shared and the
Back button works. The rules live in `src/lib/search.ts` and are covered by
`src/lib/search.test.ts`:

- **Dates:** a listing matches only if your whole stay fits inside its availability window.
  Listings marked "flexible dates" get 7 days of slack on each end.
- **Text:** every word must appear in the title, description, neighborhood or location.
- Rent is a maximum and includes the limit. Room type, neighborhood and "furnished only" are
  exact matches.

## Listing pages

`/listings/[id]` shows photos, details, price, the poster, and similar places. Who can open
a listing is decided in `src/lib/listings.ts`:

| Status                    | Who can open it        |
| ------------------------- | ---------------------- |
| published, unavailable    | anyone with the link   |
| draft, closed, hidden     | the owner and admins   |

Everyone else gets a "This listing isn't available" page, and link previews never show a
private listing's title.

## Posting a listing

`/listings/new` is a five-part form (basics, dates and price, the space, photos, sublease
permission). Students can **save a draft** or **publish**. Validation rules live in
`src/lib/listing-schema.ts` and run on the server, so they can't be skipped.

Photos upload one at a time to `POST /api/uploads` as soon as they're picked. The browser
shrinks big phone photos first, then the server checks that the file really is an image and
re-encodes it, which strips location data. Locally, photos are saved in `.data/uploads/`
(ignored by git) and disappear from listings when the server restarts, like the rest of the
fake data.

## Managing listings

`/dashboard` (My Listings) shows a student's listings with status tabs. From there, or from
the listing page itself, owners can:

| From        | Actions                                   |
| ----------- | ----------------------------------------- |
| Draft       | Publish, Discard                          |
| Live        | Mark unavailable, Close                   |
| Unavailable | Mark available, Close                     |
| Closed      | none (post a new listing instead)         |
| Hidden      | none (set by moderators)                  |

These rules live in `src/lib/listings.ts`. Publishing needs at least one photo and a
move-out date in the future. `/listings/[id]/edit` reuses the posting form. Edits to a live
listing go up right away and have to stay complete; drafts can stay unfinished.

## Saved listings

Every listing card and listing page has a bookmark button. Signed-out visitors who tap it
are sent to sign in, then back to the same page. `/saved` lists everything a student saved,
newest first:

- **Available**: live listings, shown as cards
- **Not available right now**: the poster paused it. It may come back, so it stays
- **No longer available**: closed by the poster, or removed by moderators (no details shown)

Saved listings never disappear on their own; students remove them. Only live listings can
be newly saved, never your own, and up to 100 at a time. These rules live in
`src/lib/favorites.ts` and match the database's `favorites` policies.

## Sign-in

Students sign in with a UCLA email (`@ucla.edu` or `@g.ucla.edu`) and a 6-digit code. There are
no passwords.

- **Mock mode** (`DATA_SOURCE=mock`): codes aren't emailed yet. They're printed in the
  terminal running `npm run dev` and shown on the code screen. The login page also has
  one-click "Demo Bruin" and "Admin" buttons.
- Sessions are signed cookies (`src/lib/auth/session.ts`). Set `AUTH_SECRET` in production.
- `src/proxy.ts` sends signed-out visitors from private pages to `/login`. Every private page
  and server action also checks with `requireUser()` / `requireAdmin()` from
  `src/lib/auth/current-user.ts`.
- Anything that reads the signed-in user must be inside a `<Suspense>` boundary (a Next.js
  16 Cache Components rule).

## Theme

| Token          | Value     | Use                         |
| -------------- | --------- | --------------------------- |
| `bruin-600`    | `#3166AB` | Logo blue, primary actions  |
| `gold-400`     | `#F5BA3B` | Logo gold, highlights       |
| `cream`        | `#FCF9F2` | Page background             |
| `font-display` | Fredoka   | Headings, buttons           |
| `font-sans`    | Nunito    | Body text                   |
