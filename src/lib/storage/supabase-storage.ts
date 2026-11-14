import "server-only";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ImageStorage } from "./index";
import { LISTING_IMAGES_BUCKET } from "./photo-urls";

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

/**
 * Photos in the public `listing-images` bucket, at {ownerId}/{random}.webp.
 * Uploads go through the service role after /api/uploads has checked the user and
 * processed the image, so the bucket's own policies don't apply here.
 */
export class SupabaseImageStorage implements ImageStorage {
  async save(ownerId: string, data: Buffer) {
    if (!SAFE_SEGMENT.test(ownerId)) throw new Error("Invalid owner id");
    const path = `${ownerId}/${randomUUID().replaceAll("-", "")}.webp`;
    const bucket = getSupabaseAdmin().storage.from(LISTING_IMAGES_BUCKET);
    const { error } = await bucket.upload(path, data, {
      contentType: "image/webp",
      cacheControl: "31536000", // file names are never reused
      upsert: false,
    });
    if (error) throw new Error(`Supabase storage upload failed: ${error.message}`);
    return { url: bucket.getPublicUrl(path).data.publicUrl };
  }

  /** Not needed: browsers load bucket photos straight from Supabase. */
  async read() {
    return null;
  }
}
