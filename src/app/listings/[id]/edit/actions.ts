"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { getDataStore } from "@/lib/data";
import { todayInLA } from "@/lib/format";
import type { FormState } from "@/lib/form-state";
import { canEditListing } from "@/lib/listings";
import { isAllowedPhotoUrl, listingSchema, readListingForm } from "@/lib/listing-schema";

/** Bound to a listing id on the edit page: updateListing.bind(null, id). */
export async function updateListing(listingId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(`/listings/${listingId}/edit`);
  const store = getDataStore();
  const listing = await store.listings.get(listingId);
  if (!listing || listing.ownerId !== user.id) return { error: "We couldn't find that listing." };
  if (!canEditListing(listing)) return { error: "This listing can't be edited anymore." };

  // Drafts can stay incomplete, or be published from here (with the checkbox).
  // Live and unavailable listings have to stay complete.
  const wasDraft = listing.status === "draft";
  const publishNow = wasDraft && formData.get("intent") === "publish";
  const schema = listingSchema({
    intent: wasDraft && !publishNow ? "draft" : "publish",
    requireConfirm: publishNow,
    today: todayInLA(),
  });

  const parsed = schema.safeParse(readListingForm(formData));
  if (!parsed.success) {
    return {
      error: "A few things need fixing. They're highlighted below.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const existing = listing.images.map((i) => i.url);
  if (!parsed.data.images.every((img) => isAllowedPhotoUrl(img.url, user.id, existing))) {
    return { fieldErrors: { photos: ["Something went wrong with your photos. Try re-adding them."] } };
  }

  await store.listings.update(listing.id, parsed.data);
  if (publishNow) await store.listings.setStatus(listing.id, "published");

  redirect(`/listings/${listing.id}?${publishNow ? "posted" : "updated"}=1`);
}
