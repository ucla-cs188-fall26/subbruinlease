import { describe, expect, it } from "vitest";
import {
  addDays,
  compareListings,
  countActiveFilters,
  coversDates,
  emptyFilters,
  filtersToParams,
  isValidDate,
  matchesFilters,
  parseFilters,
  type ListingFilters,
} from "./search";
import { seed } from "./data/mock/seed";
import type { Listing } from "./types";

const summer = { availableFrom: "2027-06-01", availableTo: "2027-08-31", flexibleDates: false };
const flexibleSummer = { ...summer, flexibleDates: true };

describe("coversDates", () => {
  it("matches a stay that fits inside the window", () => {
    expect(coversDates(summer, "2027-06-15", "2027-08-15")).toBe(true);
  });

  it("matches a stay exactly equal to the window", () => {
    expect(coversDates(summer, "2027-06-01", "2027-08-31")).toBe(true);
  });

  it("rejects a stay that starts before the window", () => {
    expect(coversDates(summer, "2027-05-25", "2027-08-15")).toBe(false);
  });

  it("rejects a stay that ends after the window", () => {
    expect(coversDates(summer, "2027-06-15", "2027-09-10")).toBe(false);
  });

  it("rejects a stay entirely after the window (the Sep 1 example)", () => {
    expect(coversDates(summer, "2027-09-01", "2027-09-30")).toBe(false);
  });

  it("with only a move-in date, requires availability on that date", () => {
    expect(coversDates(summer, "2027-07-04", null)).toBe(true);
    expect(coversDates(summer, "2027-09-01", null)).toBe(false);
    // Moving in on the last day leaves no stay at all.
    expect(coversDates(summer, "2027-08-31", null)).toBe(false);
  });

  it("with only a move-out date, requires availability through that date", () => {
    expect(coversDates(summer, null, "2027-08-31")).toBe(true);
    expect(coversDates(summer, null, "2027-09-05")).toBe(false);
    expect(coversDates(summer, null, "2027-06-01")).toBe(false);
  });

  it("matches anything when no dates are given", () => {
    expect(coversDates(summer, null, null)).toBe(true);
  });

  it("gives flexible listings a week of slack on each end", () => {
    expect(coversDates(flexibleSummer, "2027-05-25", "2027-09-07")).toBe(true);
    expect(coversDates(flexibleSummer, "2027-05-24", "2027-08-15")).toBe(false);
    expect(coversDates(flexibleSummer, "2027-06-15", "2027-09-08")).toBe(false);
  });

  it("handles stays that cross a year boundary", () => {
    const winterBreak = { availableFrom: "2026-12-14", availableTo: "2027-01-04", flexibleDates: false };
    expect(coversDates(winterBreak, "2026-12-20", "2027-01-02")).toBe(true);
    expect(coversDates(winterBreak, "2026-12-20", "2027-01-10")).toBe(false);
  });
});

describe("date helpers", () => {
  it("validates real calendar dates only", () => {
    expect(isValidDate("2027-02-28")).toBe(true);
    expect(isValidDate("2028-02-29")).toBe(true); // leap year
    expect(isValidDate("2027-02-29")).toBe(false);
    expect(isValidDate("2027-13-01")).toBe(false);
    expect(isValidDate("June 1")).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2027-01-30", 3)).toBe("2027-02-02");
    expect(addDays("2027-01-03", -7)).toBe("2026-12-27");
  });
});

describe("matchesFilters", () => {
  const listing = seed.listings.find((l) => l.id === "lst_landfair_private")!;
  const f = (overrides: Partial<ListingFilters>): ListingFilters => ({ ...emptyFilters, ...overrides });

  it("matches with no filters", () => {
    expect(matchesFilters(listing, emptyFilters)).toBe(true);
  });

  it("searches title, description, neighborhood, and location, case-insensitively", () => {
    expect(matchesFilters(listing, f({ q: "LANDFAIR" }))).toBe(true);
    expect(matchesFilters(listing, f({ q: "north village" }))).toBe(true);
    expect(matchesFilters(listing, f({ q: "bruin plate" }))).toBe(true); // in description
    expect(matchesFilters(listing, f({ q: "landfair palms" }))).toBe(false); // every word must match
  });

  it("filters by max rent (inclusive)", () => {
    expect(matchesFilters(listing, f({ maxRent: 1250 }))).toBe(true);
    expect(matchesFilters(listing, f({ maxRent: 1200 }))).toBe(false);
  });

  it("filters by room type", () => {
    expect(matchesFilters(listing, f({ roomTypes: ["private", "entire"] }))).toBe(true);
    expect(matchesFilters(listing, f({ roomTypes: ["shared"] }))).toBe(false);
  });

  it("filters by furnished and neighborhood", () => {
    expect(matchesFilters(listing, f({ furnished: true }))).toBe(true);
    expect(matchesFilters(listing, f({ neighborhood: "North Village" }))).toBe(true);
    expect(matchesFilters(listing, f({ neighborhood: "Palms" }))).toBe(false);
  });
});

describe("compareListings", () => {
  const ids = (list: Listing[]) => list.map((l) => l.id);
  const published = seed.listings.filter((l) => l.status === "published");

  it("sorts by price both ways", () => {
    const asc = [...published].sort(compareListings("price_asc"));
    expect(asc[0].rent).toBeLessThanOrEqual(asc[asc.length - 1].rent);
    const desc = [...published].sort(compareListings("price_desc"));
    expect(ids(desc)).toEqual(ids(asc).reverse());
  });

  it("sorts by soonest move-in", () => {
    const soonest = [...published].sort(compareListings("soonest"));
    expect(soonest[0].id).toBe("lst_strathmore_break");
  });
});

describe("parseFilters / filtersToParams", () => {
  it("round-trips", () => {
    const filters: ListingFilters = {
      q: "kelton",
      from: "2027-06-15",
      to: "2027-08-15",
      maxRent: 1500,
      roomTypes: ["private", "entire"],
      furnished: true,
      neighborhood: "Westwood Village",
      sort: "price_asc",
    };
    const params = Object.fromEntries(filtersToParams(filters));
    expect(parseFilters(params)).toEqual(filters);
  });

  it("ignores junk instead of failing", () => {
    expect(
      parseFilters({
        from: "not-a-date",
        maxRent: "-5",
        room: "penthouse,private",
        hood: "Mars",
        sort: "random",
      }),
    ).toEqual({ ...emptyFilters, roomTypes: ["private"] });
  });

  it("swaps move-in and move-out if they're reversed", () => {
    const f = parseFilters({ from: "2027-08-01", to: "2027-06-01" });
    expect([f.from, f.to]).toEqual(["2027-06-01", "2027-08-01"]);
  });

  it("leaves defaults out of the URL", () => {
    expect(filtersToParams(emptyFilters).toString()).toBe("");
  });

  it("counts active filters", () => {
    expect(countActiveFilters(emptyFilters)).toBe(0);
    expect(countActiveFilters({ ...emptyFilters, from: "2027-06-01", to: "2027-07-01", furnished: true })).toBe(2);
  });
});
