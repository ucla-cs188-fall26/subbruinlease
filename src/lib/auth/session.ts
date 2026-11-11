import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { ID } from "@/lib/types";

/**
 * Mock-mode sessions: a signed cookie holding the user id and an expiry.
 * Format: "<userId>.<expiresAtMs>.<signature>"
 *
 * When we move to Supabase Auth, Supabase manages its own session cookies and this
 * file gets replaced; nothing outside src/lib/auth reads the cookie directly.
 */

export const SESSION_COOKIE = "sbl_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV !== "production" || (process.env.DATA_SOURCE ?? "mock") === "mock") {
    return "dev-only-insecure-secret-change-me";
  }
  throw new Error("AUTH_SECRET must be set in production.");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeSession(userId: ID, expiresAt: number) {
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** Returns the user id if the cookie is authentic and unexpired, otherwise null. */
export function decodeSession(value: string | undefined, now = Date.now()): ID | null {
  if (!value) return null;
  const lastDot = value.lastIndexOf(".");
  if (lastDot < 0) return null;
  const payload = value.slice(0, lastDot);
  const signature = value.slice(lastDot + 1);

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  const sep = payload.lastIndexOf(".");
  const userId = payload.slice(0, sep);
  const expiresAt = Number(payload.slice(sep + 1));
  if (!userId || !Number.isFinite(expiresAt) || expiresAt < now) return null;
  return userId;
}

export async function createSession(userId: ID) {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  (await cookies()).set(SESSION_COOKIE, encodeSession(userId, expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readSessionUserId(): Promise<ID | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}
