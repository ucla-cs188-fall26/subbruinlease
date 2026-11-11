"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Plus, X } from "lucide-react";
import { Logo } from "./logo";
import { isActive, navLinks } from "./nav-links";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/90 backdrop-blur">
      <Container className="flex h-16 items-center gap-6">
        <Logo className="h-9 sm:h-10" priority />

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold text-muted transition-colors hover:bg-bruin-50 hover:text-bruin-700",
                isActive(pathname, href) && "bg-bruin-50 text-bruin-700",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Log in
          </ButtonLink>
          <ButtonLink href="/listings/new" variant="gold" size="sm">
            <Plus className="size-4" aria-hidden />
            Post a sublease
          </ButtonLink>
        </div>

        <button
          type="button"
          className="ml-auto inline-flex size-10 items-center justify-center rounded-full text-bruin-700 hover:bg-bruin-50 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </Container>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-line/70 md:hidden">
          <Container className="flex flex-col gap-1 py-3">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-ink hover:bg-bruin-50",
                  isActive(pathname, href) && "bg-bruin-50 text-bruin-700",
                )}
              >
                <Icon className="size-5 text-bruin-600" aria-hidden />
                {label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ButtonLink href="/login" variant="outline" onClick={() => setOpen(false)}>
                Log in
              </ButtonLink>
              <ButtonLink href="/listings/new" variant="gold" onClick={() => setOpen(false)}>
                Post
              </ButtonLink>
            </div>
          </Container>
        </nav>
      )}
    </header>
  );
}
