import { formatDateRange } from "@/lib/format";

/** Escape text before putting it in HTML. */
export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Keep user-written names from breaking the subject line. */
function oneLine(s: string, max = 80) {
  const flat = s.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export type InquiryEmailInput = {
  ownerFirstName: string;
  senderName: string;
  senderEmail: string;
  listingTitle: string;
  listingUrl: string;
  inboxUrl: string;
  message: string;
  desiredFrom: string | null;
  desiredTo: string | null;
};

/** The email a poster gets when someone messages them about a listing. */
export function inquiryEmail(i: InquiryEmailInput) {
  const dates = i.desiredFrom && i.desiredTo ? formatDateRange(i.desiredFrom, i.desiredTo) : null;
  const subject = `${oneLine(i.senderName, 40)} asked about “${oneLine(i.listingTitle, 60)}”`;

  const text = [
    `Hi ${i.ownerFirstName},`,
    "",
    `${i.senderName} (a verified UCLA student) sent you a message about your listing “${i.listingTitle}”.`,
    dates ? `Dates they're looking for: ${dates}` : null,
    "",
    i.message,
    "",
    `Reply to this email to answer ${i.senderName} directly. Your reply comes from your own email address.`,
    "",
    `Listing: ${i.listingUrl}`,
    `All your messages: ${i.inboxUrl}`,
    "",
    "Stay safe: never send money before you've seen the place and signed something in writing.",
    "— subBruinLease",
  ]
    .filter((l) => l !== null)
    .join("\n");

  const e = escapeHtml;
  const html = `<!doctype html>
<html><body style="margin:0;background:#fbf7ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2a44">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
  <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#3f68aa">sub<span style="color:#e7a92f">Bruin</span>Lease</p>
  <div style="background:#ffffff;border-radius:18px;padding:24px;border:1px solid #ece4d3">
    <p style="margin:0 0 12px">Hi ${e(i.ownerFirstName)},</p>
    <p style="margin:0 0 16px"><strong>${e(i.senderName)}</strong> (a verified UCLA student) sent you a message about
      <a href="${e(i.listingUrl)}" style="color:#3f68aa;font-weight:600">${e(i.listingTitle)}</a>.</p>
    ${dates ? `<p style="margin:0 0 16px;font-size:14px;color:#5b6478">Dates they're looking for: <strong style="color:#1f2a44">${e(dates)}</strong></p>` : ""}
    <div style="white-space:pre-wrap;background:#f3f6fb;border-radius:14px;padding:16px;line-height:1.5">${e(i.message)}</div>
    <p style="margin:20px 0 0">
      <a href="mailto:${e(i.senderEmail)}" style="display:inline-block;background:#3f68aa;color:#ffffff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:999px">Reply to ${e(i.senderName)}</a>
    </p>
    <p style="margin:12px 0 0;font-size:13px;color:#5b6478">Or just reply to this email. Your reply comes from your own address.</p>
  </div>
  <p style="margin:18px 4px 0;font-size:13px;color:#5b6478;line-height:1.5">
    <a href="${e(i.inboxUrl)}" style="color:#3f68aa">See all your messages</a><br>
    Stay safe: never send money before you've seen the place and signed something in writing.
  </p>
</div>
</body></html>`;

  return { subject, text, html };
}
