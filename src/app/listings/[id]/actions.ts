"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getDataStore } from "@/lib/data";
import type { FormState } from "@/lib/form-state";
import { canReportListing, reportLimitProblem, reportSchema } from "@/lib/reports";

export type ReportFormState = FormState & { reported?: boolean };

/** Flag a listing for the moderators. Reporters stay anonymous to the poster. */
export async function reportListing(listingId: string, _prev: ReportFormState, formData: FormData): Promise<ReportFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session ended. Log in again to report a listing." };

  const store = getDataStore();
  const listing = await store.listings.get(listingId);
  if (!listing || !canReportListing(listing, user)) return { error: "This listing can’t be reported." };

  const parsed = reportSchema.safeParse({
    reason: String(formData.get("reason") ?? ""),
    details: String(formData.get("details") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (fieldErrors[String(issue.path[0] ?? "reason")] ??= []).push(issue.message);
    return { fieldErrors };
  }

  const problem = reportLimitProblem(await store.reports.list({ reporterId: user.id }), listing.id);
  if (problem) return { error: problem };

  await store.reports.create({ listingId: listing.id, reporterId: user.id, ...parsed.data });
  return { reported: true };
}
