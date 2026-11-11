import { CalendarRange, KeyRound, MailCheck, Search, ShieldCheck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ListingRow } from "@/components/listings/listing-row";
import { getDataStore } from "@/lib/data";

async function LatestListings() {
  const listings = (await getDataStore().listings.list()).slice(0, 6);

  if (listings.length === 0) {
    return (
      <Card className="mt-6 border-dashed p-10 text-center text-muted">
        No subleases yet. Be the first to post one!
      </Card>
    );
  }

  return (
    <Card className="mt-6 divide-y divide-line/70 overflow-hidden">
      {listings.map((listing) => (
        <ListingRow key={listing.id} listing={listing} />
      ))}
    </Card>
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

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-gold-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-bruin-200/40 blur-3xl"
        />

        <Container className="relative py-14 sm:py-20">
          <Badge tone="gold" className="mb-4">
            <ShieldCheck className="size-3.5" aria-hidden />
            UCLA students only
          </Badge>
          <h1 className="max-w-2xl text-4xl leading-tight font-semibold sm:text-6xl">
            Find your next <span className="text-gold-500">Bruin</span> home.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Short-term subleases near campus for summer, study abroad, internships, and everything
            in between.
          </p>

          <form
            action="/"
            role="search"
            className="mt-8 flex max-w-2xl items-center gap-2 rounded-full border border-line bg-white p-1.5 pl-5 shadow-lift"
          >
            <Search className="size-5 shrink-0 text-bruin-400" aria-hidden />
            <label htmlFor="q" className="sr-only">
              Search listings
            </label>
            <input
              id="q"
              name="q"
              type="search"
              placeholder="Search Westwood, Kelton, Landfair…"
              className="h-11 min-w-0 flex-1 bg-transparent text-ink placeholder:text-muted/70 focus:outline-none"
            />
            <Button type="submit" className="shrink-0">
              Search
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>Leaving for a while?</span>
            <ButtonLink href="/listings/new" variant="outline" size="sm">
              Post your place
            </ButtonLink>
          </div>
        </Container>
      </section>

      <section aria-labelledby="how-it-works">
        <Container className="py-10">
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

      <section aria-labelledby="latest">
        <Container className="py-10">
          <h2 id="latest" className="text-2xl font-semibold sm:text-3xl">
            Latest subleases
          </h2>
          <LatestListings />
        </Container>
      </section>
    </>
  );
}
