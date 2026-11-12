"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Where the Explore page remembers its last search, so "Back" keeps your filters. */
export const LAST_EXPLORE_KEY = "sbl:lastExplore";

export function rememberExploreSearch(query: string) {
  try {
    sessionStorage.setItem(LAST_EXPLORE_KEY, query);
  } catch {
    // Storage blocked (private mode etc.). Back just goes to plain Explore.
  }
}

export function BackToExplore() {
  const [href, setHref] = useState("/");

  useEffect(() => {
    try {
      const q = sessionStorage.getItem(LAST_EXPLORE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage only exists after hydration
      if (q) setHref(`/?${q}`);
    } catch {}
  }, []);

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-bruin-600 hover:text-bruin-800"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Back to Explore
    </Link>
  );
}

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return; // user closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={share}>
      {copied ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </Button>
  );
}
