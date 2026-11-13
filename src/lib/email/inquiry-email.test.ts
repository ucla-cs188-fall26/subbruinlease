import { describe, expect, it } from "vitest";
import { escapeHtml, inquiryEmail } from "./inquiry-email";

const base = {
  ownerFirstName: "Jordan",
  senderName: "Demo Bruin",
  senderEmail: "demo@ucla.edu",
  listingTitle: "Sunny room on Landfair",
  listingUrl: "https://example.com/listings/lst_1",
  inboxUrl: "https://example.com/inbox",
  message: "Hi! Is it still available?\nThanks!",
  desiredFrom: "2027-06-15",
  desiredTo: "2027-08-31",
};

describe("inquiryEmail", () => {
  it("includes the message, dates, and links", () => {
    const e = inquiryEmail(base);
    expect(e.subject).toBe("Demo Bruin asked about “Sunny room on Landfair”");
    expect(e.text).toContain("Hi! Is it still available?\nThanks!");
    expect(e.text).toContain("Jun 15 – Aug 31, 2027");
    expect(e.text).toContain("https://example.com/listings/lst_1");
    expect(e.html).toContain('href="mailto:demo@ucla.edu"');
  });

  it("escapes anything a student typed before putting it in HTML", () => {
    const e = inquiryEmail({ ...base, senderName: "<b>Eve</b>", message: '<script>alert("x")</script>', listingTitle: "A & B" });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).toContain("&lt;b&gt;Eve&lt;/b&gt;");
    expect(e.html).toContain("A &amp; B");
  });

  it("keeps the subject on one line", () => {
    const e = inquiryEmail({ ...base, senderName: "Eve\r\nBcc: x@evil.com" });
    expect(e.subject).not.toMatch(/[\r\n]/);
  });

  it("leaves out dates when none were given", () => {
    const e = inquiryEmail({ ...base, desiredFrom: null, desiredTo: null });
    expect(e.text).not.toContain("Dates they're looking for");
  });
});

describe("escapeHtml", () => {
  it("escapes quotes too", () => {
    expect(escapeHtml(`"'`)).toBe("&quot;&#39;");
  });
});
