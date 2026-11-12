import type { Listing, ListingStatus, UserRole } from "@/lib/types";

/** Statuses anyone (even signed out) can open by link. Matches the RLS rules in docs/data-model.md. */
export const PUBLIC_STATUSES: readonly ListingStatus[] = ["published", "unavailable"];

export type Viewer = { id: string; role: UserRole } | null;

export function isPublicListing(listing: Pick<Listing, "status">) {
  return PUBLIC_STATUSES.includes(listing.status);
}

export function isOwner(listing: Pick<Listing, "ownerId">, viewer: Viewer) {
  return viewer !== null && viewer.id === listing.ownerId;
}

/**
 * Who can open a listing's page:
 * - published / unavailable: everyone
 * - draft / closed / hidden: only the owner and admins
 */
export function canViewListing(listing: Pick<Listing, "status" | "ownerId">, viewer: Viewer) {
  if (isPublicListing(listing)) return true;
  return isOwner(listing, viewer) || viewer?.role === "admin";
}

/** Only published listings can be messaged, and never by their owner. */
export function canContactOwner(listing: Pick<Listing, "status" | "ownerId">, viewer: Viewer) {
  return listing.status === "published" && !isOwner(listing, viewer);
}

/**
 * "More places like this": other published listings, same neighborhood first,
 * then the closest rent.
 */
export function pickSimilar<T extends Listing>(listing: Listing, candidates: T[], count = 3): T[] {
  return candidates
    .filter((c) => c.id !== listing.id && c.status === "published")
    .map((c) => ({
      c,
      score: (c.neighborhood === listing.neighborhood ? 0 : 10_000) + Math.abs(c.rent - listing.rent),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map(({ c }) => c);
}

/* ------------------------------------------------------------------ */
/* Status changes the owner can make                                  */
/* ------------------------------------------------------------------ */

export type StatusAction = "publish" | "mark_unavailable" | "mark_available" | "close";

const ACTION_RESULT: Record<StatusAction, ListingStatus> = {
  publish: "published",
  mark_unavailable: "unavailable",
  mark_available: "published",
  close: "closed",
};

/**
 *   draft ──publish──▶ published ◀──mark_available / mark_unavailable──▶ unavailable
 *     │                    │                                                │
 *     └────────────────────┴──────────────────close─────────────────────────┘──▶ closed
 *
 * Closed is final (post a new listing instead). Hidden listings are managed by admins only.
 */
const OWNER_ACTIONS: Record<ListingStatus, StatusAction[]> = {
  draft: ["publish", "close"],
  published: ["mark_unavailable", "close"],
  unavailable: ["mark_available", "close"],
  closed: [],
  hidden: [],
};

export function ownerActions(status: ListingStatus): StatusAction[] {
  return OWNER_ACTIONS[status];
}

export function statusAfter(action: StatusAction): ListingStatus {
  return ACTION_RESULT[action];
}

/** Owners can edit anything that isn't closed or hidden by moderators. */
export function canEditListing(listing: Pick<Listing, "status">) {
  return listing.status !== "closed" && listing.status !== "hidden";
}

/**
 * Why a listing can't go live right now, or null if it can. Drafts are saved without
 * photos, and dates can pass while something sits in drafts or stays unavailable.
 */
export function publishProblem(
  listing: Pick<Listing, "images" | "availableTo">,
  today: string,
): string | null {
  if (listing.images.length === 0) return "Add at least one photo before publishing.";
  if (listing.availableTo <= today) return "The move-out date has passed. Update the dates first.";
  return null;
}
