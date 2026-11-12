"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { getDataStore } from "@/lib/data";
import { todayInLA } from "@/lib/format";
import {
  isAllowedPhotoUrl,
  listingSchema,
  MAX_OPEN_LISTINGS,
  readListingForm,
} from "@/lib/listing-schema";
import type { FormState } from "@/lib/form-state";
import { countOpenListings } from "@/lib/listing-limits";

export async function createListing(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/listings/new");
  const intent = formData.get("intent") === "draft" ? "draft" : "publish";

  const parsed = listingSchema({ intent, today: todayInLA() }).safeParse(readListingForm(formData));
  if (!parsed.success) {
    return {
      error: "A few things need fixing. They're highlighted below.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  // Photos must be ones this user uploaded through /api/uploads.
  if (!parsed.data.images.every((img) => isAllowedPhotoUrl(img.url, user.id))) {
    return { fieldErrors: { photos: ["Something went wrong with your photos. Try re-adding them."] } };
  }

  if ((await countOpenListings(user.id)) >= MAX_OPEN_LISTINGS) {
    return {
      error: `You can have up to ${MAX_OPEN_LISTINGS} open listings at a time. Close one you don't need anymore first.`,
    };
  }

  const listing = await getDataStore().listings.create(
    user.id,
    parsed.data,
    intent === "publish" ? "published" : "draft",
  );

  redirect(`/listings/${listing.id}?${intent === "publish" ? "posted" : "saved"}=1`);
}
