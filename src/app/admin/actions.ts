"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { getDataStore } from "@/lib/data";

export type AdminResult = { ok: true } | { ok: false; error: string };

/** Close every open report on a listing. */
async function closeOpenReports(listingId: string, status: "resolved" | "dismissed", adminId: string) {
  const store = getDataStore();
  const open = await store.reports.list({ listingId, status: "open" });
  await Promise.all(open.map((r) => store.reports.resolve(r.id, status, adminId)));
}

/** Take a listing down. Its open reports are marked resolved. */
export async function hideListing(listingId: string): Promise<AdminResult> {
  const admin = await requireAdmin("/admin");
  const store = getDataStore();
  const listing = await store.listings.get(listingId);
  if (!listing) return { ok: false, error: "Listing not found." };
  if (listing.status !== "hidden") await store.listings.setStatus(listing.id, "hidden");
  await closeOpenReports(listing.id, "resolved", admin.id);
  refresh();
  return { ok: true };
}

/** Put a hidden listing back up (as live). */
export async function restoreListing(listingId: string): Promise<AdminResult> {
  await requireAdmin("/admin");
  const store = getDataStore();
  const listing = await store.listings.get(listingId);
  if (!listing || listing.status !== "hidden") return { ok: false, error: "That listing isn’t hidden." };
  await store.listings.setStatus(listing.id, "published");
  refresh();
  return { ok: true };
}

/** The reports were wrong or already handled: close them and leave the listing up. */
export async function dismissReports(listingId: string): Promise<AdminResult> {
  const admin = await requireAdmin("/admin");
  await closeOpenReports(listingId, "dismissed", admin.id);
  refresh();
  return { ok: true };
}

/**
 * Suspend a student: they're signed out everywhere (sessions stop working) and all
 * their live listings are hidden. Admins can't be suspended here.
 */
export async function suspendUser(userId: string): Promise<AdminResult> {
  const admin = await requireAdmin("/admin");
  const store = getDataStore();
  const profile = await store.profiles.get(userId);
  if (!profile) return { ok: false, error: "User not found." };
  if (profile.id === admin.id || profile.role === "admin") return { ok: false, error: "Admins can’t be suspended here." };

  await store.profiles.setStatus(profile.id, "suspended");
  const theirs = await store.listings.list({ ownerId: profile.id, status: ["published", "unavailable"] });
  for (const l of theirs) {
    await store.listings.setStatus(l.id, "hidden");
    await closeOpenReports(l.id, "resolved", admin.id);
  }
  refresh();
  return { ok: true };
}

/** Lift a suspension. Their hidden listings stay hidden until restored one by one. */
export async function unsuspendUser(userId: string): Promise<AdminResult> {
  await requireAdmin("/admin");
  const store = getDataStore();
  const profile = await store.profiles.get(userId);
  if (!profile || profile.status !== "suspended") return { ok: false, error: "That account isn’t suspended." };
  await store.profiles.setStatus(profile.id, "active");
  refresh();
  return { ok: true };
}
