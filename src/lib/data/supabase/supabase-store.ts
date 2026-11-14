import "server-only";
import type { Profile } from "@/lib/types";
import type { Tables } from "@/lib/database.types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { NotFoundError, type DataStore, type ProfileRepo } from "../store";

/**
 * DataStore backed by Supabase. Uses the service role (see src/lib/supabase/admin.ts), so
 * Row Level Security doesn't apply here: callers check permissions, as with the mock store.
 * Maps snake_case rows to the camelCase types in src/lib/types.ts.
 */

type ProfileRow = Tables<"profiles">;

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    gradYear: row.grad_year,
    bio: row.bio,
    emailVerified: row.email_verified,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  };
}

/** Throws with the Supabase error message, so failures show up in server logs. */
function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Supabase ${what} failed: ${result.error.message}`);
  return result.data;
}

function profileRepo(): ProfileRepo {
  const db = () => getSupabaseAdmin();

  return {
    async get(id) {
      const res = await db().from("profiles").select("*").eq("id", id).maybeSingle();
      const row = check(res, "profiles.get");
      return row ? toProfile(row) : null;
    },
    async getByEmail(email) {
      const res = await db()
        .from("profiles")
        .select("*")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();
      const row = check(res, "profiles.getByEmail");
      return row ? toProfile(row) : null;
    },
    async create() {
      // With Supabase, the profile row is created by the on_auth_user_created trigger
      // when Supabase Auth creates the user. Nothing in the Supabase sign-in flow calls this.
      throw new Error("profiles.create isn't used with Supabase: the auth trigger creates profiles.");
    },
    async update(id, patch) {
      const res = await db()
        .from("profiles")
        .update({
          ...(patch.displayName !== undefined && { display_name: patch.displayName }),
          ...(patch.avatarUrl !== undefined && { avatar_url: patch.avatarUrl }),
          ...(patch.gradYear !== undefined && { grad_year: patch.gradYear }),
          ...(patch.bio !== undefined && { bio: patch.bio }),
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = check(res, "profiles.update");
      if (!row) throw new NotFoundError("Profile", id);
      return toProfile(row);
    },
    async setStatus(id, status) {
      const res = await db().from("profiles").update({ status }).eq("id", id).select("*").maybeSingle();
      const row = check(res, "profiles.setStatus");
      if (!row) throw new NotFoundError("Profile", id);
      return toProfile(row);
    },
    async list() {
      const res = await db().from("profiles").select("*").order("created_at", { ascending: false });
      return (check(res, "profiles.list") ?? []).map(toProfile);
    },
  };
}

/** Repos that aren't wired to Supabase yet throw a clear error on any call. */
function notBuiltYet<T extends object>(name: string): T {
  return new Proxy({} as T, {
    get(_target, method) {
      if (typeof method !== "string" || method === "then") return undefined;
      return () => {
        throw new Error(`${name}.${method} isn't connected to Supabase yet.`);
      };
    },
  });
}

export function createSupabaseStore(): DataStore {
  return {
    profiles: profileRepo(),
    listings: notBuiltYet("listings"),
    favorites: notBuiltYet("favorites"),
    inquiries: notBuiltYet("inquiries"),
    reports: notBuiltYet("reports"),
  };
}
