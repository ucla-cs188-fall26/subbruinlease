import { describe, expect, it } from "vitest";
import { canReportListing, groupOpenReports, MAX_REPORTS_PER_DAY, reportLimitProblem, reportSchema } from "./reports";
import type { Viewer } from "./listings";
import type { ListingStatus } from "./types";

const owner: Viewer = { id: "u_owner", role: "student" };
const stranger: Viewer = { id: "u_other", role: "student" };
const at = (status: ListingStatus) => ({ status, ownerId: "u_owner" });

describe("reportSchema", () => {
  it("accepts a reason with optional details", () => {
    expect(reportSchema.parse({ reason: "scam", details: "  " })).toEqual({ reason: "scam", details: null });
  });
  it("rejects unknown reasons", () => {
    expect(reportSchema.safeParse({ reason: "nope", details: "" }).success).toBe(false);
  });
  it("needs details for “something else”", () => {
    expect(reportSchema.safeParse({ reason: "other", details: "bad" }).success).toBe(false);
    expect(reportSchema.safeParse({ reason: "other", details: "The photos are from Zillow." }).success).toBe(true);
  });
});

describe("canReportListing", () => {
  it("lets signed-in students report public listings they don't own", () => {
    expect(canReportListing(at("published"), stranger)).toBe(true);
    expect(canReportListing(at("unavailable"), stranger)).toBe(true);
  });
  it("blocks owners, signed-out visitors, and non-public listings", () => {
    expect(canReportListing(at("published"), owner)).toBe(false);
    expect(canReportListing(at("published"), null)).toBe(false);
    for (const s of ["draft", "closed", "hidden"] as const) expect(canReportListing(at(s), stranger)).toBe(false);
  });
});

describe("reportLimitProblem", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  it("allows one open report per listing", () => {
    expect(reportLimitProblem([], "l1", now)).toBeNull();
    expect(reportLimitProblem([{ listingId: "l1", status: "open", createdAt: "2026-11-01T00:00:00Z" }], "l1", now)).toMatch(/already/);
    expect(reportLimitProblem([{ listingId: "l1", status: "dismissed", createdAt: "2026-11-01T00:00:00Z" }], "l1", now)).toBeNull();
  });
  it("caps reports per day", () => {
    const many = Array.from({ length: MAX_REPORTS_PER_DAY }, (_, i) => ({ listingId: `x${i}`, status: "dismissed" as const, createdAt: "2026-11-13T10:00:00Z" }));
    expect(reportLimitProblem(many, "l1", now)).toMatch(/today/);
  });
});

describe("groupOpenReports", () => {
  it("groups open reports by listing, most reporters first", () => {
    const groups = groupOpenReports([
      { listingId: "a", reporterId: "u1", createdAt: "2026-11-13T01:00:00Z", status: "open" as const },
      { listingId: "b", reporterId: "u1", createdAt: "2026-11-12T01:00:00Z", status: "open" as const },
      { listingId: "b", reporterId: "u2", createdAt: "2026-11-12T02:00:00Z", status: "open" as const },
      { listingId: "c", reporterId: "u3", createdAt: "2026-11-13T05:00:00Z", status: "dismissed" as const },
    ]);
    expect(groups.map((g) => [g.listingId, g.reporters])).toEqual([["b", 2], ["a", 1]]);
    expect(groups[0].reports[0].reporterId).toBe("u2");
  });
});
