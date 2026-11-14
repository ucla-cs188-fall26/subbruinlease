import "server-only";
import type { DataStore } from "./store";
import { createMockStore } from "./mock/mock-store";
import { createSupabaseStore } from "./supabase/supabase-store";

export type { DataStore } from "./store";
export { NotFoundError } from "./store";

/**
 * Which backend to use. Set DATA_SOURCE in .env.local.
 * - "mock" (default): in-memory fake data from ./mock/seed.ts. Changes reset when the
 *   dev server restarts.
 * - "supabase": the Supabase database (./supabase/supabase-store.ts), via the service role.
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
      store = createSupabaseStore();
      break;
    default:
      throw new Error(`Unknown DATA_SOURCE "${source}". Use "mock" or "supabase".`);
  }

  globalForStore.__sblStore = store;
  return store;
}
