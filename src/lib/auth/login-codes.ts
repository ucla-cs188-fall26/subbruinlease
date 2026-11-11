import "server-only";
import { createHash, randomInt } from "node:crypto";
import { normalizeEmail } from "./email";

/**
 * One-time 6-digit sign-in codes (mock mode).
 * Kept in memory, so they reset when the server restarts. Supabase Auth replaces this.
 */

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

type PendingCode = {
  hash: string;
  expiresAt: number;
  issuedAt: number;
  attempts: number;
  /** Plain code, kept only so dev mode can show it on screen. */
  devCode: string;
};

const store = globalThis as unknown as { __sblLoginCodes?: Map<string, PendingCode> };
const codes = (store.__sblLoginCodes ??= new Map());

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

export type IssueResult =
  | { ok: true; code: string }
  | { ok: false; reason: "cooldown"; retryInSeconds: number };

export function issueLoginCode(email: string, now = Date.now()): IssueResult {
  const key = normalizeEmail(email);
  const existing = codes.get(key);
  if (existing && now - existing.issuedAt < RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      reason: "cooldown",
      retryInSeconds: Math.ceil((RESEND_COOLDOWN_MS - (now - existing.issuedAt)) / 1000),
    };
  }
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  codes.set(key, {
    hash: hash(code),
    expiresAt: now + CODE_TTL_MS,
    issuedAt: now,
    attempts: 0,
    devCode: code,
  });
  return { ok: true, code };
}

export type VerifyResult = { ok: true } | { ok: false; reason: "invalid" | "expired" | "too_many" };

export function verifyLoginCode(email: string, code: string, now = Date.now()): VerifyResult {
  const key = normalizeEmail(email);
  const pending = codes.get(key);
  if (!pending) return { ok: false, reason: "expired" };
  if (pending.expiresAt < now) {
    codes.delete(key);
    return { ok: false, reason: "expired" };
  }
  if (pending.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many" };

  pending.attempts += 1;
  if (pending.hash !== hash(code.trim())) {
    return { ok: false, reason: pending.attempts >= MAX_ATTEMPTS ? "too_many" : "invalid" };
  }
  codes.delete(key);
  return { ok: true };
}

/** Dev/mock only: the code currently waiting for this email, to show on screen. */
export function peekDevLoginCode(email: string, now = Date.now()) {
  const pending = codes.get(normalizeEmail(email));
  return pending && pending.expiresAt >= now ? pending.devCode : null;
}
