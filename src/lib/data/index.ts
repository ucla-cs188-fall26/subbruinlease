import "server-only";
import type { DataStore } from "./store";
import { createMockStore } from "./mock/mock-store";

export type { DataStore } from "./store";
export { NotFoundError } from "./store";

/**
 * Which backend to use. Set DATA_SOURCE in .env.local.
 * - "mock" (default): in-memory fake data from ./mock/seed.ts. Changes reset when the
 *   dev server restarts.
 * - "supabase": not built yet. Add ./supabase/supabase-store.ts implementing DataStore.
 */
const source = process.env.DATA_SOURCE ?? "mock";

// Keep one instance across hot reloads in dev so in-memory changes aren't wiped.
const globalForStore = globalThis as unknown as { __sblStore?: DataStore };

export function getDataStore(): DataStore {
  if (globalForStore.__sblStore) return globalForStore.__sblStore;

  let store: DataStore;
  switch (source) {
    case "mock":
      store = createMockStore();
      break;
    case "supabase":
      throw new Error(
        "DATA_SOURCE=supabase isn't implemented yet. See docs/data-model.md, then add a Supabase DataStore.",
      );
    default:
      throw new Error(`Unknown DATA_SOURCE "${source}". Use "mock" or "supabase".`);
  }

  globalForStore.__sblStore = store;
  return store;
}
