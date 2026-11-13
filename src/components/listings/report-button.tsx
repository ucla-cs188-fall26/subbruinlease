"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Flag, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { reportReasonLabels } from "@/lib/labels";
import { REPORT_DETAILS_MAX, REPORT_REASONS } from "@/lib/reports";
import { reportListing, type ReportFormState } from "@/app/listings/[id]/actions";

type Props = {
  listingId: string;
  /** When false, the button links to sign in instead. */
  signedIn: boolean;
  /** Set when this student already has an open report on the listing. */
  alreadyReported: boolean;
};

/** "Report this listing" link that opens a small form in a dialog. */
export function ReportButton({ listingId, signedIn, alreadyReported }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<ReportFormState, FormData>(reportListing.bind(null, listingId), {});
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const err = (name: string) => state.fieldErrors?.[name]?.[0];
  const done = state.reported || alreadyReported;

  // Close on a click on the dimmed backdrop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClick = (e: MouseEvent) => e.target === dialog && dialog.close();
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  const trigger = "inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-red-700";

  if (!signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`} className={trigger}>
        <Flag className="size-4" aria-hidden />
        Log in to report this listing
      </Link>
    );
  }

  if (alreadyReported && !state.reported) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm text-muted">
        <Flag className="size-4" aria-hidden />
        You reported this listing. Thanks for looking out.
      </p>
    );
  }

  return (
    <>
      <button type="button" className={trigger} onClick={() => dialogRef.current?.showModal()}>
        <Flag className="size-4" aria-hidden />
        Report this listing
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="report-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card bg-white p-0 text-ink shadow-lift backdrop:bg-ink/50"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="report-title" className="text-xl font-semibold">
              {done ? "Thanks for reporting" : "Report this listing"}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="-mt-1 -mr-1 inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-cream-dark"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          {done ? (
            <div className="mt-3" role="status">
              <p className="flex items-start gap-2 text-muted">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
                Our moderators will take a look. The poster won’t know who reported it.
              </p>
              <p className="mt-3 text-sm text-muted">
                If you think you’ve been scammed, also contact your bank and{" "}
                <Link href="/safety" className="font-bold text-bruin-700 hover:underline">
                  read our safety tips
                </Link>
                .
              </p>
              <Button className="mt-5 w-full" variant="outline" onClick={() => dialogRef.current?.close()}>
                Done
              </Button>
            </div>
          ) : (
            <form action={action} noValidate className="mt-3 space-y-4">
              <p className="text-sm text-muted">
                Reports go to our moderators, never to the poster.
              </p>
              {state.error && <Alert tone="error">{state.error}</Alert>}

              <fieldset aria-describedby={err("reason") ? "report-reason-error" : undefined}>
                <legend className="mb-2 text-sm font-bold">What’s wrong?</legend>
                <div className="space-y-1.5">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-sm font-semibold transition-colors",
                        reason === r ? "border-bruin-400 bg-bruin-50 text-bruin-800" : "border-line hover:border-bruin-200",
                      )}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        className="size-4 accent-bruin-600"
                      />
                      {reportReasonLabels[r]}
                    </label>
                  ))}
                </div>
                {err("reason") && (
                  <p id="report-reason-error" className="mt-1.5 text-sm text-red-600">
                    {err("reason")}
                  </p>
                )}
              </fieldset>

              <div>
                <Label htmlFor="report-details">
                  Details <span className="font-normal text-muted">{reason === "other" ? "" : "(optional)"}</span>
                </Label>
                <Textarea
                  id="report-details"
                  name="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={REPORT_DETAILS_MAX}
                  rows={3}
                  className="min-h-24"
                  placeholder="Anything that helps, like “asked me to pay with gift cards”."
                  aria-invalid={err("details") ? true : undefined}
                />
                {err("details") && <p className="mt-1.5 text-sm text-red-600">{err("details")}</p>}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={() => dialogRef.current?.close()}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" disabled={pending}>
                  <Flag className="size-4" aria-hidden />
                  {pending ? "Sending…" : "Send report"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
