import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ImageOff, MapPin, Sofa, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateRange, formatMoney } from "@/lib/format";
import { roomTypeLabels } from "@/lib/labels";
import type { ListingWithOwner } from "@/lib/types";

/** Photo-first card for the Explore grid. */
export function ListingCard({ listing, priority }: { listing: ListingWithOwner; priority?: boolean }) {
  const cover = listing.images[0];

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-card border border-line/70 bg-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-dark">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <ImageOff className="absolute inset-0 m-auto size-8 text-muted" aria-hidden />
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge tone="neutral" className="bg-white/95 text-ink ring-white/0 shadow-sm">
            {roomTypeLabels[listing.roomType]}
          </Badge>
          {listing.flexibleDates && (
            <Badge tone="gold" className="bg-gold-50/95 shadow-sm">
              Flexible dates
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 font-sans text-base leading-snug font-bold text-ink group-hover:text-bruin-700">
            {listing.title}
          </h3>
          <p className="shrink-0 text-right font-display leading-tight font-semibold text-bruin-700">
            <span className="text-lg">{formatMoney(listing.rent)}</span>
            <span className="block text-xs font-medium text-muted">/month</span>
          </p>
        </div>

        <div className="mt-auto space-y-1 text-sm text-muted">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0 text-bruin-400" aria-hidden />
            {formatDateRange(listing.availableFrom, listing.availableTo)}
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0 text-bruin-400" aria-hidden />
            <span className="truncate">{listing.neighborhood}</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4 shrink-0 text-bruin-400" aria-hidden />
              {listing.roommates === 0
                ? "No roommates"
                : `${listing.roommates} roommate${listing.roommates === 1 ? "" : "s"}`}
            </span>
            {listing.furnished && (
              <span className="inline-flex items-center gap-1.5">
                <Sofa className="size-4 shrink-0 text-bruin-400" aria-hidden />
                Furnished
              </span>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line/70 bg-white" aria-hidden>
      <div className="aspect-[4/3] animate-pulse bg-cream-dark" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-cream-dark" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-cream-dark" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-cream-dark" />
      </div>
    </div>
  );
}
