"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { CheckCircle2, MessageCircle, Send, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { MESSAGE_MAX, MESSAGE_MIN, starterMessage } from "@/lib/inquiries";
import { sendInquiry, type InquiryFormState } from "@/app/inbox/actions";

type Props = {
  listingId: string;
  ownerFirstName: string;
  listingFrom: string;
  listingTo: string;
  /** The signed-in student's email (replies go here). */
  email: string;
  /** When they last messaged about this listing, if it was recent. */
  recentlySentOn: string | null;
};

/**
 * "Message the poster" card. The sparkle fills in a friendly starter message. Messages
 * are emailed to the poster, who replies from their own email.
 */
export function InquiryForm({ listingId, ownerFirstName, listingFrom, listingTo, email, recentlySentOn }: Props) {
  const [state, action, pending] = useActionState<InquiryFormState, FormData>(
    sendInquiry.bind(null, listingId),
    {},
  );
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [lastStarter, setLastStarter] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const err = (name: string) => state.fieldErrors?.[name]?.[0];

  if (state.sent || recentlySentOn) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-4 text-sm ring-1 ring-emerald-200" role={state.sent ? "status" : undefined}>
        <p className="flex items-center gap-2 font-bold text-emerald-800">
          <CheckCircle2 className="size-5" aria-hidden />
          {state.sent ? "Message sent!" : `You messaged ${ownerFirstName} ${recentlySentOn}`}
        </p>
        <p className="mt-1.5 text-emerald-900/80">
          We emailed {ownerFirstName}. They’ll reply straight to <strong className="break-all">{email}</strong>, so keep an eye on
          your inbox.
        </p>
        <Link href="/inbox?tab=sent" className="mt-3 inline-block font-bold text-bruin-700 hover:underline">
          See your sent messages
        </Link>
      </div>
    );
  }

  function fillStarter() {
    const draft = starterMessage({ ownerFirstName, listingFrom, listingTo, desiredFrom: from, desiredTo: to });
    const hasOwnWriting = message.trim() !== "" && message !== lastStarter;
    if (hasOwnWriting && !window.confirm("Replace what you've written with a starter message?")) return;
    setMessage(draft);
    setLastStarter(draft);
    // Select the [blank] so they can type right over it.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      const start = draft.indexOf("[");
      if (!el || start < 0) return;
      el.focus();
      el.setSelectionRange(start, draft.indexOf("]", start) + 1);
    });
  }

  return (
    <div>
      {/* On phones the form starts collapsed so the page isn't all form. */}
      {!open && (
        <Button className="w-full lg:hidden" onClick={() => setOpen(true)}>
          <MessageCircle className="size-4" aria-hidden />
          Message {ownerFirstName}
        </Button>
      )}

      <form action={action} noValidate className={cn("space-y-4", !open && "hidden lg:block")}>
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-bruin-700">
          <MessageCircle className="size-5" aria-hidden />
          Message {ownerFirstName}
        </h3>
        {state.error && <Alert tone="error">{state.error}</Alert>}

        <div>
          <div className="mb-1.5 flex items-end justify-between">
            <Label htmlFor="inquiry-message" className="mb-0">
              Message
            </Label>
            <span className={cn("text-xs text-muted", message.length > MESSAGE_MAX && "font-bold text-red-600")}>
              {message.length}/{MESSAGE_MAX}
            </span>
          </div>
          <div className="relative">
            <Textarea
              ref={textareaRef}
              id="inquiry-message"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a message…"
              rows={6}
              minLength={MESSAGE_MIN}
              maxLength={MESSAGE_MAX + 200}
              className="pr-12"
              aria-invalid={err("message") ? true : undefined}
              aria-describedby={err("message") ? "inquiry-message-error" : undefined}
            />
            <button
              type="button"
              onClick={fillStarter}
              title="Write a starter message for me"
              aria-label="Write a starter message for me"
              className="absolute top-2.5 right-2.5 inline-flex size-8 items-center justify-center rounded-full bg-gold-50 text-gold-500 ring-1 ring-gold-200 transition-transform hover:scale-110 hover:bg-gold-100"
            >
              <Sparkles className="size-4" aria-hidden />
            </button>
          </div>
          {err("message") ? (
            <p id="inquiry-message-error" className="mt-1.5 text-sm text-red-600">
              {err("message")}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted">Stuck? Tap the sparkle for a starter message.</p>
          )}
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-bold text-ink">
            Your dates <span className="font-normal text-muted">(optional)</span>
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="inquiry-from" className="mb-1 text-xs font-semibold text-muted">
                Move in
              </Label>
              <Input
                id="inquiry-from"
                name="desiredFrom"
                type="date"
                value={from}
                min={listingFrom}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 text-sm"
                aria-invalid={err("desiredFrom") ? true : undefined}
              />
            </div>
            <div>
              <Label htmlFor="inquiry-to" className="mb-1 text-xs font-semibold text-muted">
                Move out
              </Label>
              <Input
                id="inquiry-to"
                name="desiredTo"
                type="date"
                value={to}
                min={from || listingFrom}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 text-sm"
                aria-invalid={err("desiredTo") ? true : undefined}
              />
            </div>
          </div>
          {(err("desiredFrom") || err("desiredTo")) && (
            <p className="mt-1.5 text-sm text-red-600">{err("desiredFrom") ?? err("desiredTo")}</p>
          )}
        </fieldset>

        <p className="text-xs leading-relaxed text-muted">
          Signed in as <strong className="break-all text-ink">{email}</strong>. {ownerFirstName} gets your message by email
          and can reply to you there. Their email stays private.
        </p>

        <Button type="submit" className="w-full" disabled={pending}>
          <Send className="size-4" aria-hidden />
          {pending ? "Sending…" : "Send message"}
        </Button>
      </form>
    </div>
  );
}
