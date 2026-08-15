/**
 * Open-redirect guard on /api/track/click (unit tests, no DB).
 *
 * The endpoint only redirects when the target is internal (our own domain or
 * a relative path) or carries a valid HMAC signature stamped at email
 * generation time. These tests pin the guard's decision logic and the
 * sign/verify round trip.
 */
import { beforeAll, describe, expect, it } from "vitest";

let emailTracking: typeof import("./emailTracking");

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "tracking-redirect-test-secret";
  emailTracking = await import("./emailTracking");
});

describe("isInternalRedirectTarget", () => {
  it("allows relative paths", () => {
    expect(emailTracking.isInternalRedirectTarget("/quests/42")).toBe(true);
  });

  it("rejects protocol-relative URLs", () => {
    expect(emailTracking.isInternalRedirectTarget("//evil.com/phish")).toBe(false);
  });

  it("allows the apex domain and subdomains", () => {
    expect(emailTracking.isInternalRedirectTarget("https://regencivics.earth/assembly")).toBe(true);
    expect(emailTracking.isInternalRedirectTarget("https://gov.regencivics.earth/proposal/1")).toBe(true);
    expect(emailTracking.isInternalRedirectTarget("https://core.regencivics.earth/donate")).toBe(true);
  });

  it("rejects external hosts", () => {
    expect(emailTracking.isInternalRedirectTarget("https://evil.com/")).toBe(false);
  });

  it("rejects lookalike hosts", () => {
    expect(emailTracking.isInternalRedirectTarget("https://evilregencivics.earth/")).toBe(false);
    expect(emailTracking.isInternalRedirectTarget("https://regencivics.earth.evil.com/")).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(emailTracking.isInternalRedirectTarget("javascript:alert(1)")).toBe(false);
    expect(emailTracking.isInternalRedirectTarget("data:text/html,x")).toBe(false);
  });

  it("rejects garbage", () => {
    expect(emailTracking.isInternalRedirectTarget("not a url")).toBe(false);
  });
});

describe("signTrackedUrl / verifyTrackedUrl", () => {
  const url = "https://partner-site.example/event";

  it("round-trips a valid signature", () => {
    const sig = emailTracking.signTrackedUrl(123, url);
    expect(sig).toBeTruthy();
    expect(emailTracking.verifyTrackedUrl(123, url, sig)).toBe(true);
  });

  it("rejects a wrong signature", () => {
    expect(emailTracking.verifyTrackedUrl(123, url, "0".repeat(32))).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(emailTracking.verifyTrackedUrl(123, url, undefined)).toBe(false);
    expect(emailTracking.verifyTrackedUrl(123, url, null)).toBe(false);
    expect(emailTracking.verifyTrackedUrl(123, url, "")).toBe(false);
  });

  it("binds the signature to the email log id", () => {
    const sig = emailTracking.signTrackedUrl(123, url);
    expect(emailTracking.verifyTrackedUrl(124, url, sig)).toBe(false);
  });

  it("binds the signature to the exact URL", () => {
    const sig = emailTracking.signTrackedUrl(123, url);
    expect(emailTracking.verifyTrackedUrl(123, url + "?extra=1", sig)).toBe(false);
  });
});

describe("wrapUrlWithTracking", () => {
  it("stamps a verifiable signature on the tracked link", () => {
    const wrapped = emailTracking.wrapUrlWithTracking("https://partner-site.example/event", 55);
    const parsed = new URL(wrapped);
    const target = parsed.searchParams.get("url");
    const sig = parsed.searchParams.get("sig");
    expect(target).toBe("https://partner-site.example/event");
    expect(sig).toBeTruthy();
    expect(emailTracking.verifyTrackedUrl(55, target!, sig)).toBe(true);
  });
});
