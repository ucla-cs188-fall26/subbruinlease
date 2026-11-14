import "server-only";
import { LocalFileStorage } from "./local-files";
import { SupabaseImageStorage } from "./supabase-storage";

/**
 * Where listing photos are kept. In mock mode they're files under .data/uploads, served by
 * the /uploads route. With DATA_SOURCE=supabase they go to the public `listing-images`
 * storage bucket (see docs/data-model.md).
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
  if (source === "supabase") return (storage ??= new SupabaseImageStorage());
  if (source !== "mock") throw new Error(`Unknown DATA_SOURCE: ${source}`);
  return (storage ??= new LocalFileStorage(process.env.UPLOAD_DIR ?? ".data/uploads"));
}
