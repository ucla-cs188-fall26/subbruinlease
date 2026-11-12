"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { getDataStore } from "@/lib/data";
import { todayInLA } from "@/lib/format";
import { ownerActions, publishProblem, statusAfter, type StatusAction } from "@/lib/listings";

export type StatusResult = { ok: true } | { ok: false; error: string };

const ACTIONS: StatusAction[] = ["publish", "mark_unavailable", "mark_available", "close"];

/** Publish, pause, re-open, or close one of your listings. */
export async function changeListingStatus(listingId: string, action: StatusAction): Promise<StatusResult> {
  const user = await requireUser("/dashboard");
  if (!ACTIONS.includes(action)) return { ok: false, error: "Unknown action." };

  const store = getDataStore();
  const listing = await store.listings.get(listingId);
  if (!listing || listing.ownerId !== user.id) return { ok: false, error: "We couldn't find that listing." };

  if (!ownerActions(listing.status).includes(action)) {
    return { ok: false, error: "That listing can't be changed that way anymore. Refresh the page." };
  }
  if (action === "publish" || action === "mark_available") {
    const problem = publishProblem(listing, todayInLA());
    if (problem) return { ok: false, error: problem };
  }

  await store.listings.setStatus(listing.id, statusAfter(action));
  refresh();
  return { ok: true };
}
