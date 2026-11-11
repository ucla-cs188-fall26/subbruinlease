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

## Theme

| Token          | Value     | Use                         |
| -------------- | --------- | --------------------------- |
| `bruin-600`    | `#3166AB` | Logo blue, primary actions  |
| `gold-400`     | `#F5BA3B` | Logo gold, highlights       |
| `cream`        | `#FCF9F2` | Page background             |
| `font-display` | Fredoka   | Headings, buttons           |
| `font-sans`    | Nunito    | Body text                   |
