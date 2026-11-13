import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, ImageOff, Inbox, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/cn";
import { getDataStore } from "@/lib/data";
import { formatDateRange, formatPostedDate } from "@/lib/format";
import { firstName } from "@/lib/inquiries";
import type { Inquiry, ListingWithOwner, Profile } from "@/lib/types";
import { ReceivedActions } from "./inquiry-actions";

export const metadata: Metadata = { title: "Inbox" };

const TABS = [
  { key: "received", label: "Received" },
  { key: "sent", label: "Sent" },
  { key: "archived", label: "Archived" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function InboxPage({ searchParams }: PageProps<"/inbox">) {
  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold sm:text-4xl">Inbox</h1>
        <p className="mt-1 text-muted">
          Messages about your listings, and ones you’ve sent. Replies happen over email.
        </p>
      </div>
      <Suspense fallback={<InboxSkeleton />}>
        <InboxContent searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function InboxContent({ searchParams }: Pick<PageProps<"/inbox">, "searchParams">) {
  const user = await requireUser("/inbox");
  const { tab: tabParam } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "received";

  const store = getDataStore();
  const [received, sent] = await Promise.all([store.inquiries.listReceived(user.id), store.inquiries.listSent(user.id)]);

  // Look up the listings and people these messages mention.
  const all = [...received, ...sent];
  const listingIds = [...new Set(all.map((i) => i.listingId))];
  const personIds = [...new Set([...received.map((i) => i.senderId), ...sent.map((i) => i.recipientId)])];
  const [listings, people] = await Promise.all([
    listingIds.length ? store.listings.list({ ids: listingIds, status: "any" }) : [],
    Promise.all(personIds.map((id) => store.profiles.get(id))),
  ]);
  const listingById = new Map(listings.map((l) => [l.id, l]));
  const personById = new Map(people.filter((p): p is Profile => p !== null).map((p) => [p.id, p]));

  const inbox = received.filter((i) => i.status !== "archived");
  const archived = received.filter((i) => i.status === "archived");
  const counts: Record<TabKey, number> = { received: inbox.length, sent: sent.length, archived: archived.length };
  const unread = inbox.filter((i) => i.status === "sent").length;
  const shown = tab === "received" ? inbox : tab === "sent" ? sent : archived;

  return (
    <>
      <nav aria-label="Messages" className="mb-5 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={t.key === "received" ? "/inbox" : `/inbox?tab=${t.key}`}
              aria-current={active ? "page" : undefined}
              scroll={false}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                active ? "bg-bruin-600 text-white" : "bg-white text-muted ring-1 ring-line hover:text-bruin-700",
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 text-xs", active ? "bg-white/20" : "bg-cream-dark text-muted")}>
                {counts[t.key]}
              </span>
              {t.key === "received" && unread > 0 && (
                <span className="sr-only">
                  , {unread} new
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <ul className="space-y-4">
          {shown.map((inq) => (
            <li key={inq.id}>
              {tab === "sent" ? (
                <SentMessage inquiry={inq} listing={listingById.get(inq.listingId)} to={personById.get(inq.recipientId)} />
              ) : (
                <ReceivedMessage
                  inquiry={inq}
                  listing={listingById.get(inq.listingId)}
                  from={personById.get(inq.senderId)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ReceivedMessage({ inquiry, listing, from }: { inquiry: Inquiry; listing?: ListingWithOwner; from?: Profile }) {
  const isNew = inquiry.status === "sent";
  const name = from?.displayName ?? "A student";
  const subject = `Re: ${listing?.title ?? "your sublease"} (subBruinLease)`;
  const replyHref = from
    ? `mailto:${from.email}?subject=${encodeURIComponent(subject)}`
    : "#";

  return (
    <Card className={cn("p-4 sm:p-5", isNew && "ring-2 ring-gold-300")}>
      <div className="flex items-start gap-3">
        <Avatar name={name} src={from?.avatarUrl ?? null} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-bold text-ink">{name}</p>
            {isNew && <Badge tone="gold">New</Badge>}
            <span className="text-xs text-muted">{formatPostedDate(inquiry.createdAt)}</span>
          </div>
          <p className="text-sm text-muted">
            about{" "}
            {listing ? (
              <Link href={`/listings/${listing.id}`} className="font-semibold text-bruin-700 hover:underline">
                {listing.title}
              </Link>
            ) : (
              "a listing that was removed"
            )}
          </p>
        </div>
      </div>

      <Dates inquiry={inquiry} />
      <p className="mt-3 rounded-2xl bg-bruin-50/60 px-4 py-3 whitespace-pre-line text-ink">{inquiry.message}</p>

      <div className="mt-4">
        <ReceivedActions
          inquiryId={inquiry.id}
          status={inquiry.status}
          replyHref={replyHref}
          senderFirstName={firstName(name)}
        />
      </div>
    </Card>
  );
}

function SentMessage({ inquiry, listing, to }: { inquiry: Inquiry; listing?: ListingWithOwner; to?: Profile }) {
  const cover = listing?.images[0];
  const toName = to?.displayName ?? "the poster";

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-cream-dark">
          {cover ? (
            <Image src={cover.url} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            <ImageOff className="absolute inset-0 m-auto size-5 text-muted" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">
            {listing && listing.status !== "hidden" && listing.status !== "draft" ? (
              <Link href={`/listings/${listing.id}`} className="hover:text-bruin-700">
                {listing.title}
              </Link>
            ) : (
              "Listing no longer available"
            )}
          </p>
          <p className="text-sm text-muted">
            To {toName} · {formatPostedDate(inquiry.createdAt)}
          </p>
        </div>
      </div>
      <Dates inquiry={inquiry} />
      <p className="mt-3 rounded-2xl bg-cream-dark/60 px-4 py-3 whitespace-pre-line text-ink">{inquiry.message}</p>
      <p className="mt-3 text-xs text-muted">
        {firstName(toName)} got this by email. Replies come to your UCLA email.
      </p>
    </Card>
  );
}

function Dates({ inquiry }: { inquiry: Inquiry }) {
  if (!inquiry.desiredFrom || !inquiry.desiredTo) return null;
  return (
    <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted">
      <CalendarDays className="size-4 text-bruin-400" aria-hidden />
      Wants {formatDateRange(inquiry.desiredFrom, inquiry.desiredTo)}
    </p>
  );
}

function EmptyState({ tab }: { tab: TabKey }) {
  const copy = {
    received: {
      icon: Inbox,
      title: "No messages yet",
      body: "When someone messages you about one of your listings, it shows up here and in your email.",
      cta: { href: "/dashboard", label: "Go to my listings" },
    },
    sent: {
      icon: Send,
      title: "You haven’t messaged anyone",
      body: "Found a place you like? Message the poster from the listing page.",
      cta: { href: "/", label: "Browse subleases" },
    },
    archived: {
      icon: Inbox,
      title: "Nothing archived",
      body: "Archive messages you’re done with to keep your inbox tidy.",
      cta: null,
    },
  }[tab];
  const Icon = copy.icon;

  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-gold-100 text-bruin-600">
        <Icon className="size-7" aria-hidden />
      </span>
      <p className="mt-4 font-display text-xl font-semibold text-bruin-700">{copy.title}</p>
      <p className="mt-1 max-w-sm text-muted">{copy.body}</p>
      {copy.cta && (
        <ButtonLink href={copy.cta.href} variant="outline" size="sm" className="mt-6">
          {copy.cta.label}
        </ButtonLink>
      )}
    </Card>
  );
}

function InboxSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-9 w-72 animate-pulse rounded-full bg-cream-dark" />
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-card bg-white shadow-soft" />
      ))}
    </div>
  );
}
