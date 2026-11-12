import { getCurrentUser } from "@/lib/auth/current-user";
import { ImageError, processListingPhoto } from "@/lib/images";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/listing-schema";
import { getImageStorage } from "@/lib/storage";

/** Recent uploads per user, for a simple in-memory rate limit. */
const recent = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 60;

function rateLimited(userId: string) {
  const now = Date.now();
  const times = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  times.push(now);
  recent.set(userId, times);
  return times.length > MAX_PER_WINDOW;
}

const error = (message: string, status: number) => Response.json({ error: message }, { status });

/**
 * POST a single photo as multipart form data (field "file").
 * Returns { url } for the processed image. Signed-in students only.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return error("Please log in again to upload photos.", 401);
  if (rateLimited(user.id)) return error("You're uploading a lot of photos. Try again in a few minutes.", 429);

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return error("That photo is too large (max 4 MB).", 413);

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return error("Upload failed. Try again.", 400);
  }
  if (!(file instanceof File)) return error("No photo was attached.", 400);
  if (file.size > MAX_UPLOAD_BYTES) return error("That photo is too large (max 4 MB).", 413);
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return error("Use a JPEG, PNG, or WebP photo.", 415);
  }

  try {
    const processed = await processListingPhoto(Buffer.from(await file.arrayBuffer()));
    const { url } = await getImageStorage().save(user.id, processed);
    return Response.json({ url }, { status: 201 });
  } catch (err) {
    if (err instanceof ImageError) return error(err.message, 415);
    console.error("Photo upload failed", err);
    return error("Upload failed. Try again.", 500);
  }
}
