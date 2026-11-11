/** Email domains allowed to sign up. Students commonly have either. */
export const ALLOWED_EMAIL_DOMAINS = ["ucla.edu", "g.ucla.edu"] as const;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** True for addresses like "joebruin@ucla.edu" or "joebruin@g.ucla.edu". */
export function isUclaEmail(email: string) {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at < 1) return false;
  const domain = normalized.slice(at + 1);
  return (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(domain);
}

/** "jordan.lee@ucla.edu" → "Jordan" — a starting display name the user can change. */
export function defaultDisplayName(email: string) {
  const local = normalizeEmail(email).split("@")[0] ?? "";
  const first = local.split(/[._\-+0-9]/).find(Boolean) ?? "Bruin";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * Only allow redirecting to paths on this site ("/saved"), never to another origin
 * ("//evil.com", "https://evil.com").
 */
export function safeNextPath(next: unknown, fallback = "/") {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
