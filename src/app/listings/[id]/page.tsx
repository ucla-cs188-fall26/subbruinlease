import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { ListingCard } from "@/components/listings/listing-card";
import { PhotoGallery } from "@/components/listings/photo-gallery";
import { BackToExplore, ShareButton } from "@/components/listings/listing-actions";
import { SaveButton } from "@/components/listings/save-button";
import { ModeratorCard } from "@/components/listings/moderator-tools";
import { ReportButton } from "@/components/listings/report-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDataStore } from "@/lib/data";
import { formatPostedDate } from "@/lib/format";
import { recentInquiryAbout } from "@/lib/inquiries";
import { housingTypeLabels, roomTypeLabels } from "@/lib/labels";
import { canSaveListing } from "@/lib/favorites";
import { canViewListing, isOwner, isPublicListing, pickSimilar } from "@/lib/listings";
import { canReportListing } from "@/lib/reports";
import {
  AboutSection,
  AmenitiesSection,
  HostSection,
  KeyFacts,
  LeaseSection,
  LocationSection,
  JustPosted,
  PriceCard,
  SafetyCard,
  StatusNotice,
} from "./sections";

export async function generateMetadata({ params }: PageProps<"/listings/[id]">): Promise<Metadata> {
  const { id } = await params;
  const listing = await getDataStore().listings.get(id);
  // Don't leak titles of drafts or hidden listings through link previews.
  if (!listing || !isPublicListing(listing)) return { title: "Listing" };

  const cover = listing.images[0];
  const description = listing.description.replace(/\s+/g, " ").slice(0, 155);
  return {
    title: listing.title,
    description,
    openGraph: {
      title: listing.title,
      description,
      images: cover ? [{ url: cover.url, alt: cover.alt }] : [],
    },
  };
}

export default function ListingPage({ params, searchParams }: PageProps<"/listings/[id]">) {
  return (
    <Container className="py-6 sm:py-8">
      <BackToExplore />
      <Suspense fallback={<ListingSkeleton />}>
        <ListingContent params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function ListingContent({
  params,
  searchParams,
}: Pick<PageProps<"/listings/[id]">, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const store = getDataStore();
  const [listing, user] = await Promise.all([store.listings.get(id), getCurrentUser()]);
  if (!listing || !canViewListing(listing, user)) notFound();

  const viewerIsOwner = isOwner(listing, user);
  const viewerIsAdmin = user?.role === "admin";
  const [allPublished, savedList, sentList, myOpenReports, ownerProfile] = await Promise.all([
    listing.status === "published" ? store.listings.list() : [],
    user ? store.favorites.listIds(user.id) : [],
    user && !viewerIsOwner ? store.inquiries.listSent(user.id) : [],
    user && !viewerIsOwner ? store.reports.list({ reporterId: user.id, listingId: listing.id, status: "open" }) : [],
    viewerIsAdmin && !viewerIsOwner ? store.profiles.get(listing.ownerId) : null,
  ]);
  // Signed-out visitors see a "log in to report" link; owners see nothing.
  const showReport = !viewerIsOwner && isPublicListing(listing) && (user === null || canReportListing(listing, user));
  // If they messaged about this place recently, show that instead of a fresh form.
  const recent = recentInquiryAbout(sentList, listing.id);
  const recentlySentOn = recent ? `on ${formatPostedDate(recent.createdAt)}` : null;
  const similar = listing.status === "published" ? pickSimilar(listing, allPublished) : [];
  const savedIds = new Set(savedList);
  const isSaved = savedIds.has(listing.id);
  // Show the toggle when it can be saved, or so a saved one (e.g. now unavailable) can be removed.
  const showSave = !viewerIsOwner && (isSaved || canSaveListing(listing, user));

  return (
    <article className="mt-4">
      {viewerIsOwner && (
        <JustPosted posted={query.posted === "1"} saved={query.saved === "1"} updated={query.updated === "1"} />
      )}
      <StatusNotice listing={listing} viewer={user} />

      <header className="mb-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            <Badge>{roomTypeLabels[listing.roomType]}</Badge>
            <Badge tone="neutral">{housingTypeLabels[listing.housingType]}</Badge>
            {listing.furnished && <Badge tone="neutral">Furnished</Badge>}
            {listing.flexibleDates && <Badge tone="gold">Flexible dates</Badge>}
          </div>
          <div className="flex shrink-0 items-center">
            {showSave && (
              <SaveButton
                listingId={listing.id}
                title={listing.title}
                saved={isSaved}
                signedIn={user !== null}
                variant="button"
              />
            )}
            <ShareButton title={listing.title} />
          </div>
        </div>
        <h1 className="text-3xl leading-tight font-semibold sm:text-4xl">{listing.title}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-muted">
          <MapPin className="size-4 text-bruin-400" aria-hidden />
          <span className="font-semibold text-ink">{listing.neighborhood}</span>
          <span aria-hidden>·</span>
          <span>{listing.locationHint}</span>
          {listing.publishedAt && (
            <>
              <span aria-hidden>·</span>
              <span>Posted {formatPostedDate(listing.publishedAt)}</span>
            </>
          )}
        </p>
      </header>

      <PhotoGallery photos={listing.images} title={listing.title} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-10">
          <KeyFacts listing={listing} />
          <AboutSection listing={listing} />
          <AmenitiesSection listing={listing} />
          <LeaseSection listing={listing} />
          <LocationSection listing={listing} />
          <HostSection owner={listing.owner} isYou={viewerIsOwner} />
        </div>

        <aside className="order-first space-y-4 lg:order-none lg:self-start lg:[@media(min-height:62rem)]:sticky lg:[@media(min-height:62rem)]:top-24" aria-label="Price and contact">
          <PriceCard listing={listing} viewer={user} recentlySentOn={recentlySentOn} />
          <SafetyCard />
          {showReport && (
            <div className="px-1">
              <ReportButton listingId={listing.id} signedIn={user !== null} alreadyReported={myOpenReports.length > 0} />
            </div>
          )}
          {ownerProfile && (
            <ModeratorCard
              listingId={listing.id}
              ownerId={ownerProfile.id}
              ownerName={ownerProfile.displayName}
              hidden={listing.status === "hidden"}
              canSuspend={ownerProfile.status === "active" && ownerProfile.role !== "admin"}
            />
          )}
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar" className="mt-14 border-t border-line/70 pt-10">
          <h2 id="similar" className="text-2xl font-semibold">
            More places like this
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                action={
                  isOwner(l, user) ? undefined : (
                    <SaveButton listingId={l.id} title={l.title} saved={savedIds.has(l.id)} signedIn={user !== null} />
                  )
                }
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function ListingSkeleton() {
  return (
    <div className="mt-4" aria-hidden>
      <div className="h-5 w-40 animate-pulse rounded-full bg-cream-dark" />
      <div className="mt-3 h-10 w-3/4 animate-pulse rounded-full bg-cream-dark" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-cream-dark" />
      <div className="mt-6 aspect-[4/3] animate-pulse rounded-card bg-cream-dark sm:aspect-auto sm:h-[420px]" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-card bg-cream-dark" />
          <div className="h-4 animate-pulse rounded-full bg-cream-dark" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-cream-dark" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-cream-dark" />
        </div>
        <div className="h-72 animate-pulse rounded-card bg-white shadow-soft" />
      </div>
    </div>
  );
}
