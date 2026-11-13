import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { EyeOff, Flag, ImageOff, ShieldCheck, UserX } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { AdminActionButton, ModeratorButtons } from "@/components/listings/moderator-tools";
import { StatusBadge } from "@/components/listings/status-badge";
import { requireAdmin } from "@/lib/auth/current-user";
import { cn } from "@/lib/cn";
import { getDataStore } from "@/lib/data";
import { formatPostedDate } from "@/lib/format";
import { reportReasonLabels } from "@/lib/labels";
import { groupOpenReports } from "@/lib/reports";
import type { ListingWithOwner, Profile, Report } from "@/lib/types";
import { dismissReports, unsuspendUser } from "./actions";

export const metadata: Metadata = { title: "Moderation" };

const TABS = [
  { key: "reports", label: "Open reports" },
  { key: "hidden", label: "Hidden listings" },
  { key: "suspended", label: "Suspended" },
  { key: "history", label: "Closed reports" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Container className="max-w-4xl py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-semibold sm:text-4xl">
          <ShieldCheck className="size-8 text-bruin-500" aria-hidden />
          Moderation
        </h1>
        <p className="mt-1 text-muted">Review reports, take down listings, and suspend accounts.</p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-white shadow-soft" aria-hidden />}>
        <AdminContent searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function AdminContent({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  await requireAdmin("/admin");
  const { tab: tabParam } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "reports";

  const store = getDataStore();
  const [reports, allListings, profiles] = await Promise.all([
    store.reports.list(),
    store.listings.list({ status: "any" }),
    store.profiles.list(),
  ]);
  const listingById = new Map(allListings.map((l) => [l.id, l]));
  const personById = new Map(profiles.map((p) => [p.id, p]));

  const groups = groupOpenReports(reports);
  const hidden = allListings.filter((l) => l.status === "hidden");
  const suspended = profiles.filter((p) => p.status === "suspended");
  const closed = reports.filter((r) => r.status !== "open");
  const counts: Record<TabKey, number> = {
    reports: groups.length,
    hidden: hidden.length,
    suspended: suspended.length,
    history: closed.length,
  };

  return (
    <>
      <nav aria-label="Moderation sections" className="mb-5 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={t.key === "reports" ? "/admin" : `/admin?tab=${t.key}`}
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
            </Link>
          );
        })}
      </nav>

      {tab === "reports" &&
        (groups.length === 0 ? (
          <Empty icon={Flag} text="No open reports. Nice." />
        ) : (
          <ul className="space-y-4">
            {groups.map((g) => {
              const listing = listingById.get(g.listingId);
              if (!listing) return null;
              const owner = personById.get(listing.ownerId);
              return (
                <li key={g.listingId}>
                  <Card className="p-4 sm:p-5">
                    <ListingSummary listing={listing} owner={owner} />
                    <p className="mt-3 text-sm font-bold text-red-700">
                      {g.reports.length} report{g.reports.length === 1 ? "" : "s"} from {g.reporters}{" "}
                      {g.reporters === 1 ? "person" : "people"}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {g.reports.map((r) => (
                        <ReportItem key={r.id} report={r} reporter={personById.get(r.reporterId)} />
                      ))}
                    </ul>
                    <div className="mt-4">
                      <ModeratorButtons
                        listingId={listing.id}
                        ownerId={listing.ownerId}
                        ownerName={owner?.displayName ?? "owner"}
                        hidden={listing.status === "hidden"}
                        canSuspend={owner?.status === "active" && owner.role !== "admin"}
                        extra={
                          <AdminActionButton
                            action={dismissReports.bind(null, listing.id)}
                            label="Dismiss reports"
                            icon="dismiss"
                          />
                        }
                      />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        ))}

      {tab === "hidden" &&
        (hidden.length === 0 ? (
          <Empty icon={EyeOff} text="No hidden listings." />
        ) : (
          <ul className="space-y-4">
            {hidden.map((l) => {
              const owner = personById.get(l.ownerId);
              return (
                <li key={l.id}>
                  <Card className="p-4 sm:p-5">
                    <ListingSummary listing={l} owner={owner} />
                    <div className="mt-4">
                      <ModeratorButtons
                        listingId={l.id}
                        ownerId={l.ownerId}
                        ownerName={owner?.displayName ?? "owner"}
                        hidden
                        canSuspend={owner?.status === "active" && owner.role !== "admin"}
                      />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        ))}

      {tab === "suspended" &&
        (suspended.length === 0 ? (
          <Empty icon={UserX} text="No suspended accounts." />
        ) : (
          <Card className="divide-y divide-line/70">
            {suspended.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <Avatar name={p.displayName} src={p.avatarUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{p.displayName}</p>
                  <p className="truncate text-sm text-muted">{p.email}</p>
                </div>
                <AdminActionButton
                  action={unsuspendUser.bind(null, p.id)}
                  label="Lift suspension"
                  icon="unsuspend"
                  confirmText={`Let ${p.displayName} sign in again? Their hidden listings stay hidden until you restore them.`}
                />
              </div>
            ))}
          </Card>
        ))}

      {tab === "history" &&
        (closed.length === 0 ? (
          <Empty icon={Flag} text="No closed reports yet." />
        ) : (
          <Card className="divide-y divide-line/70">
            {closed.map((r) => {
              const listing = listingById.get(r.listingId);
              return (
                <div key={r.id} className="p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.status === "resolved" ? "green" : "neutral"}>
                      {r.status === "resolved" ? "Action taken" : "Dismissed"}
                    </Badge>
                    <span className="font-bold">{reportReasonLabels[r.reason]}</span>
                    <span className="text-muted">
                      on{" "}
                      {listing ? (
                        <Link href={`/listings/${listing.id}`} className="font-semibold text-bruin-700 hover:underline">
                          {listing.title}
                        </Link>
                      ) : (
                        "a deleted listing"
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">
                    Reported by {personById.get(r.reporterId)?.displayName ?? "someone"} on {formatPostedDate(r.createdAt)}
                    {r.resolvedAt &&
                      ` · closed by ${personById.get(r.resolvedBy ?? "")?.displayName ?? "an admin"} on ${formatPostedDate(r.resolvedAt)}`}
                  </p>
                </div>
              );
            })}
          </Card>
        ))}
    </>
  );
}

function ListingSummary({ listing, owner }: { listing: ListingWithOwner; owner?: Profile }) {
  const cover = listing.images[0];
  return (
    <div className="flex items-start gap-3">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-cream-dark">
        {cover ? (
          <Image src={cover.url} alt="" fill sizes="64px" className="object-cover" />
        ) : (
          <ImageOff className="absolute inset-0 m-auto size-5 text-muted" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={listing.status} />
          {owner?.status === "suspended" && <Badge tone="red">Owner suspended</Badge>}
        </div>
        <Link href={`/listings/${listing.id}`} className="mt-1 block font-bold text-ink hover:text-bruin-700">
          {listing.title}
        </Link>
        <p className="text-sm text-muted">
          Posted by {owner?.displayName ?? "unknown"} {owner && <>({owner.email})</>}
        </p>
      </div>
    </div>
  );
}

function ReportItem({ report, reporter }: { report: Report; reporter?: Profile }) {
  return (
    <li className="rounded-2xl bg-cream-dark/60 px-4 py-3 text-sm">
      <p>
        <span className="font-bold">{reportReasonLabels[report.reason]}</span>
        <span className="text-muted">
          {" "}
          · {reporter?.displayName ?? "someone"} · {formatPostedDate(report.createdAt)}
        </span>
      </p>
      {report.details && <p className="mt-1 whitespace-pre-line text-ink/90">{report.details}</p>}
    </li>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Flag; text: string }) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <Icon className="size-10 text-bruin-300" aria-hidden />
      <p className="mt-3 font-display text-lg font-semibold text-bruin-700">{text}</p>
    </Card>
  );
}
