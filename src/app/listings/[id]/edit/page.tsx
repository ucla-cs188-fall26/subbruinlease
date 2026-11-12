import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ListingForm } from "@/components/listings/listing-form";
import { StatusBadge } from "@/components/listings/status-badge";
import { requireUser } from "@/lib/auth/current-user";
import { getDataStore } from "@/lib/data";
import { todayInLA } from "@/lib/format";
import { canEditListing } from "@/lib/listings";
import { updateListing } from "./actions";

export const metadata: Metadata = { title: "Edit listing" };

export default function EditListingPage({ params }: PageProps<"/listings/[id]/edit">) {
  return (
    <Container className="max-w-4xl py-8 sm:py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-bruin-600 hover:text-bruin-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        My listings
      </Link>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-card bg-white shadow-soft" aria-hidden />}>
        <EditListing params={params} />
      </Suspense>
    </Container>
  );
}

async function EditListing({ params }: Pick<PageProps<"/listings/[id]/edit">, "params">) {
  const { id } = await params;
  const user = await requireUser(`/listings/${id}/edit`);
  const listing = await getDataStore().listings.get(id);
  // Same response for "doesn't exist" and "not yours", so ids can't be probed.
  if (!listing || listing.ownerId !== user.id) notFound();

  return (
    <>
      <div className="mt-4 mb-6">
        <div className="mb-2">
          <StatusBadge status={listing.status} />
        </div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Edit listing</h1>
        <p className="mt-1 text-muted">{listing.title}</p>
      </div>

      {!canEditListing(listing) ? (
        <Alert tone="warning" className="flex items-start gap-2 p-5 text-base">
          <Lock className="mt-1 size-4 shrink-0" aria-hidden />
          <div>
            {listing.status === "closed"
              ? "This listing is closed, so it can’t be edited. If your place is available again, post a new listing."
              : "Our moderators hid this listing, so it can’t be edited right now."}
            <div className="mt-3">
              <ButtonLink href="/dashboard" size="sm" variant="outline">
                Back to my listings
              </ButtonLink>
            </div>
          </div>
        </Alert>
      ) : (
        <>
          {listing.status !== "draft" && (
            <Alert tone="info" className="mb-6">
              Changes go live as soon as you save.
            </Alert>
          )}
          <ListingForm
            action={updateListing.bind(null, listing.id)}
            mode={listing.status === "draft" ? "edit-draft" : "edit"}
            today={todayInLA()}
            initial={{
              ...listing,
              images: listing.images.map(({ url, alt }) => ({ url, alt })),
            }}
          />
        </>
      )}
    </>
  );
}
