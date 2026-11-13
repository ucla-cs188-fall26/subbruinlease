import { describe, expect, it } from "vitest";
import { canSaveListing, savedState } from "./favorites";
import type { Viewer } from "./listings";
import type { ListingStatus } from "./types";

const owner: Viewer = { id: "u_owner", role: "student" };
const stranger: Viewer = { id: "u_other", role: "student" };
const at = (status: ListingStatus) => ({ status, ownerId: "u_owner" });

describe("canSaveListing", () => {
  it("lets other students save live listings", () => {
    expect(canSaveListing(at("published"), stranger)).toBe(true);
  });

  it("never lets you save your own listing", () => {
    expect(canSaveListing(at("published"), owner)).toBe(false);
  });

  it("only allows saving live listings", () => {
    for (const status of ["draft", "unavailable", "closed", "hidden"] as const) {
      expect(canSaveListing(at(status), stranger)).toBe(false);
    }
  });
});

describe("savedState", () => {
  it("maps every status to how it shows on the Saved page", () => {
    expect(savedState(at("published"))).toBe("available");
    expect(savedState(at("unavailable"))).toBe("paused");
    expect(savedState(at("closed"))).toBe("closed");
    expect(savedState(at("hidden"))).toBe("removed");
    expect(savedState(at("draft"))).toBe("removed");
  });
});
