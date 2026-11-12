"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { Menu, Plus, X } from "lucide-react";
import { Logo } from "./logo";
import { isActive, navLinks } from "./nav-links";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";

/**
 * `account` is the login button / user menu. It's passed in from the root layout so it
 * can be a server component that reads the session behind a Suspense boundary.
 */
export function SiteHeader({ account }: { account: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/90 backdrop-blur">
      <Container className="flex h-16 items-center gap-6">
        <Logo className="h-9 sm:h-10" priority />

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
          <Suspense fallback={<NavItems pathname={null} variant="desktop" />}>
            <ActiveNavItems variant="desktop" />
          </Suspense>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {account}
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-bruin-700 hover:bg-bruin-50 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </Container>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-line/70 md:hidden">
          <Container className="flex flex-col gap-1 py-3">
            <Suspense fallback={<NavItems pathname={null} variant="mobile" onNavigate={() => setOpen(false)} />}>
              <ActiveNavItems variant="mobile" onNavigate={() => setOpen(false)} />
            </Suspense>
            <Link
              href="/listings/new"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-3 rounded-2xl bg-gold-100 px-4 py-3 font-bold text-bruin-800 hover:bg-gold-200"
            >
              <Plus className="size-5" aria-hidden />
              Post a sublease
            </Link>
          </Container>
        </nav>
      )}
    </header>
  );
}

type NavItemsProps = { variant: "desktop" | "mobile"; onNavigate?: () => void };

/**
 * Reading the pathname suspends on routes with dynamic params (like /listings/[id]),
 * so it lives in its own component behind Suspense. The fallback is the same links
 * without the highlight, which keeps the rest of the header in the static shell.
 */
function ActiveNavItems(props: NavItemsProps) {
  return <NavItems pathname={usePathname()} {...props} />;
}

function NavItems({ pathname, variant, onNavigate }: NavItemsProps & { pathname: string | null }) {
  return navLinks.map(({ href, label, icon: Icon }) => {
    const active = pathname !== null && isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          variant === "desktop"
            ? "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold text-muted transition-colors hover:bg-bruin-50 hover:text-bruin-700"
            : "flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-ink hover:bg-bruin-50",
          active && "bg-bruin-50 text-bruin-700",
        )}
      >
        <Icon className={variant === "desktop" ? "size-4" : "size-5 text-bruin-600"} aria-hidden />
        {label}
      </Link>
    );
  });
}
