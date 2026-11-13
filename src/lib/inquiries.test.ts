import { describe, expect, it } from "vitest";
import {
  firstName,
  inquiryLimitProblem,
  inquirySchema,
  MAX_PER_DAY,
  MAX_PER_HOUR,
  recentInquiryAbout,
  starterMessage,
} from "./inquiries";

const today = "2026-11-12";
const schema = inquirySchema({ today });
const longEnough = "Hi! Is your place still available for the summer?";

const errorsFor = (input: Record<string, string>) => {
  const r = schema.safeParse({ message: longEnough, desiredFrom: "", desiredTo: "", ...input });
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]));
};

describe("inquirySchema", () => {
  it("accepts a message with no dates", () => {
    const r = schema.safeParse({ message: `  ${longEnough}  `, desiredFrom: "", desiredTo: "" });
    expect(r.success && r.data).toEqual({ message: longEnough, desiredFrom: null, desiredTo: null });
  });

  it("rejects messages that are too short or too long", () => {
    expect(errorsFor({ message: "hi" }).message).toMatch(/at least/);
    expect(errorsFor({ message: "x".repeat(1001) }).message).toMatch(/under/);
  });

  it("makes you fill in the starter message's blank", () => {
    const draft = starterMessage({ ownerFirstName: "Jordan", listingFrom: "2027-06-15", listingTo: "2027-09-10" });
    expect(errorsFor({ message: draft }).message).toMatch(/bracketed/);
  });

  it("needs both dates or neither, in order, in the future", () => {
    expect(errorsFor({ desiredFrom: "2027-06-15" }).desiredTo).toMatch(/both/);
    expect(errorsFor({ desiredTo: "2027-06-15" }).desiredFrom).toMatch(/both/);
    expect(errorsFor({ desiredFrom: "2027-06-15", desiredTo: "2027-06-01" }).desiredTo).toMatch(/after/);
    expect(errorsFor({ desiredFrom: "2026-01-01", desiredTo: "2026-02-01" }).desiredTo).toMatch(/future/);
    expect(errorsFor({ desiredFrom: "2027-06-15", desiredTo: "2027-08-31" })).toEqual({});
  });
});

describe("inquiryLimitProblem", () => {
  const now = new Date("2026-11-12T20:00:00Z");
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

  it("allows a first message", () => {
    expect(inquiryLimitProblem([], "lst_a", now)).toBeNull();
  });

  it("blocks messaging the same listing twice within a day", () => {
    expect(inquiryLimitProblem([{ listingId: "lst_a", createdAt: ago(60 * 23) }], "lst_a", now)).toMatch(/already/);
    expect(inquiryLimitProblem([{ listingId: "lst_a", createdAt: ago(60 * 25) }], "lst_a", now)).toBeNull();
  });

  it("caps messages per hour and per day", () => {
    const hour = Array.from({ length: MAX_PER_HOUR }, (_, i) => ({ listingId: `l${i}`, createdAt: ago(i + 1) }));
    expect(inquiryLimitProblem(hour, "lst_new", now)).toMatch(/last hour/);
    const day = Array.from({ length: MAX_PER_DAY }, (_, i) => ({ listingId: `l${i}`, createdAt: ago(61 + i * 30) }));
    expect(inquiryLimitProblem(day, "lst_new", now)).toMatch(/today/);
  });
});

describe("recentInquiryAbout", () => {
  const now = new Date("2026-11-12T20:00:00Z");
  it("finds a message about this listing from the last day only", () => {
    const sent = [
      { id: "old", listingId: "lst_a", createdAt: "2026-11-01T00:00:00Z" },
      { id: "new", listingId: "lst_a", createdAt: "2026-11-12T19:00:00Z" },
      { id: "other", listingId: "lst_b", createdAt: "2026-11-12T19:30:00Z" },
    ];
    expect(recentInquiryAbout(sent, "lst_a", now)?.id).toBe("new");
    expect(recentInquiryAbout(sent.slice(0, 1), "lst_a", now)).toBeNull();
    expect(recentInquiryAbout(sent, "lst_c", now)).toBeNull();
  });
});

describe("starterMessage", () => {
  it("uses the student's dates when they gave valid ones", () => {
    const m = starterMessage({
      ownerFirstName: "Jordan",
      listingFrom: "2027-06-15",
      listingTo: "2027-09-10",
      desiredFrom: "2027-07-01",
      desiredTo: "2027-08-31",
    });
    expect(m).toMatch(/^Hi Jordan!/);
    expect(m).toContain("from Jul 1 – Aug 31, 2027");
  });

  it("falls back to the listing's dates", () => {
    const m = starterMessage({ ownerFirstName: "Jordan", listingFrom: "2027-06-15", listingTo: "2027-09-10", desiredFrom: "2027-07-01" });
    expect(m).toContain("(Jun 15 – Sep 10, 2027)");
  });
});

describe("firstName", () => {
  it("takes the first word", () => {
    expect(firstName("Jordan Lee")).toBe("Jordan");
    expect(firstName("  Mia  ")).toBe("Mia");
  });
});
