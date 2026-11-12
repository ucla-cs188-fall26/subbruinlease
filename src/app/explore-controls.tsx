"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  countActiveFilters,
  emptyFilters,
  filtersToParams,
  RENT_SLIDER,
  type ListingFilters,
  type Sort,
  type View,
} from "@/lib/search";
import { NEIGHBORHOODS, type RoomType } from "@/lib/types";

const sortLabels: Record<Sort, string> = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  soonest: "Move-in: soonest",
};

const ROOM_TYPES: RoomType[] = ["private", "shared", "entire"];
const roomChipLabels: Record<RoomType, string> = { private: "Private", shared: "Shared", entire: "Entire place" };

type Props = {
  filters: ListingFilters;
  view: View;
  resultCount: number;
  /** Server-rendered results. Dimmed while new results load. */
  children: ReactNode;
};

/**
 * Filter sidebar + toolbar for the Explore page. Every change is written to the URL
 * (so searches can be shared and the back button works); the server re-renders results.
 */
export function ExploreControls({ filters: fromUrl, view, resultCount, children }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState(fromUrl);
  const [panelOpen, setPanelOpen] = useState(false);
  const lastPushed = useRef(filtersToParams(fromUrl, { view: view === "list" ? "list" : null }).toString());
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Back/forward navigation: adopt the URL's filters if they aren't the ones we just pushed.
  useEffect(() => {
    const incoming = filtersToParams(fromUrl, { view: view === "list" ? "list" : null }).toString();
    if (incoming !== lastPushed.current) {
      lastPushed.current = incoming;
      setFilters(fromUrl);
    }
  }, [fromUrl, view]);

  function push(next: ListingFilters, nextView: View = view, delay = 0) {
    setFilters(next);
    clearTimeout(debounce.current);
    const go = () => {
      const qs = filtersToParams(next, { view: nextView === "list" ? "list" : null }).toString();
      lastPushed.current = qs;
      const href = qs ? `/?${qs}` : "/";
      // Clicks add a history entry (so Back undoes them); typing/sliding just replaces.
      startTransition(() =>
        delay ? router.replace(href, { scroll: false }) : router.push(href, { scroll: false }),
      );
    };
    if (delay) debounce.current = setTimeout(go, delay);
    else go();
  }

  const update = (patch: Partial<ListingFilters>, delay = 0) => push({ ...filters, ...patch }, view, delay);
  const active = countActiveFilters(filters);
  const today = new Date().toISOString().slice(0, 10);
  const rentValue = filters.maxRent ?? RENT_SLIDER.max;

  return (
    <div>
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-line bg-white px-5 shadow-soft focus-within:border-bruin-400 focus-within:ring-4 focus-within:ring-bruin-100">
          <Search className="size-5 shrink-0 text-bruin-400" aria-hidden />
          <label htmlFor="q" className="sr-only">
            Search listings
          </label>
          <input
            id="q"
            type="search"
            value={filters.q}
            onChange={(e) => update({ q: e.target.value }, 350)}
            placeholder="Search Landfair, Kelton, studio…"
            className="h-12 min-w-0 flex-1 bg-transparent text-ink placeholder:text-muted/70 focus:outline-none"
          />
        </div>
        <Button
          variant="outline"
          className="h-12 shrink-0 lg:hidden"
          aria-expanded={panelOpen}
          aria-controls="filters"
          onClick={() => setPanelOpen((v) => !v)}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          <span className="hidden sm:inline">Filters</span>
          {active > 0 && (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-bruin-600 text-xs text-white">
              {active}
            </span>
          )}
        </Button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside
          id="filters"
          aria-label="Filters"
          className={cn(
            "space-y-6 rounded-card border border-line/70 bg-white p-5 shadow-soft lg:sticky lg:top-24 lg:block lg:self-start",
            !panelOpen && "hidden",
          )}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Filters</h2>
            {active > 0 && (
              <button
                type="button"
                onClick={() => push({ ...emptyFilters, sort: filters.sort })}
                className="text-sm font-bold text-bruin-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-bold text-ink">Dates</legend>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <div>
                <Label htmlFor="from" className="text-xs font-semibold text-muted">
                  Move in
                </Label>
                <Input
                  id="from"
                  type="date"
                  min={today}
                  value={filters.from ?? ""}
                  onChange={(e) => update({ from: e.target.value || null })}
                />
              </div>
              <div>
                <Label htmlFor="to" className="text-xs font-semibold text-muted">
                  Move out
                </Label>
                <Input
                  id="to"
                  type="date"
                  min={filters.from ?? today}
                  value={filters.to ?? ""}
                  onChange={(e) => update({ to: e.target.value || null })}
                />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-muted">Shows places available for your whole stay.</p>
          </fieldset>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <Label htmlFor="maxRent" className="mb-0">
                Max rent
              </Label>
              <span className="font-display text-sm font-semibold text-bruin-700">
                {filters.maxRent === null ? "Any" : `$${filters.maxRent.toLocaleString()}/mo`}
              </span>
            </div>
            <input
              id="maxRent"
              type="range"
              min={RENT_SLIDER.min}
              max={RENT_SLIDER.max}
              step={RENT_SLIDER.step}
              value={rentValue}
              onChange={(e) => {
                const v = Number(e.target.value);
                update({ maxRent: v >= RENT_SLIDER.max ? null : v }, 250);
              }}
              className="w-full accent-bruin-600"
              aria-valuetext={filters.maxRent === null ? "Any price" : `$${filters.maxRent} per month`}
            />
            <div className="flex justify-between text-xs text-muted">
              <span>${RENT_SLIDER.min}</span>
              <span>${RENT_SLIDER.max.toLocaleString()}+</span>
            </div>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-bold text-ink">Room type</legend>
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((type) => {
                const on = filters.roomTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      update({
                        roomTypes: on
                          ? filters.roomTypes.filter((t) => t !== type)
                          : [...filters.roomTypes, type],
                      })
                    }
                    className={cn(
                      "rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors",
                      on
                        ? "border-bruin-600 bg-bruin-600 text-white"
                        : "border-line bg-white text-ink hover:border-bruin-300",
                    )}
                  >
                    {roomChipLabels[type]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="hood">Neighborhood</Label>
            <Select
              id="hood"
              value={filters.neighborhood ?? ""}
              onChange={(e) =>
                update({ neighborhood: (e.target.value || null) as ListingFilters["neighborhood"] })
              }
            >
              <option value="">Anywhere</option>
              {NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm font-bold text-ink">Furnished only</span>
            <input
              type="checkbox"
              checked={filters.furnished}
              onChange={(e) => update({ furnished: e.target.checked })}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-bruin-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bruin-500 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
            />
          </label>

          <Button variant="outline" size="sm" className="w-full lg:hidden" onClick={() => setPanelOpen(false)}>
            <X className="size-4" aria-hidden />
            Close filters
          </Button>
        </aside>

        {/* Results */}
        <section aria-labelledby="results-heading" aria-busy={pending}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" className="font-sans text-base font-bold text-ink" aria-live="polite">
              {resultCount} {resultCount === 1 ? "sublease" : "subleases"}
              {active > 0 && (
                <span className="font-normal text-muted">
                  {" "}
                  {resultCount === 1 ? "matches" : "match"} your filters
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="sr-only">
                Sort by
              </label>
              <Select
                id="sort"
                value={filters.sort}
                onChange={(e) => update({ sort: e.target.value as Sort })}
                className="h-10 w-auto rounded-full py-0 text-sm font-bold"
              >
                {Object.entries(sortLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <div className="flex rounded-full border border-line bg-white p-1" role="group" aria-label="View">
                {(
                  [
                    ["grid", LayoutGrid, "Grid view"],
                    ["list", List, "List view"],
                  ] as const
                ).map(([v, Icon, label]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    aria-label={label}
                    title={label}
                    onClick={() => push(filters, v)}
                    className={cn(
                      "inline-flex size-8 items-center justify-center rounded-full transition-colors",
                      view === v ? "bg-bruin-600 text-white" : "text-muted hover:text-bruin-700",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={cn("transition-opacity", pending && "pointer-events-none opacity-60")}>{children}</div>
        </section>
      </div>
    </div>
  );
}
