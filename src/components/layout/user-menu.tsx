"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Shield, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { CurrentUser } from "@/lib/auth/current-user";
import { signOut } from "@/app/login/actions";

export function UserMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const item =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-bold text-ink hover:bg-bruin-50 hover:text-bruin-700";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 hover:bg-bruin-50"
      >
        <Avatar name={user.displayName} src={user.avatarUrl} size={34} />
        <span className="sr-only">Account menu for {user.displayName}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-line/70 bg-white p-2 shadow-lift"
        >
          <div className="px-3 py-2">
            <p className="truncate font-bold text-ink">{user.displayName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            {user.emailVerified && (
              <Badge tone="green" className="mt-1.5">
                UCLA email verified
              </Badge>
            )}
          </div>
          <div className="my-1 h-px bg-line/70" />
          <Link href="/profile" role="menuitem" className={item} onClick={close}>
            <UserRound className="size-4" aria-hidden /> Profile
          </Link>
          <Link href="/dashboard" role="menuitem" className={item} onClick={close}>
            <LayoutDashboard className="size-4" aria-hidden /> My listings
          </Link>
          {user.role === "admin" && (
            <Link href="/admin" role="menuitem" className={item} onClick={close}>
              <Shield className="size-4" aria-hidden /> Admin
            </Link>
          )}
          <div className="my-1 h-px bg-line/70" />
          <form action={signOut}>
            <button type="submit" role="menuitem" className={item}>
              <LogOut className="size-4" aria-hidden /> Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
