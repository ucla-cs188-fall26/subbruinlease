"use server";

import { refresh } from "next/cache";
import { getCurrentUser, requireUser } from "@/lib/auth/current-user";
import { getDataStore } from "@/lib/data";
import { inquiryEmail } from "@/lib/email/inquiry-email";
import { sendEmail, siteUrl } from "@/lib/email/send";
import { todayInLA } from "@/lib/format";
import { firstName, inquiryLimitProblem, inquirySchema } from "@/lib/inquiries";
import { canContactOwner } from "@/lib/listings";
import type { FormState } from "@/lib/form-state";
import type { InquiryStatus } from "@/lib/types";

export type InquiryFormState = FormState & { sent?: boolean };

/**
 * Message a listing's poster. The message is saved (so it shows in both inboxes) and
 * emailed to the poster with Reply-To set to the sender, so the poster can answer from
 * their own email. The poster's address is never shown to the sender.
 */
export async function sendInquiry(listingId: string, _prev: InquiryFormState, formData: FormData): Promise<InquiryFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session ended. Log in again to send messages." };
  if (!user.emailVerified) return { error: "Verify your UCLA email before messaging posters." };

  const store = getDataStore();
  const listing = await store.listings.get(listingId);
  if (!listing || !canContactOwner(listing, user)) {
    return { error: "This poster isn’t taking messages right now." };
  }

  const parsed = inquirySchema({ today: todayInLA() }).safeParse({
    message: String(formData.get("message") ?? ""),
    desiredFrom: String(formData.get("desiredFrom") ?? ""),
    desiredTo: String(formData.get("desiredTo") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "message");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { fieldErrors };
  }

  const problem = inquiryLimitProblem(await store.inquiries.listSent(user.id), listing.id);
  if (problem) return { error: problem };

  const owner = await store.profiles.get(listing.ownerId);
  if (!owner || owner.status !== "active") return { error: "This poster isn’t taking messages right now." };

  const { message, desiredFrom, desiredTo } = parsed.data;
  await store.inquiries.create({ listingId: listing.id, senderId: user.id, message, desiredFrom, desiredTo });

  const base = siteUrl();
  const email = inquiryEmail({
    ownerFirstName: firstName(owner.displayName),
    senderName: user.displayName,
    senderEmail: user.email,
    listingTitle: listing.title,
    listingUrl: `${base}/listings/${listing.id}`,
    inboxUrl: `${base}/inbox`,
    message,
    desiredFrom,
    desiredTo,
  });
  const sent = await sendEmail({ to: owner.email, replyTo: user.email, ...email });
  // The message is already saved and shows in the poster's inbox, so a failed email
  // isn't fatal. Log it for whoever runs the site.
  if (!sent.ok) console.error(`[inquiry] email to owner of ${listing.id} failed: ${sent.error}`);

  refresh();
  return { sent: true };
}

const STATUSES: InquiryStatus[] = ["sent", "read", "archived"];

/** Mark a message you received as read, archived, or new again. */
export async function setInquiryStatus(inquiryId: string, status: InquiryStatus): Promise<{ ok: boolean }> {
  const user = await requireUser("/inbox");
  if (!STATUSES.includes(status)) return { ok: false };

  const store = getDataStore();
  const received = await store.inquiries.listReceived(user.id);
  const inquiry = received.find((i) => i.id === inquiryId);
  if (!inquiry) return { ok: false };

  if (inquiry.status !== status) await store.inquiries.setStatus(inquiry.id, status);
  refresh();
  return { ok: true };
}
