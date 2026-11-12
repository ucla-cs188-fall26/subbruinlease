import "server-only";
import { getDataStore } from "@/lib/data";

/** Draft, published, and unavailable listings count toward MAX_OPEN_LISTINGS. */
export async function countOpenListings(ownerId: string) {
  const mine = await getDataStore().listings.list({
    ownerId,
    status: ["draft", "published", "unavailable"],
  });
  return mine.length;
}
