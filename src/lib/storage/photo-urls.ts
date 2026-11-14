/**
 * Where uploaded listing photos live, as URLs. Shared by the server (upload checks) and
 * the photo uploader, so it only reads NEXT_PUBLIC_ env vars.
 */

export const LISTING_IMAGES_BUCKET = "listing-images";

/** Mock mode: files served by the /uploads route. */
const LOCAL_UPLOAD_URL = /^\/uploads\/([A-Za-z0-9_-]+)\/[A-Za-z0-9_-]+\.webp$/;

/** Public URLs of the Supabase bucket start with this, or null if Supabase isn't configured. */
export function bucketPublicPrefix(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base.replace(/\/+$/, "")}/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/` : null;
}

/** The bucket path ("{ownerId}/{file}.webp") of a Supabase photo URL, or null for any other URL. */
export function bucketPathOf(url: string): string | null {
  const prefix = bucketPublicPrefix();
  if (!prefix || !url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  return /^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.webp$/.test(path) ? path : null;
}

/** True if `url` is a photo this user uploaded (to local files or the Supabase bucket). */
export function isOwnUpload(url: string, ownerId: string): boolean {
  const local = LOCAL_UPLOAD_URL.exec(url);
  if (local) return local[1] === ownerId;
  return bucketPathOf(url)?.startsWith(`${ownerId}/`) ?? false;
}
