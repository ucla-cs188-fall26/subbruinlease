import type { Metadata } from "next";
import { Suspense } from "react";
import { Camera, FileCheck2, MapPin, MessageCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ListingForm } from "@/components/listings/listing-form";
import { requireUser } from "@/lib/auth/current-user";
import { todayInLA } from "@/lib/format";
import { countOpenListings } from "@/lib/listing-limits";
import { MAX_OPEN_LISTINGS } from "@/lib/listing-schema";
import { createListing } from "./actions";

export const metadata: Metadata = { title: "Post a sublease" };

export default function NewListingPage() {
  return (
    <Container className="py-8 sm:py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Post your place</h1>
        <p className="mt-2 text-lg text-muted">
          Heading out for the summer, a quarter abroad, or an internship? Find a fellow Bruin to
          take over your room. It takes about five minutes.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <Suspense fallback={<FormSkeleton />}>
            <NewListingForm />
          </Suspense>
        </div>
        <Tips />
      </div>
    </Container>
  );
}

async function NewListingForm() {
  const user = await requireUser("/listings/new");

  if ((await countOpenListings(user.id)) >= MAX_OPEN_LISTINGS) {
    return (
      <Alert tone="warning" className="p-5 text-base">
        You already have {MAX_OPEN_LISTINGS} open listings, which is the limit. Close one you don’t need
        anymore, then come back to post a new one.
        <div className="mt-3">
          <ButtonLink href="/dashboard" size="sm" variant="outline">
            Go to my listings
          </ButtonLink>
        </div>
      </Alert>
    );
  }

  return <ListingForm action={createListing} today={todayInLA()} />;
}

function FormSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      {[320, 260, 380].map((h) => (
        <div key={h} className="animate-pulse rounded-card bg-white shadow-soft" style={{ height: h }} />
      ))}
    </div>
  );
}

const tips = [
  { icon: Camera, title: "Bright photos", body: "Open the blinds and shoot the bedroom, kitchen, and bathroom." },
  { icon: MapPin, title: "Rough location only", body: "Cross streets are enough. Share the exact address once you’ve chatted." },
  { icon: FileCheck2, title: "Check your lease", body: "Most leases need landlord approval to sublease. Ask early." },
  { icon: MessageCircle, title: "Be upfront", body: "Mention roommates, quiet hours, and anything a subletter should know." },
];

function Tips() {
  return (
    <aside className="hidden lg:block" aria-label="Tips">
      <Card className="sticky top-24 p-5">
        <p className="font-display text-lg font-semibold text-bruin-700">Tips for a great listing</p>
        <ul className="mt-4 space-y-4">
          {tips.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">{title}</span>
                <span className="block text-sm text-muted">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </aside>
  );
}
