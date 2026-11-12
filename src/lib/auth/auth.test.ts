import { describe, expect, it } from "vitest";
import { defaultDisplayName, isUclaEmail, safeNextPath } from "./email";
import { decodeSession, encodeSession } from "./session";
import { issueLoginCode, verifyLoginCode } from "./login-codes";

describe("isUclaEmail", () => {
  it("accepts ucla.edu and g.ucla.edu", () => {
    expect(isUclaEmail("joebruin@ucla.edu")).toBe(true);
    expect(isUclaEmail("  JoeBruin@G.UCLA.EDU ")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isUclaEmail("joe@gmail.com")).toBe(false);
    expect(isUclaEmail("joe@ucla.edu.evil.com")).toBe(false);
    expect(isUclaEmail("joe@notucla.edu")).toBe(false);
    expect(isUclaEmail("@ucla.edu")).toBe(false);
    expect(isUclaEmail("ucla.edu")).toBe(false);
  });
});

describe("defaultDisplayName", () => {
  it("uses the first part of the email", () => {
    expect(defaultDisplayName("jordan.lee@ucla.edu")).toBe("Jordan");
    expect(defaultDisplayName("mchen22@g.ucla.edu")).toBe("Mchen");
  });
});

describe("safeNextPath", () => {
  it("allows paths on this site", () => {
    expect(safeNextPath("/saved")).toBe("/saved");
    expect(safeNextPath("/listings/abc?x=1")).toBe("/listings/abc?x=1");
  });

  it("blocks other origins", () => {
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});

describe("session cookie", () => {
  const future = Date.now() + 60_000;

  it("round-trips a valid session", () => {
    expect(decodeSession(encodeSession("u_demo", future))).toBe("u_demo");
  });

  it("rejects a tampered user id", () => {
    const value = encodeSession("u_demo", future);
    expect(decodeSession(value.replace("u_demo", "u_admin"))).toBeNull();
  });

  it("rejects an expired session", () => {
    const value = encodeSession("u_demo", future);
    expect(decodeSession(value, future + 1)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(decodeSession(undefined)).toBeNull();
    expect(decodeSession("nope")).toBeNull();
    expect(decodeSession("u_admin.9999999999999.forged")).toBeNull();
  });
});

describe("login codes", () => {
  it("accepts the right code once", () => {
    const email = `a${Math.random()}@ucla.edu`;
    const issued = issueLoginCode(email);
    if (!issued.ok) throw new Error("expected a code");
    expect(verifyLoginCode(email, issued.code)).toEqual({ ok: true });
    expect(verifyLoginCode(email, issued.code)).toEqual({ ok: false, reason: "expired" });
  });

  it("locks out after 5 wrong attempts", () => {
    const email = `b${Math.random()}@ucla.edu`;
    const issued = issueLoginCode(email);
    if (!issued.ok) throw new Error("expected a code");
    const wrong = issued.code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 4; i++) expect(verifyLoginCode(email, wrong).ok).toBe(false);
    expect(verifyLoginCode(email, wrong)).toEqual({ ok: false, reason: "too_many" });
    expect(verifyLoginCode(email, issued.code)).toEqual({ ok: false, reason: "too_many" });
  });

  it("expires after 10 minutes", () => {
    const email = `c${Math.random()}@ucla.edu`;
    const now = Date.now();
    const issued = issueLoginCode(email, now);
    if (!issued.ok) throw new Error("expected a code");
    expect(verifyLoginCode(email, issued.code, now + 11 * 60_000)).toEqual({ ok: false, reason: "expired" });
  });

  it("enforces a resend cooldown", () => {
    const email = `d${Math.random()}@ucla.edu`;
    const now = Date.now();
    expect(issueLoginCode(email, now).ok).toBe(true);
    expect(issueLoginCode(email, now + 5_000)).toMatchObject({ ok: false, reason: "cooldown" });
    expect(issueLoginCode(email, now + 31_000).ok).toBe(true);
  });
});
