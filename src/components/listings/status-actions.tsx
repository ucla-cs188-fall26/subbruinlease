"use client";

import { useState, useTransition } from "react";
import { Archive, Eye, EyeOff, Loader2, Rocket, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changeListingStatus } from "@/app/dashboard/actions";
import { cn } from "@/lib/cn";
import type { StatusAction } from "@/lib/listings";
import type { ListingStatus } from "@/lib/types";

type Spec = {
  label: string;
  icon: LucideIcon;
  variant: "primary" | "outline" | "ghost";
  confirm?: string;
  danger?: boolean;
};

function spec(action: StatusAction, status: ListingStatus): Spec {
  switch (action) {
    case "publish":
      return {
        label: "Publish",
        icon: Rocket,
        variant: "primary",
        confirm:
          "Publish this listing?\n\nBy publishing, you confirm you're a UCLA student subleasing a place you live in, the details are accurate, and you understand subBruinLease doesn't verify leases.",
      };
    case "mark_unavailable":
      return { label: "Mark unavailable", icon: EyeOff, variant: "outline" };
    case "mark_available":
      return { label: "Mark available", icon: Eye, variant: "primary" };
    case "close":
      return status === "draft"
        ? {
            label: "Discard draft",
            icon: Trash2,
            variant: "ghost",
            danger: true,
            confirm: "Discard this draft? You won't be able to get it back.",
          }
        : {
            label: "Close listing",
            icon: Archive,
            variant: "ghost",
            danger: true,
            confirm:
              "Close this listing?\n\nIt'll be taken down for good (people who saved it will see it's no longer available). You can always post a new one.",
          };
  }
}

/** Status buttons for the owner. Shown on My Listings and on the listing page. */
export function StatusActions({
  listingId,
  status,
  actions,
  className,
}: {
  listingId: string;
  status: ListingStatus;
  actions: StatusAction[];
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<StatusAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (actions.length === 0) return null;

  function run(action: StatusAction, s: Spec) {
    if (s.confirm && !window.confirm(s.confirm)) return;
    setError(null);
    setRunning(action);
    startTransition(async () => {
      const result = await changeListingStatus(listingId, action);
      if (!result.ok) setError(result.error);
      setRunning(null);
    });
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const s = spec(action, status);
          const Icon = pending && running === action ? Loader2 : s.icon;
          return (
            <Button
              key={action}
              size="sm"
              variant={s.variant}
              disabled={pending}
              onClick={() => run(action, s)}
              className={cn(s.danger && "text-red-600 hover:bg-red-50 hover:text-red-700")}
            >
              <Icon className={cn("size-4", pending && running === action && "animate-spin")} aria-hidden />
              {s.label}
            </Button>
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
