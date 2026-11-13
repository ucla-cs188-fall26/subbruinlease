import { z } from "zod";
import { formatDateRange } from "@/lib/format";
import { isValidDate } from "@/lib/search";
import type { DateString, Inquiry } from "@/lib/types";

/* Limits that keep messaging useful and stop spam. */
export const MESSAGE_MIN = 20;
export const MESSAGE_MAX = 1000;
/** Messages one student can send in a rolling hour / day. */
export const MAX_PER_HOUR = 5;
export const MAX_PER_DAY = 20;
/** Wait this long before messaging the same listing again. */
export const REPEAT_HOURS = 24;

const HOUR = 60 * 60 * 1000;
/** The fill-in-the-blank part of the starter message. */
const STARTER_BLANK = /\[your [^\]]*\]/i;

export function inquirySchema({ today }: { today: DateString }) {
  const optionalDate = z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || isValidDate(v), "Pick a valid date.");

  return z
    .object({
      message: z
        .string()
        .trim()
        .min(MESSAGE_MIN, `Say a little more (at least ${MESSAGE_MIN} characters).`)
        .max(MESSAGE_MAX, `Keep it under ${MESSAGE_MAX.toLocaleString()} characters.`)
        .refine((v) => !STARTER_BLANK.test(v), "Fill in or delete the [bracketed] part first."),
      desiredFrom: optionalDate,
      desiredTo: optionalDate,
    })
    .superRefine((v, ctx) => {
      if ((v.desiredFrom === null) !== (v.desiredTo === null)) {
        const path = v.desiredFrom === null ? "desiredFrom" : "desiredTo";
        ctx.addIssue({ code: "custom", path: [path], message: "Add both dates, or leave both empty." });
        return;
      }
      if (v.desiredFrom && v.desiredTo) {
        if (v.desiredTo <= v.desiredFrom) {
          ctx.addIssue({ code: "custom", path: ["desiredTo"], message: "Move-out has to be after move-in." });
        } else if (v.desiredTo <= today) {
          ctx.addIssue({ code: "custom", path: ["desiredTo"], message: "Pick dates in the future." });
        }
      }
    });
}

/**
 * Why this student can't send another message right now, or null if they can.
 * `sent` is everything they've sent (any order).
 */
export function inquiryLimitProblem(sent: readonly Pick<Inquiry, "listingId" | "createdAt">[], listingId: string, now = new Date()): string | null {
  const since = (hours: number) => sent.filter((i) => now.getTime() - new Date(i.createdAt).getTime() < hours * HOUR);

  if (since(REPEAT_HOURS).some((i) => i.listingId === listingId)) {
    return "You already messaged about this place in the last day. Give them a chance to reply by email.";
  }
  if (since(1).length >= MAX_PER_HOUR) {
    return "You’ve sent a lot of messages in the last hour. Try again a little later.";
  }
  if (since(24).length >= MAX_PER_DAY) {
    return "You’ve hit today’s message limit. Try again tomorrow.";
  }
  return null;
}

/**
 * The message this student sent about a listing within the last REPEAT_HOURS, if any.
 * While one exists, the listing page shows "You messaged …" instead of a new form.
 */
export function recentInquiryAbout<T extends Pick<Inquiry, "listingId" | "createdAt">>(
  sent: readonly T[],
  listingId: string,
  now = new Date(),
): T | null {
  const latest = sent
    .filter((i) => i.listingId === listingId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!latest) return null;
  return now.getTime() - new Date(latest.createdAt).getTime() < REPEAT_HOURS * HOUR ? latest : null;
}

/**
 * A friendly first message, filled in by the sparkle button. Uses the dates the student
 * entered, or the listing's dates if they left them empty.
 */
export function starterMessage({
  ownerFirstName,
  listingFrom,
  listingTo,
  desiredFrom,
  desiredTo,
}: {
  ownerFirstName: string;
  listingFrom: DateString;
  listingTo: DateString;
  desiredFrom?: string | null;
  desiredTo?: string | null;
}) {
  const ownDates = desiredFrom && desiredTo && isValidDate(desiredFrom) && isValidDate(desiredTo) && desiredTo > desiredFrom;
  const range = ownDates ? formatDateRange(desiredFrom, desiredTo) : formatDateRange(listingFrom, listingTo);

  return [
    `Hi ${ownerFirstName}! I'm interested in your sublease${ownDates ? ` from ${range}` : ` (${range})`}. Is it still available?`,
    "",
    "A little about me: [your year, major, and what you're like as a roommate].",
    "",
    "I'd love to hear more about the place and the roommates. Thanks!",
  ].join("\n");
}

/** "Jordan Lee" → "Jordan" */
export function firstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] || displayName;
}
