import { z } from "zod";
import { isOwner, isPublicListing, type Viewer } from "@/lib/listings";
import type { Listing, Report, ReportReason } from "@/lib/types";

export const REPORT_REASONS = [
  "scam",
  "misleading",
  "not_available",
  "no_sublease_permission",
  "inappropriate",
  "other",
] as const satisfies readonly ReportReason[];

export const REPORT_DETAILS_MAX = 1000;
/** Reports one student can file in a rolling day. */
export const MAX_REPORTS_PER_DAY = 10;

export const reportSchema = z
  .object({
    reason: z.enum(REPORT_REASONS, "Pick a reason."),
    details: z
      .string()
      .trim()
      .max(REPORT_DETAILS_MAX, `Keep it under ${REPORT_DETAILS_MAX.toLocaleString()} characters.`)
      .transform((v) => (v === "" ? null : v)),
  })
  .superRefine((v, ctx) => {
    if (v.reason === "other" && (v.details ?? "").length < 10) {
      ctx.addIssue({ code: "custom", path: ["details"], message: "Tell us a little about what’s wrong." });
    }
  });

/** Signed-in students can report listings anyone can see, except their own. */
export function canReportListing(listing: Pick<Listing, "status" | "ownerId">, viewer: Viewer) {
  return viewer !== null && isPublicListing(listing) && !isOwner(listing, viewer);
}

/**
 * Why this student can't file a report right now, or null if they can. `mine` is every
 * report they've filed.
 */
export function reportLimitProblem(
  mine: readonly Pick<Report, "listingId" | "status" | "createdAt">[],
  listingId: string,
  now = new Date(),
): string | null {
  if (mine.some((r) => r.listingId === listingId && r.status === "open")) {
    return "You already reported this listing. Our moderators will look at it soon.";
  }
  const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  if (mine.filter((r) => new Date(r.createdAt).getTime() > dayAgo).length >= MAX_REPORTS_PER_DAY) {
    return "You’ve sent a lot of reports today. Try again tomorrow.";
  }
  return null;
}

/** Open reports grouped by listing, most-reported first, then most recent. */
export function groupOpenReports<R extends Pick<Report, "listingId" | "reporterId" | "createdAt" | "status">>(reports: readonly R[]) {
  const groups = new Map<string, R[]>();
  for (const r of reports) {
    if (r.status !== "open") continue;
    groups.set(r.listingId, [...(groups.get(r.listingId) ?? []), r]);
  }
  return [...groups.entries()]
    .map(([listingId, items]) => ({
      listingId,
      reports: [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      reporters: new Set(items.map((r) => r.reporterId)).size,
    }))
    .sort(
      (a, b) => b.reporters - a.reporters || b.reports[0].createdAt.localeCompare(a.reports[0].createdAt),
    );
}
