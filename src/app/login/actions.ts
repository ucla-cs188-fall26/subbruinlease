"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDataStore } from "@/lib/data";
import { defaultDisplayName, isUclaEmail, normalizeEmail, safeNextPath } from "@/lib/auth/email";
import { issueLoginCode, verifyLoginCode } from "@/lib/auth/login-codes";
import { createSession, destroySession } from "@/lib/auth/session";
import { isMockAuth } from "@/lib/auth/current-user";
import { sendSupabaseCode, signOutSupabase, verifySupabaseCode } from "@/lib/auth/supabase-auth";
import type { FormState } from "@/lib/form-state";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your UCLA email.")
  .pipe(z.email("That doesn't look like an email address."))
  .refine(isUclaEmail, "Use your @ucla.edu or @g.ucla.edu email.");

/** Mock mode: codes aren't emailed. They're logged and shown on the verify page. */
async function sendLoginCode(email: string, code: string) {
  console.info(`[auth] Sign-in code for ${email}: ${code}`);
}

const SUSPENDED = "This account has been suspended. Contact the subBruinLease team for help.";

function verifyUrl(email: string, next: string, sent?: boolean) {
  const params = new URLSearchParams({ email, next });
  if (sent) params.set("sent", "1");
  return `/login/verify?${params}`;
}

/** Step 1: email → send a code. */
export async function requestCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const next = safeNextPath(formData.get("next"));
  const parsed = emailSchema.safeParse(formData.get("email") ?? "");
  if (!parsed.success) {
    return { fieldErrors: { email: [parsed.error.issues[0].message] } };
  }
  const email = normalizeEmail(parsed.data);

  const existing = await getDataStore().profiles.getByEmail(email);
  if (existing?.status === "suspended") return { error: SUSPENDED };

  if (!isMockAuth()) {
    const sent = await sendSupabaseCode(email);
    // On cooldown a code was sent moments ago; just continue to the code screen.
    if (!sent.ok && sent.reason !== "cooldown") return { error: sent.message };
    redirect(verifyUrl(email, next, sent.ok));
  }

  const issued = issueLoginCode(email);
  if (!issued.ok) {
    // A code was sent moments ago; just continue to the code screen.
    redirect(verifyUrl(email, next));
  }
  await sendLoginCode(email, issued.code);
  redirect(verifyUrl(email, next, true));
}

/** Resend from the verify screen. */
export async function resendCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!isUclaEmail(email)) return { error: "Start over with your UCLA email." };

  if (!isMockAuth()) {
    const sent = await sendSupabaseCode(email);
    return sent.ok ? { message: "New code sent." } : { error: sent.message };
  }

  const issued = issueLoginCode(email);
  if (!issued.ok) return { error: `Please wait ${issued.retryInSeconds}s before requesting another code.` };
  await sendLoginCode(email, issued.code);
  refresh(); // re-render so the dev-mode code on screen updates
  return { message: "New code sent." };
}

/** Step 2: code → session. New users go to their profile to finish setting up. */
export async function verifyCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const next = safeNextPath(formData.get("next"));

  if (!isUclaEmail(email)) return { error: "Start over with your UCLA email." };
  if (!/^\d{6}$/.test(code)) return { fieldErrors: { code: ["Enter the 6-digit code."] } };

  if (!isMockAuth()) return verifyWithSupabase(email, code, next);

  const result = verifyLoginCode(email, code);
  if (!result.ok) {
    const messages = {
      invalid: "That code isn't right. Check your email and try again.",
      expired: "That code has expired. Request a new one.",
      too_many: "Too many attempts. Request a new code.",
    } as const;
    return { fieldErrors: { code: [messages[result.reason]] } };
  }

  const store = getDataStore();
  let profile = await store.profiles.getByEmail(email);
  const isNew = !profile;
  if (!profile) {
    profile = await store.profiles.create({ email, displayName: defaultDisplayName(email) });
  }
  if (profile.status === "suspended") return { error: SUSPENDED };

  await createSession(profile.id);
  redirect(isNew ? `/profile?welcome=1&next=${encodeURIComponent(next)}` : next);
}

/**
 * Supabase sign-in. Supabase creates the user (and the trigger creates the profile) when
 * the code is sent, so "new user" means the email wasn't verified before this code.
 */
async function verifyWithSupabase(email: string, code: string, next: string): Promise<FormState> {
  const store = getDataStore();
  const before = await store.profiles.getByEmail(email);
  const isNew = !before?.emailVerified;

  const result = await verifySupabaseCode(email, code);
  if (!result.ok) {
    const messages = {
      invalid: "That code isn't right or has expired. Check your email, or request a new code.",
      too_many: "Too many attempts. Wait a minute, then request a new code.",
    } as const;
    return { fieldErrors: { code: [messages[result.reason]] } };
  }

  const profile = await store.profiles.get(result.userId);
  if (!profile) {
    await signOutSupabase();
    console.error(`[auth] No profile row for Supabase user ${result.userId}`);
    return { error: "Something went wrong setting up your account. Try again in a minute." };
  }
  if (profile.status === "suspended") {
    await signOutSupabase();
    return { error: SUSPENDED };
  }

  redirect(isNew ? `/profile?welcome=1&next=${encodeURIComponent(next)}` : next);
}

/** Mock mode only: one-click sign-in as a fake account, for development and demos. */
export async function devSignIn(formData: FormData) {
  if (!isMockAuth()) throw new Error("Dev sign-in is only available in mock mode.");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const profile = await getDataStore().profiles.getByEmail(email);
  if (!profile) throw new Error(`No fake account for ${email}`);
  await createSession(profile.id);
  redirect(safeNextPath(formData.get("next")));
}

export async function signOut() {
  if (isMockAuth()) await destroySession();
  else await signOutSupabase();
  redirect("/");
}
