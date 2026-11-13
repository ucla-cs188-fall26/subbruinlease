"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore, Check, Reply } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import type { InquiryStatus } from "@/lib/types";
import { setInquiryStatus } from "./actions";

/** Reply / mark read / archive buttons for a message you received. */
export function ReceivedActions({
  inquiryId,
  status,
  replyHref,
  senderFirstName,
}: {
  inquiryId: string;
  status: InquiryStatus;
  replyHref: string;
  senderFirstName: string;
}) {
  const [pending, startTransition] = useTransition();
  const set = (next: InquiryStatus) => startTransition(async () => void (await setInquiryStatus(inquiryId, next)));

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <a
        href={replyHref}
        className={buttonStyles({ size: "sm" })}
        // Replying counts as reading it.
        onClick={() => status === "sent" && set("read")}
      >
        <Reply className="size-4" aria-hidden />
        Reply to {senderFirstName}
      </a>
      {status === "sent" && (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => set("read")}>
          <Check className="size-4" aria-hidden />
          Mark as read
        </Button>
      )}
      {status === "archived" ? (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => set("read")}>
          <ArchiveRestore className="size-4" aria-hidden />
          Move to inbox
        </Button>
      ) : (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => set("archived")}>
          <Archive className="size-4" aria-hidden />
          Archive
        </Button>
      )}
    </div>
  );
}
