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
  lib/                 helpers
public/brand/          logo
```

## Theme

| Token          | Value     | Use                         |
| -------------- | --------- | --------------------------- |
| `bruin-600`    | `#3166AB` | Logo blue, primary actions  |
| `gold-400`     | `#F5BA3B` | Logo gold, highlights       |
| `cream`        | `#FCF9F2` | Page background             |
| `font-display` | Fredoka   | Headings, buttons           |
| `font-sans`    | Nunito    | Body text                   |
