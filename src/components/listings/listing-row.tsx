import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, ImageOff, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateRange, formatRent } from "@/lib/format";
import { roomTypeLabels } from "@/lib/labels";
import type { ListingWithOwner } from "@/lib/types";

/**
 * Compact, scannable listing row (SuPost-style list view). `action` (e.g. the save
 * button) sits at the right end, outside the link.
 */
export function ListingRow({
  listing,
  action,
}: {
  listing: ListingWithOwner;
  action?: ReactNode;
}) {
  const cover = listing.images[0];
  const rent = formatRent(listing.rent);

  return (
    <div className="flex items-center transition-colors has-[a:hover]:bg-bruin-50/60">
      <Link
        href={`/listings/${listing.id}`}
        className="group flex min-w-0 flex-1 items-center gap-4 px-4 py-3 focus-visible:outline-offset-[-3px] sm:px-5"
      >
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-cream-dark">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.alt}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <ImageOff
              className="absolute inset-0 m-auto size-5 text-muted"
              aria-hidden
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-bold leading-snug text-ink group-hover:text-bruin-700 sm:truncate">
            {listing.title}
          </p>
          <p className="mt-0.5 font-display font-semibold text-bruin-700 sm:hidden">
            {rent}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <CalendarDays className="size-3.5" aria-hidden />
              {formatDateRange(listing.availableFrom, listing.availableTo)}
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <MapPin className="size-3.5" aria-hidden />
              {listing.neighborhood}
            </span>
            <span className="hidden sm:block">
              <Badge tone="neutral">{roomTypeLabels[listing.roomType]}</Badge>
            </span>
          </div>
        </div>

        <p className="hidden shrink-0 font-display text-lg font-semibold text-bruin-700 sm:block">
          {rent}
        </p>
      </Link>
      {action && <div className="shrink-0 pr-3 sm:pr-4">{action}</div>}
    </div>
  );
}
