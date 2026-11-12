import "server-only";
import { LocalFileStorage } from "./local-files";

/**
 * Where listing photos are kept. Locally they're files under .data/uploads and served by
 * the /uploads route. With Supabase this becomes the `listing-images` storage bucket
 * (see docs/data-model.md); only this interface's implementation changes.
 */
export interface ImageStorage {
  /** Saves an already-processed WebP image and returns its public URL. */
  save(ownerId: string, data: Buffer): Promise<{ url: string }>;
  /** Reads a stored image, or null. Only used by the local /uploads route. */
  read(ownerId: string, file: string): Promise<Buffer | null>;
}

let storage: ImageStorage | undefined;

export function getImageStorage(): ImageStorage {
  const source = process.env.DATA_SOURCE ?? "mock";
  if (source !== "mock") {
    throw new Error(`No image storage for DATA_SOURCE=${source} yet. Add a Supabase implementation.`);
  }
  return (storage ??= new LocalFileStorage(process.env.UPLOAD_DIR ?? ".data/uploads"));
}
