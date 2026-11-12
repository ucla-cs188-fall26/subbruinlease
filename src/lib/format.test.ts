import { describe, expect, it } from "vitest";
import {
  daysBetween,
  formatDate,
  formatDateRange,
  formatMoney,
  formatRent,
  formatStayLength,
  todayInLA,
} from "./format";

describe("format", () => {
  it("formats money without cents", () => {
    expect(formatMoney(1250)).toBe("$1,250");
    expect(formatRent(850)).toBe("$850/mo");
  });

  it("never shifts a calendar date by time zone", () => {
    // Tests run in America/Los_Angeles (see vitest.config.mts), where a naive
    // new Date("2027-06-15") would print as Jun 14.
    expect(formatDate("2027-06-15")).toBe("Jun 15, 2027");
    expect(formatDate("2027-01-01")).toBe("Jan 1, 2027");
  });

  it("only shows the year once when both dates share it", () => {
    expect(formatDateRange("2027-06-15", "2027-09-10")).toBe("Jun 15 – Sep 10, 2027");
    expect(formatDateRange("2026-12-14", "2027-01-04")).toBe("Dec 14, 2026 – Jan 4, 2027");
  });

  it("counts days between dates", () => {
    expect(daysBetween("2027-06-01", "2027-06-30")).toBe(29);
    expect(daysBetween("2027-03-13", "2027-03-15")).toBe(2); // across DST change
  });

  it("describes stay length in friendly units", () => {
    expect(formatStayLength("2027-06-01", "2027-06-02")).toBe("1 day");
    expect(formatStayLength("2027-06-01", "2027-06-13")).toBe("12 days");
    expect(formatStayLength("2027-06-01", "2027-06-22")).toBe("3 weeks");
    expect(formatStayLength("2027-06-15", "2027-09-10")).toBe("about 3 months");
    expect(formatStayLength("2027-01-01", "2027-12-31")).toBe("about 12 months");
  });

  it("uses the Los Angeles calendar day for today", () => {
    // 7am UTC on Nov 12 is still Nov 11 in LA.
    expect(todayInLA(new Date("2026-11-12T07:00:00Z"))).toBe("2026-11-11");
    expect(todayInLA(new Date("2026-11-12T09:00:00Z"))).toBe("2026-11-12");
  });
});
