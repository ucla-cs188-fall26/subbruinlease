import type { DateString } from "@/lib/types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** 1250 → "$1,250" */
export function formatMoney(dollars: number) {
  return money.format(dollars);
}

/** 1250 → "$1,250/mo" */
export function formatRent(dollars: number) {
  return `${formatMoney(dollars)}/mo`;
}

/**
 * Parse "YYYY-MM-DD" as a calendar date (UTC midnight), so formatting never shifts
 * the day because of the viewer's time zone.
 */
export function parseDate(date: DateString): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthDayYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "2027-06-15" → "Jun 15, 2027" */
export function formatDate(date: DateString) {
  return monthDayYear.format(parseDate(date));
}

/**
 * ("2027-06-15", "2027-09-10") → "Jun 15 – Sep 10, 2027"
 * ("2026-12-14", "2027-01-04") → "Dec 14, 2026 – Jan 4, 2027"
 */
export function formatDateRange(from: DateString, to: DateString) {
  const a = parseDate(from);
  const b = parseDate(to);
  if (a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${monthDay.format(a)} – ${monthDayYear.format(b)}`;
  }
  return `${monthDayYear.format(a)} – ${monthDayYear.format(b)}`;
}

/** Inclusive-ish length of stay in days. */
export function daysBetween(from: DateString, to: DateString) {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

/** "2026-11-10T18:40:00Z" → "Nov 10" (or "Nov 10, 2025" if not this year). */
export function formatPostedDate(timestamp: string, now = new Date()) {
  const d = new Date(timestamp);
  const sameYear = d.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(d);
}
