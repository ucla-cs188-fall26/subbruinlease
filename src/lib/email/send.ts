import "server-only";

export type Email = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Where replies go. For inquiries this is the student who sent the message. */
  replyTo?: string;
};

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

/**
 * Sends an email through Resend (https://resend.com) when RESEND_API_KEY is set.
 * Without a key (local development), it prints the email to the terminal instead, so
 * the whole flow works with no setup.
 */
export async function sendEmail(email: Email): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production" && process.env.DATA_SOURCE === "supabase") {
      console.error("[email] RESEND_API_KEY isn't set; email not sent:", email.subject);
      return { ok: false, error: "Email isn't set up." };
    }
    console.info(
      [
        "",
        "──────── email (not sent: no RESEND_API_KEY) ────────",
        `To:       ${email.to}`,
        email.replyTo ? `Reply-To: ${email.replyTo}` : null,
        `Subject:  ${email.subject}`,
        "",
        email.text,
        "─────────────────────────────────────────────────────",
      ]
        .filter((l) => l !== null)
        .join("\n"),
    );
    return { ok: true, id: null };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "subBruinLease <onboarding@resend.dev>",
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[email] Resend responded ${res.status}: ${detail.slice(0, 300)}`);
      return { ok: false, error: `Email service error (${res.status}).` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id ?? null };
  } catch (err) {
    console.error("[email] Couldn't reach Resend:", err);
    return { ok: false, error: "Couldn't reach the email service." };
  }
}

/** Absolute base URL for links in emails, e.g. "https://subbruinlease.com". */
export function siteUrl() {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
