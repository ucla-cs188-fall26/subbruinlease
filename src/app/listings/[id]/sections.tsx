import {
  Accessibility,
  AirVent,
  BadgeCheck,
  Bath,
  BedDouble,
  CalendarClock,
  Car,
  CookingPot,
  Dumbbell,
  ExternalLink,
  FileCheck2,
  Lock,
  MapPin,
  MessageCircle,
  PartyPopper,
  PawPrint,
  Pencil,
  ShieldAlert,
  Sun,
  Users,
  Utensils,
  WashingMachine,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CurrentUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney, formatStayLength } from "@/lib/format";
import { amenityLabels, leasePermissionLabels } from "@/lib/labels";
import { canContactOwner, isOwner } from "@/lib/listings";
import { FLEX_DAYS } from "@/lib/search";
import type { Amenity, LeasePermission, ListingWithOwner, PublicProfile } from "@/lib/types";

type Props = { listing: ListingWithOwner };

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-3 text-xl font-semibold">
      {children}
    </h2>
  );
}

/* ------------------------------------------------------------------ */

/** Shown to the owner right after creating a listing. */
export function JustPosted({ posted, saved }: { posted: boolean; saved: boolean }) {
  if (!posted && !saved) return null;
  return (
    <Alert tone="success" className="mb-5 flex items-start gap-2">
      <PartyPopper className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {posted ? (
          <>
            <strong>Your listing is live!</strong> It now shows up on Explore. Share the link with
            friends or in your group chats to get more eyes on it.
          </>
        ) : (
          <>
            <strong>Draft saved.</strong> Only you can see it. You can come back and publish it from
            My Listings.
          </>
        )}
      </span>
    </Alert>
  );
}

export function StatusNotice({ listing, viewer }: Props & { viewer: CurrentUser | null }) {
  const mine = isOwner(listing, viewer);
  const adminView = !mine && viewer?.role === "admin";

  const message = (() => {
    switch (listing.status) {
      case "published":
        return null;
      case "unavailable":
        return mine
          ? "You marked this place unavailable. People with the link can still see it, but it won't show up in search."
          : "The poster marked this place unavailable for now. It might open up again later.";
      case "draft":
        return mine
          ? "This is a draft. Only you can see it until you publish it."
          : "Admin view: this is a draft and isn't public.";
      case "closed":
        return mine
          ? "This listing is closed. Only you can see it."
          : "Admin view: this listing is closed and isn't public.";
      case "hidden":
        return adminView
          ? "Admin view: moderators hid this listing."
          : "Our moderators hid this listing, so other students can't see it. Reach out to us if you think this is a mistake.";
    }
  })();

  if (!message) return null;
  return (
    <Alert tone={listing.status === "hidden" ? "error" : "warning"} className="mb-5 flex items-start gap-2">
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </Alert>
  );
}

/* ------------------------------------------------------------------ */

export function KeyFacts({ listing }: Props) {
  const facts: Array<{ icon: LucideIcon; label: string; value: string }> = [
    {
      icon: BedDouble,
      label: "Bedrooms",
      value: listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed`,
    },
    { icon: Bath, label: "Bathrooms", value: `${listing.bathrooms} bath` },
    {
      icon: Users,
      label: "Roommates",
      value: listing.roommates === 0 ? "Just you" : `${listing.roommates} other${listing.roommates === 1 ? "" : "s"}`,
    },
    {
      icon: CalendarClock,
      label: "Stay",
      value: formatStayLength(listing.availableFrom, listing.availableTo).replace("about ", "~"),
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {facts.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-2xl border border-line/70 bg-white px-4 py-3">
          <dt className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted uppercase">
            <Icon className="size-4 text-bruin-400" aria-hidden />
            {label}
          </dt>
          <dd className="mt-1 font-display text-lg font-semibold text-bruin-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AboutSection({ listing }: Props) {
  return (
    <section aria-labelledby="about">
      <SectionTitle id="about">About this place</SectionTitle>
      <p className="leading-relaxed whitespace-pre-line text-ink/90">{listing.description}</p>
      {listing.houseRules && (
        <div className="mt-5 rounded-2xl bg-cream-dark/60 px-4 py-3">
          <h3 className="font-sans text-sm font-bold text-ink">House rules</h3>
          <p className="mt-1 text-sm whitespace-pre-line text-muted">{listing.houseRules}</p>
        </div>
      )}
    </section>
  );
}

const amenityIcons: Record<Amenity, LucideIcon> = {
  in_unit_laundry: WashingMachine,
  on_site_laundry: WashingMachine,
  parking: Car,
  kitchen: CookingPot,
  wifi: Wifi,
  air_conditioning: AirVent,
  dishwasher: Utensils,
  gym: Dumbbell,
  pool: Waves,
  balcony: Sun,
  pets_allowed: PawPrint,
  wheelchair_accessible: Accessibility,
};

export function AmenitiesSection({ listing }: Props) {
  if (listing.amenities.length === 0) return null;
  return (
    <section aria-labelledby="amenities">
      <SectionTitle id="amenities">What’s included</SectionTitle>
      <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {listing.amenities.map((a) => {
          const Icon = amenityIcons[a];
          return (
            <li key={a} className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-bruin-50 text-bruin-600">
                <Icon className="size-4.5" aria-hidden />
              </span>
              {amenityLabels[a]}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const leaseDetails: Record<LeasePermission, { text: string; tone: "green" | "gold" }> = {
  allowed: { text: "The poster says their lease allows subleasing.", tone: "green" },
  landlord_approved: {
    text: "The poster says they have written approval from their landlord or property manager.",
    tone: "green",
  },
  pending: {
    text: "The poster has asked their landlord for approval but doesn’t have it yet. Get confirmation before you pay anything.",
    tone: "gold",
  },
};

export function LeaseSection({ listing }: Props) {
  const { text, tone } = leaseDetails[listing.leasePermission];
  return (
    <section aria-labelledby="lease">
      <SectionTitle id="lease">Sublease permission</SectionTitle>
      <div
        className={cn(
          "flex gap-3 rounded-2xl border px-4 py-3",
          tone === "green" ? "border-emerald-200 bg-emerald-50/60" : "border-gold-200 bg-gold-50",
        )}
      >
        <FileCheck2
          className={cn("mt-0.5 size-5 shrink-0", tone === "green" ? "text-emerald-600" : "text-gold-600")}
          aria-hidden
        />
        <div>
          <p className="font-bold text-ink">{leasePermissionLabels[listing.leasePermission]}</p>
          <p className="mt-0.5 text-sm text-muted">
            {text} subBruinLease doesn’t check leases, so ask to see it before signing anything.
          </p>
        </div>
      </div>
    </section>
  );
}

export function LocationSection({ listing }: Props) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${listing.locationHint}, ${listing.neighborhood}, Los Angeles, CA`,
  )}`;
  return (
    <section aria-labelledby="location">
      <SectionTitle id="location">Location</SectionTitle>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
          <MapPin className="size-4.5" aria-hidden />
        </span>
        <div>
          <p className="font-bold text-ink">
            {listing.neighborhood} · {listing.locationHint}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            This is an approximate location. Posters share the exact address privately once you’re in
            touch.
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-bruin-600 hover:underline"
          >
            See the area on Google Maps
            <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export function HostSection({ owner, isYou }: { owner: PublicProfile; isYou: boolean }) {
  return (
    <section aria-labelledby="host">
      <SectionTitle id="host">Posted by</SectionTitle>
      <Card className="flex gap-4 p-5">
        <Avatar name={owner.displayName} src={owner.avatarUrl} size={56} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-ink">
            {owner.displayName}
            {isYou && <Badge tone="neutral">You</Badge>}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            {owner.emailVerified && (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <BadgeCheck className="size-4" aria-hidden />
                Verified UCLA student
              </span>
            )}
            {owner.gradYear && <span>Class of {owner.gradYear}</span>}
          </p>
          {owner.bio && <p className="mt-2 text-sm text-ink/90">{owner.bio}</p>}
        </div>
      </Card>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function PriceCard({ listing, viewer }: Props & { viewer: CurrentUser | null }) {
  const mine = isOwner(listing, viewer);

  const rows: Array<[string, string]> = [
    ["Move in", formatDate(listing.availableFrom)],
    ["Move out", formatDate(listing.availableTo)],
    [
      "Deposit",
      listing.securityDeposit ? formatMoney(listing.securityDeposit) : "None",
    ],
    [
      "Utilities",
      listing.utilitiesIncluded
        ? "Included"
        : listing.utilitiesEstimate
          ? `~${formatMoney(listing.utilitiesEstimate)}/mo extra`
          : "Not included",
    ],
  ];

  return (
    <Card className="p-5">
      <p className="font-display text-bruin-700">
        <span className="text-3xl font-semibold">{formatMoney(listing.rent)}</span>
        <span className="ml-1 text-muted">/ month</span>
      </p>

      <dl className="mt-4 divide-y divide-line/70 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2.5">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-bold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {listing.flexibleDates && (
        <p className="mt-1 text-xs text-muted">
          Dates are flexible by about {FLEX_DAYS} days on either end.
        </p>
      )}

      <div className="mt-5">
        <ContactArea listing={listing} viewer={viewer} mine={mine} />
      </div>
    </Card>
  );
}

function ContactArea({
  listing,
  viewer,
  mine,
}: Props & { viewer: CurrentUser | null; mine: boolean }) {
  if (mine) {
    return (
      <div className="space-y-2">
        <p className="text-center text-sm font-semibold text-muted">This is your listing</p>
        <ButtonLink href={`/listings/${listing.id}/edit`} variant="outline" className="w-full">
          <Pencil className="size-4" aria-hidden />
          Edit listing
        </ButtonLink>
      </div>
    );
  }

  if (!canContactOwner(listing, viewer)) {
    return (
      <p className="rounded-2xl bg-cream-dark/70 px-4 py-3 text-center text-sm text-muted">
        This poster isn’t taking messages right now.
      </p>
    );
  }

  if (!viewer) {
    return (
      <div className="space-y-2 text-center">
        <ButtonLink
          href={`/login?next=${encodeURIComponent(`/listings/${listing.id}`)}`}
          className="w-full"
        >
          <MessageCircle className="size-4" aria-hidden />
          Log in to message
        </ButtonLink>
        <p className="text-xs text-muted">Only verified UCLA students can message posters.</p>
      </div>
    );
  }

  // The message form is added in the inquiries step.
  return (
    <div className="space-y-2 text-center">
      <Button className="w-full" disabled>
        <MessageCircle className="size-4" aria-hidden />
        Message {listing.owner.displayName.split(" ")[0]}
      </Button>
      <p className="text-xs text-muted">Messaging is coming soon.</p>
    </div>
  );
}

export function SafetyCard() {
  return (
    <Card className="p-5">
      <p className="flex items-center gap-2 font-display font-semibold text-ink">
        <ShieldAlert className="size-5 text-gold-500" aria-hidden />
        Sublease safely
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted marker:text-gold-400">
        <li>See the place in person or on a live video call before paying.</li>
        <li>Never wire money or pay with gift cards or crypto.</li>
        <li>Ask to see the lease and the landlord’s approval.</li>
      </ul>
      <Link href="/safety" className="mt-3 inline-block text-sm font-bold text-bruin-600 hover:underline">
        More safety tips
      </Link>
    </Card>
  );
}
