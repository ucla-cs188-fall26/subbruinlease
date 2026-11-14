import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ID } from "@/lib/types";

/**
 * Sign-in with Supabase Auth (DATA_SOURCE=supabase): a 6-digit code emailed by Supabase.
 * Supabase keeps the session in its own cookies; src/proxy.ts refreshes them.
 * The mock-mode equivalents are ./login-codes.ts and ./session.ts.
 */

export type SendCodeResult = { ok: true } | { ok: false; reason: "cooldown" | "rejected" | "error"; message: string };

/** Emails a sign-in code. Creates the Supabase user on first sign-in (the UCLA hook checks the domain). */
export async function sendSupabaseCode(email: string): Promise<SendCodeResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (!error) return { ok: true };

  if (error.status === 429 || error.code === "over_email_send_rate_limit") {
    return { ok: false, reason: "cooldown", message: "Please wait a minute before requesting another code." };
  }
  // Raised by the before-user-created hook for non-UCLA addresses.
  if (error.status === 403 || error.status === 400) {
    console.warn(`[auth] Supabase refused sign-in for ${email}: ${error.message}`);
    return { ok: false, reason: "rejected", message: error.message };
  }
  console.error(`[auth] Supabase signInWithOtp failed (${error.status}): ${error.message}`);
  return { ok: false, reason: "error", message: "We couldn't send a code right now. Try again in a minute." };
}

export type VerifySupabaseResult =
  | { ok: true; userId: ID }
  | { ok: false; reason: "invalid" | "too_many" };

/** Checks the code and, if it's right, sets the Supabase session cookies. */
export async function verifySupabaseCode(email: string, code: string): Promise<VerifySupabaseResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (!error && data.user) return { ok: true, userId: data.user.id };

  if (error?.status === 429) return { ok: false, reason: "too_many" };
  // Supabase answers a wrong code and an expired one the same way (otp_expired), so
  // don't claim it expired when it may just be a typo.
  return { ok: false, reason: "invalid" };
}

/** The signed-in user's id from a verified Supabase session, or null. */
export async function readSupabaseUserId(): Promise<ID | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

export async function signOutSupabase() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
