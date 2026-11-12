import "server-only";
import sharp from "sharp";
import { PHOTO_MAX_DIMENSION } from "@/lib/listing-schema";

export class ImageError extends Error {}

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

/**
 * Checks that the bytes really are a JPEG/PNG/WebP (not just named like one), then
 * re-encodes to WebP: rotated upright, at most 2000px on the long side, and with all
 * metadata removed. Phone photos often carry GPS coordinates in their EXIF data, so
 * stripping it keeps posters' exact locations private.
 */
export async function processListingPhoto(input: Buffer): Promise<Buffer> {
  let format: string | undefined;
  try {
    ({ format } = await sharp(input).metadata());
  } catch {
    throw new ImageError("That file doesn't look like an image.");
  }
  if (!format || !ALLOWED_FORMATS.has(format)) {
    throw new ImageError("Use a JPEG, PNG, or WebP photo.");
  }

  try {
    return await sharp(input, { limitInputPixels: 100_000_000 })
      .rotate()
      .resize({
        width: PHOTO_MAX_DIMENSION,
        height: PHOTO_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ImageError("We couldn't read that photo. Try a different one.");
  }
}
