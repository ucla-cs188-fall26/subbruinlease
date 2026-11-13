import type { Listing, ListingStatus } from "@/lib/types";
import { isOwner, type Viewer } from "@/lib/listings";

/** Most listings one student can keep saved at once. */
export const MAX_SAVED = 100;

/**
 * Only live listings can be newly saved, and never your own. Matches the database rule
 * ("verified users save visible listings"). Removing a saved listing is always allowed.
 */
export function canSaveListing(listing: Pick<Listing, "status" | "ownerId">, viewer: Viewer) {
  return listing.status === "published" && !isOwner(listing, viewer);
}

/**
 * How a saved listing shows up on the Saved page:
 * - available: live, opens normally
 * - paused: the poster marked it unavailable for now (still opens)
 * - closed: taken down by the poster (title kept so you know which one it was)
 * - removed: hidden by moderators, or no longer public for any other reason
 */
export type SavedState = "available" | "paused" | "closed" | "removed";

const STATE: Record<ListingStatus, SavedState> = {
  published: "available",
  unavailable: "paused",
  closed: "closed",
  hidden: "removed",
  draft: "removed",
};

export function savedState(listing: Pick<Listing, "status">): SavedState {
  return STATE[listing.status];
}
