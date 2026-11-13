import type { Metadata } from "next";
import Image from "next/image";
import { Suspense, type ReactNode } from "react";
import { Bookmark, CalendarDays, ImageOff, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ListingCard, ListingCardSkeleton } from "@/components/listings/listing-card";
import { ListingRow } from "@/components/listings/listing-row";
import { SaveButton } from "@/components/listings/save-button";
import { requireUser } from "@/lib/auth/current-user";
import { getDataStore } from "@/lib/data";
import { savedState } from "@/lib/favorites";
import { formatDateRange, formatRent, todayInLA } from "@/lib/format";
import type { ListingWithOwner } from "@/lib/types";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <Container className="py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold sm:text-4xl">Saved</h1>
        <p className="mt-1 text-muted">Places you bookmarked. Only you can see this list.</p>
      </div>
      <Suspense fallback={<SavedSkeleton />}>
        <SavedListings />
      </Suspense>
    </Container>
  );
}

async function SavedListings() {
  const user = await requireUser("/saved");
  // Newest saves first.
  const saved = await getDataStore().favorites.listListings(user.id);
  if (saved.length === 0) return <EmptyState />;

  const today = todayInLA();
  const available = saved.filter((l) => savedState(l) === "available");
  const paused = saved.filter((l) => savedState(l) === "paused");
  const gone = saved.filter((l) => savedState(l) === "closed" || savedState(l) === "removed");

  const save = (l: ListingWithOwner, variant?: "button") => (
    <SaveButton listingId={l.id} title={l.title} saved signedIn variant={variant} />
  );

  return (
    <div className="space-y-10">
      <p className="text-sm text-muted">
        <strong className="text-ink">{saved.length}</strong> saved
        {available.length !== saved.length && <> · {available.length} still available</>}
      </p>

      {available.length > 0 && (
        <section aria-labelledby="saved-available">
          <h2 id="saved-available" className="sr-only">
            Available
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((l, i) => (
              <div key={l.id} className="flex flex-col">
                <ListingCard listing={l} priority={i < 3} action={save(l)} />
                {l.availableTo <= today && (
                  <p className="mt-2 px-1 text-sm text-red-700">These dates have passed.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {paused.length > 0 && (
        <section aria-labelledby="saved-paused">
          <h2 id="saved-paused" className="text-xl font-semibold">
            Not available right now
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            The poster paused these. They may open up again, so they stay here until you remove them.
          </p>
          <Card className="divide-y divide-line/70 overflow-hidden">
            {paused.map((l) => (
              <ListingRow key={l.id} listing={l} action={save(l)} />
            ))}
          </Card>
        </section>
      )}

      {gone.length > 0 && (
        <section aria-labelledby="saved-gone">
          <h2 id="saved-gone" className="text-xl font-semibold">
            No longer available
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted">These have been taken down. Remove them whenever you like.</p>
          <Card className="divide-y divide-line/70 overflow-hidden">
            {gone.map((l) => (
              <GoneRow key={l.id} listing={l} action={save(l, "button")} />
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

/** A saved listing that can't be opened anymore. Removed ones don't show their details. */
function GoneRow({ listing, action }: { listing: ListingWithOwner; action: ReactNode }) {
  const closed = savedState(listing) === "closed";
  const cover = closed ? listing.images[0] : undefined;

  return (
    <div className="flex items-center gap-4 px-4 py-3 sm:px-5">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-cream-dark grayscale">
        {cover ? (
          <Image src={cover.url} alt="" fill sizes="64px" className="object-cover opacity-60" />
        ) : (
          <ImageOff className="absolute inset-0 m-auto size-5 text-muted" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Badge tone="neutral">{closed ? "Closed by the poster" : "Removed"}</Badge>
        {closed ? (
          <>
            <p className="mt-1 truncate font-bold text-muted">{listing.title}</p>
            <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
              <span>{formatRent(listing.rent)}</span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" aria-hidden />
                {formatDateRange(listing.availableFrom, listing.availableTo)}
              </span>
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">This listing was taken down and can’t be viewed.</p>
        )}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-gold-100 text-bruin-600">
        <Bookmark className="size-7" aria-hidden />
      </span>
      <p className="mt-4 font-display text-xl font-semibold text-bruin-700">Nothing saved yet</p>
      <p className="mt-1 max-w-sm text-muted">
        Tap the bookmark on any listing to keep it here, so you can compare places and come back later.
      </p>
      <ButtonLink href="/" className="mt-6">
        <Search className="size-4" aria-hidden />
        Browse subleases
      </ButtonLink>
    </Card>
  );
}

function SavedSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-4 h-4 w-24 animate-pulse rounded-full bg-cream-dark" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
