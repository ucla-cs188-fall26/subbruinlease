import { describe, expect, it } from "vitest";
import {
  canContactOwner,
  canEditListing,
  canViewListing,
  ownerActions,
  pickSimilar,
  publishProblem,
  statusAfter,
  type Viewer,
} from "./listings";
import type { Listing, ListingStatus } from "./types";

const owner: Viewer = { id: "u_owner", role: "student" };
const stranger: Viewer = { id: "u_other", role: "student" };
const admin: Viewer = { id: "u_admin", role: "admin" };

const at = (status: ListingStatus) => ({ status, ownerId: "u_owner" });

describe("canViewListing", () => {
  it("lets anyone open published and unavailable listings", () => {
    for (const viewer of [null, stranger, owner, admin]) {
      expect(canViewListing(at("published"), viewer)).toBe(true);
      expect(canViewListing(at("unavailable"), viewer)).toBe(true);
    }
  });

  it("keeps drafts, closed, and hidden listings to the owner and admins", () => {
    for (const status of ["draft", "closed", "hidden"] as const) {
      expect(canViewListing(at(status), null)).toBe(false);
      expect(canViewListing(at(status), stranger)).toBe(false);
      expect(canViewListing(at(status), owner)).toBe(true);
      expect(canViewListing(at(status), admin)).toBe(true);
    }
  });
});

describe("canContactOwner", () => {
  it("only allows messaging published listings you don't own", () => {
    expect(canContactOwner(at("published"), stranger)).toBe(true);
    expect(canContactOwner(at("published"), null)).toBe(true); // shown a sign-in prompt
    expect(canContactOwner(at("published"), owner)).toBe(false);
    expect(canContactOwner(at("unavailable"), stranger)).toBe(false);
  });
});

describe("pickSimilar", () => {
  const make = (id: string, neighborhood: Listing["neighborhood"], rent: number, status: ListingStatus = "published") =>
    ({ id, neighborhood, rent, status }) as Listing;

  it("prefers the same neighborhood, then closest rent, and skips itself and non-published", () => {
    const base = make("a", "Palms", 1000);
    const result = pickSimilar(base, [
      base,
      make("far-cheap", "Sawtelle", 990),
      make("same-pricey", "Palms", 2000),
      make("same-close", "Palms", 1100),
      make("draft", "Palms", 1000, "draft"),
    ]);
    expect(result.map((l) => l.id)).toEqual(["same-close", "same-pricey", "far-cheap"]);
  });
});

describe("status changes", () => {
  it("only offers sensible next steps", () => {
    expect(ownerActions("draft")).toEqual(["publish", "close"]);
    expect(ownerActions("published")).toEqual(["mark_unavailable", "close"]);
    expect(ownerActions("unavailable")).toEqual(["mark_available", "close"]);
    expect(ownerActions("closed")).toEqual([]);
    expect(ownerActions("hidden")).toEqual([]);
    expect(statusAfter("mark_available")).toBe("published");
  });

  it("blocks editing closed and hidden listings", () => {
    expect(canEditListing({ status: "draft" })).toBe(true);
    expect(canEditListing({ status: "unavailable" })).toBe(true);
    expect(canEditListing({ status: "closed" })).toBe(false);
    expect(canEditListing({ status: "hidden" })).toBe(false);
  });

  it("needs a photo and future dates to publish", () => {
    const photo = [{ id: "i", listingId: "l", url: "/x", alt: "", position: 0 }];
    expect(publishProblem({ images: [], availableTo: "2027-09-01" }, "2026-11-12")).toMatch(/photo/);
    expect(publishProblem({ images: photo, availableTo: "2026-11-12" }, "2026-11-12")).toMatch(/passed/);
    expect(publishProblem({ images: photo, availableTo: "2027-09-01" }, "2026-11-12")).toBeNull();
  });
});
