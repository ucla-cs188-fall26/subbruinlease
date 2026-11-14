import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getDataStore } from "@/lib/data";
import type { Profile } from "@/lib/types";
import { readSessionUserId } from "./session";
import { readSupabaseUserId } from "./supabase-auth";

/** What the app knows about the signed-in user. Safe to pass to client components. */
export type CurrentUser = Pick<
  Profile,
  "id" | "email" | "displayName" | "avatarUrl" | "role" | "emailVerified"
>;

/**
 * The signed-in user, or null. Reads cookies, so any component calling this must be
 * inside a <Suspense> boundary. Deduplicated per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const userId = isMockAuth() ? await readSessionUserId() : await readSupabaseUserId();
  if (!userId) return null;

  const profile = await getDataStore().profiles.get(userId);
  if (!profile || profile.status !== "active") return null;

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
    emailVerified: profile.emailVerified,
  };
});

/** For protected pages and server actions: the user, or a redirect to /login. */
export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return user;
}

/** For admin pages and actions. Non-admins get sent home. */
export async function requireAdmin(nextPath?: string): Promise<CurrentUser> {
  const user = await requireUser(nextPath);
  if (user.role !== "admin") redirect("/");
  return user;
}

export function isMockAuth() {
  return (process.env.DATA_SOURCE ?? "mock") === "mock";
}
