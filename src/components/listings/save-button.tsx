"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { setSaved } from "@/app/saved/actions";

type Props = {
  listingId: string;
  title: string;
  saved: boolean;
  signedIn: boolean;
  /** "icon": round button over a photo. "button": labelled Save / Saved. */
  variant?: "icon" | "button";
  className?: string;
};

/**
 * Bookmark toggle. Flips right away, then confirms with the server. Signed-out visitors
 * are sent to sign in and brought back to the same page.
 */
export function SaveButton({ listingId, title, saved, signedIn, variant = "icon", className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(saved);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  function goSignIn() {
    const here = window.location.pathname + window.location.search;
    router.push(`/login?next=${encodeURIComponent(here)}`);
  }

  function toggle() {
    if (!signedIn) return goSignIn();
    const next = !optimisticSaved;
    setError(null);
    startTransition(async () => {
      setOptimisticSaved(next);
      try {
        const result = await setSaved(listingId, next);
        if (!result.ok) {
          if (result.signIn) goSignIn();
          else setError(result.error);
        }
      } catch {
        setError("Couldn’t reach the server. Try again.");
      }
    });
  }

  const label = optimisticSaved ? `Remove “${title}” from saved` : `Save “${title}”`;
  const icon = (
    <Bookmark
      className={cn("size-[18px] transition-transform", optimisticSaved && "fill-current", pending && "scale-90")}
      aria-hidden
    />
  );

  return (
    <span className={cn("relative inline-flex", className)}>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={optimisticSaved}
          aria-label={label}
          title={optimisticSaved ? "Saved" : "Save"}
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-full bg-white/95 shadow-md ring-1 ring-black/5 backdrop-blur transition-all hover:scale-105 active:scale-95",
            optimisticSaved ? "text-gold-500" : "text-bruin-700 hover:text-bruin-500",
          )}
        >
          {icon}
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={optimisticSaved}
          aria-label={label}
          className={cn(
            buttonStyles({ variant: "ghost", size: "sm" }),
            optimisticSaved && "text-gold-700 hover:bg-gold-50",
          )}
        >
          {icon}
          <span>{optimisticSaved ? "Saved" : "Save"}</span>
        </button>
      )}
      {error && (
        <span
          role="alert"
          className="absolute top-full right-0 z-20 mt-2 w-56 rounded-xl bg-ink px-3 py-2 text-left text-xs font-semibold text-white shadow-lift"
        >
          {error}
        </span>
      )}
    </span>
  );
}
