import { Suspense } from "react";
import { CalendarRange, KeyRound, MailCheck, SearchX, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ListingCard, ListingCardSkeleton } from "@/components/listings/listing-card";
import { ListingRow } from "@/components/listings/listing-row";
import { SaveButton } from "@/components/listings/save-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDataStore } from "@/lib/data";
import { isOwner } from "@/lib/listings";
import type { ListingWithOwner } from "@/lib/types";
import { parseFilters, parseView } from "@/lib/search";
import { ExploreControls } from "./explore-controls";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function HomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <div className="relative overflow-x-clip">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-gold-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-40 -left-32 size-[28rem] rounded-full bg-bruin-200/30 blur-3xl"
        />
        <Hero />
        <Container className="relative pb-10">
          <Suspense fallback={<ExploreSkeleton />}>
            <Explore searchParams={searchParams} />
          </Suspense>
        </Container>
      </div>
      <HowItWorks />
    </>
  );
}

async function Explore({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const view = parseView(params);
  const store = getDataStore();
  const [listings, user] = await Promise.all([store.listings.search(filters), getCurrentUser()]);
  const savedIds = new Set(user ? await store.favorites.listIds(user.id) : []);

  // No save button on your own listings.
  const saveFor = (listing: ListingWithOwner) =>
    isOwner(listing, user) ? undefined : (
      <SaveButton
        listingId={listing.id}
        title={listing.title}
        saved={savedIds.has(listing.id)}
        signedIn={user !== null}
      />
    );

  return (
    <ExploreControls filters={filters} view={view} resultCount={listings.length}>
      {listings.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <SearchX className="size-10 text-bruin-300" aria-hidden />
          <p className="mt-4 font-display text-xl font-semibold text-bruin-700">No subleases match</p>
          <p className="mt-1 max-w-sm text-muted">
            Try widening your dates, raising your budget, or clearing a filter. New places get
            posted all the time.
          </p>
          <ButtonLink href="/" variant="outline" size="sm" className="mt-6">
            Clear all filters
          </ButtonLink>
        </Card>
      ) : view === "list" ? (
        <Card className="divide-y divide-line/70 overflow-hidden">
          {listings.map((listing) => (
            <ListingRow key={listing.id} listing={listing} action={saveFor(listing)} />
          ))}
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} priority={i < 3} action={saveFor(listing)} />
          ))}
        </div>
      )}
    </ExploreControls>
  );
}

function ExploreSkeleton() {
  return (
    <div aria-hidden>
      <div className="h-12 animate-pulse rounded-full bg-white shadow-soft" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <div className="hidden h-[480px] animate-pulse rounded-card bg-white shadow-soft lg:block" />
        <div>
          <div className="mb-4 h-10 w-48 animate-pulse rounded-full bg-cream-dark" />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative">
      <Container className="relative flex flex-col gap-6 pt-10 pb-8 sm:flex-row sm:items-end sm:justify-between sm:pt-14">
        <div>
          <Badge tone="gold" className="mb-3">
            <ShieldCheck className="size-3.5" aria-hidden />
            UCLA students only
          </Badge>
          <h1 className="max-w-2xl text-4xl leading-tight font-semibold sm:text-5xl">
            Find your next <span className="text-gold-600">Bruin</span> home.
          </h1>
          <p className="mt-3 max-w-xl text-lg text-muted">
            Short-term subleases near campus for summer, study abroad, internships, and everything
            in between.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm text-muted">
          <span>Leaving for a while?</span>
          <ButtonLink href="/listings/new" variant="outline" size="sm">
            Post your place
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}

const steps = [
  {
    icon: MailCheck,
    title: "Sign in with your UCLA email",
    body: "Every account is tied to a verified @ucla.edu address, so you're talking to fellow Bruins.",
  },
  {
    icon: CalendarRange,
    title: "Find a place that fits your dates",
    body: "Filter by move-in, move-out, budget, and room type. No more scrolling through group chats.",
  },
  {
    icon: KeyRound,
    title: "Message the poster privately",
    body: "Reach out through subBruinLease. Your email stays hidden until you choose to share it.",
  },
];

function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works" className="border-t border-line/70 bg-white/50">
      <Container className="py-12">
        <h2 id="how-it-works" className="text-2xl font-semibold sm:text-3xl">
          How it works
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-6">
              <div className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-bruin-50 text-bruin-600">
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-muted">{body}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
