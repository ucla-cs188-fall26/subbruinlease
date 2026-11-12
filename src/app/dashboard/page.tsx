import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, Eye, ImageOff, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { StatusActions } from "@/components/listings/status-actions";
import { StatusBadge } from "@/components/listings/status-badge";
import { requireUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/cn";
import { getDataStore } from "@/lib/data";
import { formatDateRange, formatPostedDate, formatRent, todayInLA } from "@/lib/format";
import { MAX_OPEN_LISTINGS } from "@/lib/listing-schema";
import { canEditListing, ownerActions } from "@/lib/listings";
import type { ListingStatus, ListingWithOwner } from "@/lib/types";

export const metadata: Metadata = { title: "My listings" };

const TABS = [
  { key: "all", label: "All", statuses: null },
  { key: "live", label: "Live", statuses: ["published"] },
  { key: "drafts", label: "Drafts", statuses: ["draft"] },
  { key: "unavailable", label: "Unavailable", statuses: ["unavailable"] },
  { key: "closed", label: "Closed", statuses: ["closed", "hidden"] },
] as const satisfies ReadonlyArray<{ key: string; label: string; statuses: readonly ListingStatus[] | null }>;

type Tab = (typeof TABS)[number];

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Container className="py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">My listings</h1>
          <p className="mt-1 text-muted">Edit your places, pause them, or take them down when they’re rented.</p>
        </div>
        <ButtonLink href="/listings/new" variant="gold">
          <Plus className="size-4" aria-hidden />
          Post a sublease
        </ButtonLink>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const user = await requireUser("/dashboard");
  const { tab: tabParam } = await searchParams;
  // Open listings first (most recently touched on top), then closed and hidden ones.
  const isOpen = (l: ListingWithOwner) => ["draft", "published", "unavailable"].includes(l.status);
  const listings = (await getDataStore().listings.list({ ownerId: user.id, status: "any" })).sort(
    (a, b) => Number(isOpen(b)) - Number(isOpen(a)) || b.updatedAt.localeCompare(a.updatedAt),
  );
  const today = todayInLA();

  const inTab = (tab: Tab, l: ListingWithOwner) =>
    tab.statuses === null || (tab.statuses as readonly ListingStatus[]).includes(l.status);
  const tab = TABS.find((t) => t.key === tabParam) ?? TABS[0];
  const shown = listings.filter((l) => inTab(tab, l));
  const open = listings.filter(isOpen).length;

  if (listings.length === 0) return <EmptyState />;

  return (
    <>
      <p className="mb-4 text-sm text-muted">
        <strong className="text-ink">{open}</strong> of {MAX_OPEN_LISTINGS} open listings used. Closed listings
        don’t count.
      </p>

      <nav aria-label="Filter by status" className="mb-5 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const count = listings.filter((l) => inTab(t, l)).length;
          const active = t.key === tab.key;
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? "/dashboard" : `/dashboard?tab=${t.key}`}
              aria-current={active ? "page" : undefined}
              scroll={false}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                active ? "bg-bruin-600 text-white" : "bg-white text-muted ring-1 ring-line hover:text-bruin-700",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  active ? "bg-white/20" : "bg-cream-dark text-muted",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <Card className="px-6 py-12 text-center text-muted">Nothing here right now.</Card>
      ) : (
        <ul className="space-y-4">
          {shown.map((l) => (
            <li key={l.id}>
              <DashboardRow listing={l} today={today} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function DashboardRow({ listing, today }: { listing: ListingWithOwner; today: string }) {
  const cover = listing.images[0];
  const datesPassed = listing.availableTo <= today && listing.status !== "closed";
  const editable = canEditListing(listing);

  return (
    <Card className={cn("flex gap-4 p-4 sm:p-5", listing.status === "closed" && "opacity-75")}>
      <Link
        href={`/listings/${listing.id}`}
        tabIndex={-1}
        aria-hidden
        className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-cream-dark sm:aspect-[4/3] sm:size-auto sm:w-44 sm:self-start"
      >
        {cover ? (
          <Image src={cover.url} alt={cover.alt} fill sizes="(min-width: 640px) 176px, 80px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs font-semibold text-muted">
            <ImageOff className="size-6" aria-hidden />
            <span className="hidden sm:inline">No photos yet</span>
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={listing.status} />
          {datesPassed && <Badge tone="red">Dates have passed</Badge>}
        </div>
        <h2 className="mt-1.5 font-sans text-lg leading-snug font-bold text-ink">
          <Link href={`/listings/${listing.id}`} className="hover:text-bruin-700">
            {listing.title}
          </Link>
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="font-display font-semibold text-bruin-700">{formatRent(listing.rent)}</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDateRange(listing.availableFrom, listing.availableTo)}
          </span>
          <span>{listing.neighborhood}</span>
        </p>
        <p className="mt-1 text-xs text-muted">
          {listing.publishedAt ? `Posted ${formatPostedDate(listing.publishedAt)} · ` : ""}
          Updated {formatPostedDate(listing.updatedAt)}
        </p>
        {listing.status === "hidden" && (
          <p className="mt-2 text-sm text-red-700">
            Our moderators hid this listing after a report. Reach out to us if you think it’s a mistake.
          </p>
        )}

        <div className="-ml-24 mt-4 flex flex-wrap items-center gap-2 sm:mt-auto sm:ml-0 sm:pt-4">
          <ButtonLink href={`/listings/${listing.id}`} size="sm" variant="ghost">
            <Eye className="size-4" aria-hidden />
            View
          </ButtonLink>
          {editable && (
            <ButtonLink href={`/listings/${listing.id}/edit`} size="sm" variant="outline">
              <Pencil className="size-4" aria-hidden />
              Edit
            </ButtonLink>
          )}
          <StatusActions listingId={listing.id} status={listing.status} actions={ownerActions(listing.status)} />
        </div>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-gold-100 text-bruin-600">
        <Plus className="size-7" aria-hidden />
      </span>
      <p className="mt-4 font-display text-xl font-semibold text-bruin-700">You haven’t posted anything yet</p>
      <p className="mt-1 max-w-sm text-muted">
        Leaving for the summer or a quarter abroad? Post your place and find a fellow Bruin to take it over.
      </p>
      <ButtonLink href="/listings/new" className="mt-6">
        Post your place
      </ButtonLink>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-10 w-96 max-w-full animate-pulse rounded-full bg-cream-dark" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-card bg-white shadow-soft" />
      ))}
    </div>
  );
}
