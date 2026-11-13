"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDataStore } from "@/lib/data";
import { canSaveListing, MAX_SAVED } from "@/lib/favorites";

export type SaveResult =
  | { ok: true; saved: boolean }
  | { ok: false; error: string; signIn?: true };

/** Save or un-save a listing for the signed-in student. */
export async function setSaved(listingId: string, save: boolean): Promise<SaveResult> {
  if (typeof listingId !== "string" || typeof save !== "boolean") {
    return { ok: false, error: "Something went wrong. Refresh and try again." };
  }

  // Returning (not redirecting) lets the button send people to /login with the right
  // "next" page, so they land back where they were.
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save listings.", signIn: true };

  const store = getDataStore();

  if (!save) {
    await store.favorites.remove(user.id, listingId);
    refresh();
    return { ok: true, saved: false };
  }

  const listing = await store.listings.get(listingId);
  if (!listing || !canSaveListing(listing, user)) {
    return {
      ok: false,
      error: listing?.ownerId === user.id ? "You can’t save your own listing." : "This listing can’t be saved right now.",
    };
  }

  const savedIds = await store.favorites.listIds(user.id);
  if (!savedIds.includes(listingId)) {
    if (savedIds.length >= MAX_SAVED) {
      return { ok: false, error: `You can keep up to ${MAX_SAVED} saved listings. Remove a few first.` };
    }
    await store.favorites.add(user.id, listingId);
  }

  refresh();
  return { ok: true, saved: true };
}
