"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Check, EyeOff, RotateCcw, Shield, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hideListing, restoreListing, suspendUser, type AdminResult } from "@/app/admin/actions";

/** Hide / restore / suspend buttons. Shown to admins on listing pages and in /admin. */
export function ModeratorButtons({
  listingId,
  ownerId,
  ownerName,
  hidden,
  canSuspend,
  extra,
}: {
  listingId: string;
  ownerId: string;
  ownerName: string;
  hidden: boolean;
  /** False for admins and already-suspended accounts. */
  canSuspend: boolean;
  extra?: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (confirmText: string | null, fn: () => Promise<AdminResult>) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
    });
  };

  return (
    <div aria-busy={pending}>
      <div className="flex flex-wrap gap-2">
        {hidden ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(null, () => restoreListing(listingId))}>
            <RotateCcw className="size-4" aria-hidden />
            Restore listing
          </Button>
        ) : (
          <Button
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() => run("Hide this listing? It disappears for everyone except the poster.", () => hideListing(listingId))}
          >
            <EyeOff className="size-4" aria-hidden />
            Hide listing
          </Button>
        )}
        {extra}
        {canSuspend && (
          <Button
            size="sm"
            variant="ghost"
            className="text-red-700 hover:bg-red-50"
            disabled={pending}
            onClick={() =>
              run(
                `Suspend ${ownerName}?\n\nThey'll be signed out, can't sign back in, and all their live listings will be hidden.`,
                () => suspendUser(ownerId),
              )
            }
          >
            <UserX className="size-4" aria-hidden />
            Suspend {ownerName}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** Small card on a listing page for admins. */
export function ModeratorCard(props: Parameters<typeof ModeratorButtons>[0]) {
  return (
    <div className="rounded-card border-2 border-dashed border-red-200 bg-red-50/50 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-red-800">
        <Shield className="size-4" aria-hidden />
        Moderator tools
      </p>
      <ModeratorButtons {...props} />
    </div>
  );
}

/** Small one-click admin button (dismiss reports, lift a suspension). */
export function AdminActionButton({
  action,
  label,
  confirmText,
  icon,
}: {
  action: () => Promise<AdminResult>;
  label: string;
  confirmText?: string;
  icon?: "dismiss" | "unsuspend";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const Icon = icon === "unsuspend" ? UserCheck : Check;
  return (
    <span className="inline-flex flex-col">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          setError(null);
          startTransition(async () => {
            const r = await action();
            if (!r.ok) setError(r.error);
          });
        }}
      >
        <Icon className="size-4" aria-hidden />
        {label}
      </Button>
      {error && (
        <span role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}
