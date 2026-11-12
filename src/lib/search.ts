import { NEIGHBORHOODS, type DateString, type Listing, type Neighborhood, type RoomType } from "@/lib/types";

/**
 * Search & filter rules for the Explore page.
 *
 * Kept as plain functions so they're easy to unit test (src/lib/search.test.ts) and so the
 * future Supabase store can mirror the same rules in SQL.
 */

export const SORTS = ["newest", "price_asc", "price_desc", "soonest"] as const;
export type Sort = (typeof SORTS)[number];

export const VIEWS = ["grid", "list"] as const;
export type View = (typeof VIEWS)[number];

const ROOM_TYPES: RoomType[] = ["private", "shared", "entire"];

/** How many days a "flexible dates" listing can stretch to fit a search. */
export const FLEX_DAYS = 7;

export const RENT_SLIDER = { min: 500, max: 3000, step: 50 } as const;

export interface ListingFilters {
  /** Free text: matched against title, description, neighborhood, and location hint. */
  q: string;
  /** Desired move-in date. */
  from: DateString | null;
  /** Desired move-out date. */
  to: DateString | null;
  maxRent: number | null;
  roomTypes: RoomType[];
  furnished: boolean;
  neighborhood: Neighborhood | null;
  sort: Sort;
}

export const emptyFilters: ListingFilters = {
  q: "",
  from: null,
  to: null,
  maxRent: null,
  roomTypes: [],
  furnished: false,
  neighborhood: null,
  sort: "newest",
};

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: unknown): value is DateString {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Shift a "YYYY-MM-DD" date by whole days. */
export function addDays(date: DateString, days: number): DateString {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Does the listing's availability window cover the stay the student wants?
 *
 * - from + to: the whole stay must fit inside the window.
 *   (Available Jun 1–Aug 31 matches Jun 15–Aug 15, but not Sep 1–Sep 30.)
 * - only from: the listing must be available on the move-in date.
 * - only to: the listing must be available through the move-out date.
 * - neither: always matches.
 *
 * Listings marked `flexibleDates` get FLEX_DAYS of slack on each end.
 * "YYYY-MM-DD" strings compare correctly as plain strings.
 */
export function coversDates(
  listing: Pick<Listing, "availableFrom" | "availableTo" | "flexibleDates">,
  from: DateString | null,
  to: DateString | null,
) {
  const slack = listing.flexibleDates ? FLEX_DAYS : 0;
  const start = slack ? addDays(listing.availableFrom, -slack) : listing.availableFrom;
  const end = slack ? addDays(listing.availableTo, slack) : listing.availableTo;

  if (from && to) return start <= from && end >= to;
  if (from) return start <= from && end > from;
  if (to) return start < to && end >= to;
  return true;
}

/* ------------------------------------------------------------------ */
/* Matching & sorting                                                  */
/* ------------------------------------------------------------------ */

function matchesText(listing: Listing, q: string) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = [listing.title, listing.description, listing.neighborhood, listing.locationHint]
    .join(" ")
    .toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

export function matchesFilters(listing: Listing, f: ListingFilters) {
  return (
    matchesText(listing, f.q) &&
    coversDates(listing, f.from, f.to) &&
    (f.maxRent === null || listing.rent <= f.maxRent) &&
    (f.roomTypes.length === 0 || f.roomTypes.includes(listing.roomType)) &&
    (!f.furnished || listing.furnished) &&
    (f.neighborhood === null || listing.neighborhood === f.neighborhood)
  );
}

export function compareListings(sort: Sort) {
  return (a: Listing, b: Listing): number => {
    switch (sort) {
      case "price_asc":
        return a.rent - b.rent || newest(a, b);
      case "price_desc":
        return b.rent - a.rent || newest(a, b);
      case "soonest":
        return a.availableFrom.localeCompare(b.availableFrom) || newest(a, b);
      case "newest":
      default:
        return newest(a, b);
    }
  };
}

function newest(a: Listing, b: Listing) {
  return (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt);
}

/* ------------------------------------------------------------------ */
/* URL <-> filters                                                     */
/* ------------------------------------------------------------------ */

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).flatMap((s) => s.split(","));

/** Turn URL search params into valid filters. Anything invalid is ignored, never an error. */
export function parseFilters(params: RawParams): ListingFilters {
  const q = (first(params.q) ?? "").trim().slice(0, 100);

  let from = isValidDate(first(params.from)) ? first(params.from)! : null;
  let to = isValidDate(first(params.to)) ? first(params.to)! : null;
  if (from && to && from > to) [from, to] = [to, from];

  const rent = Number(first(params.maxRent));
  const maxRent = Number.isFinite(rent) && rent > 0 ? Math.round(rent) : null;

  const roomTypes = [...new Set(all(params.room))].filter((r): r is RoomType =>
    (ROOM_TYPES as string[]).includes(r),
  );

  const furnished = first(params.furnished) === "1";

  const hood = first(params.hood);
  const neighborhood = (NEIGHBORHOODS as readonly string[]).includes(hood ?? "")
    ? (hood as Neighborhood)
    : null;

  const sortParam = first(params.sort);
  const sort = (SORTS as readonly string[]).includes(sortParam ?? "") ? (sortParam as Sort) : "newest";

  return { q, from, to, maxRent, roomTypes, furnished, neighborhood, sort };
}

/** Turn filters back into URL params, leaving out defaults so URLs stay short. */
export function filtersToParams(f: ListingFilters, extra: Record<string, string | null> = {}) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.maxRent !== null) p.set("maxRent", String(f.maxRent));
  if (f.roomTypes.length) p.set("room", f.roomTypes.join(","));
  if (f.furnished) p.set("furnished", "1");
  if (f.neighborhood) p.set("hood", f.neighborhood);
  if (f.sort !== "newest") p.set("sort", f.sort);
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  return p;
}

export function parseView(params: RawParams): View {
  return first(params.view) === "list" ? "list" : "grid";
}

/** Number of active filters (not counting sort), for the "Filters (3)" badge. */
export function countActiveFilters(f: ListingFilters) {
  return (
    (f.q ? 1 : 0) +
    (f.from || f.to ? 1 : 0) +
    (f.maxRent !== null ? 1 : 0) +
    (f.roomTypes.length ? 1 : 0) +
    (f.furnished ? 1 : 0) +
    (f.neighborhood ? 1 : 0)
  );
}
