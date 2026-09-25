/**
 * normalizeReturnTo is the one gate between a caller-supplied returnTo and a
 * redirect: the OAuth state and the email sign-in link both go through it.
 */
import { describe, expect, it } from "vitest";
import { MAX_RETURN_TO_LENGTH, normalizeReturnTo } from "./oauthReturnTo";

describe("normalizeReturnTo", () => {
  it("keeps a same-site path, query and hash included", () => {
    expect(normalizeReturnTo("/project/hill-farm?campaign=3#your-contributions")).toBe(
      "/project/hill-farm?campaign=3#your-contributions",
    );
    expect(normalizeReturnTo("/profile")).toBe("/profile");
    // An ordinary escape in a path is fine.
    expect(normalizeReturnTo("/search?q=land%20trust")).toBe("/search?q=land%20trust");
  });

  it("drops off-site, protocol-relative and scheme values", () => {
    expect(normalizeReturnTo("//evil.example")).toBeNull();
    expect(normalizeReturnTo("https://evil.example")).toBeNull();
    expect(normalizeReturnTo("javascript:alert(1)")).toBeNull();
    expect(normalizeReturnTo("evil.example/x")).toBeNull();
  });

  it("drops backslash tricks anywhere in the value", () => {
    expect(normalizeReturnTo("/\\evil.example")).toBeNull();
    expect(normalizeReturnTo("/x/..\\\\evil.example")).toBeNull();
  });

  it("drops encoded forms of the same tricks, double encoding included", () => {
    expect(normalizeReturnTo("%2F%2Fevil.example")).toBeNull();
    expect(normalizeReturnTo("/%2F%2Fevil.example")).toBeNull();
    expect(normalizeReturnTo("/%2fevil.example")).toBeNull();
    expect(normalizeReturnTo("/%5Cevil.example")).toBeNull();
    expect(normalizeReturnTo("/%252F%252Fevil.example")).toBeNull();
    expect(normalizeReturnTo("/%09/evil.example")).toBeNull();
    expect(normalizeReturnTo("/%0d%0aLocation:%20https://evil.example")).toBeNull();
  });

  it("drops escapes that do not decode", () => {
    expect(normalizeReturnTo("/project/%E0%A4%A")).toBeNull();
  });

  it("drops a value over the length cap and keeps one at it", () => {
    const atCap = "/" + "a".repeat(MAX_RETURN_TO_LENGTH - 1);
    expect(normalizeReturnTo(atCap)).toBe(atCap);
    expect(normalizeReturnTo(atCap + "a")).toBeNull();
  });

  it("drops server endpoints, whatever the case or dot segments", () => {
    // A stranger who picks the returnTo on someone's genuine sign-in link must
    // not be able to chain a second endpoint (a session swap) onto it.
    expect(normalizeReturnTo("/api/auth/email/verify?token=x")).toBeNull();
    expect(normalizeReturnTo("/API/auth/email/verify?token=x")).toBeNull();
    expect(normalizeReturnTo("/profile/../api/auth/email/verify?token=x")).toBeNull();
    expect(normalizeReturnTo("/profile/%2E%2E/api/auth/email/verify?token=x")).toBeNull();
    expect(normalizeReturnTo("/./api/oauth/google")).toBeNull();
    expect(normalizeReturnTo("/api")).toBeNull();
    expect(normalizeReturnTo("/api?x=1")).toBeNull();
    expect(normalizeReturnTo("/%61pi/oauth/google")).toBeNull();
    expect(normalizeReturnTo("/storage/uploads/x.jpg")).toBeNull();
    // A dot segment that lands on a protocol-relative path is dropped too.
    expect(normalizeReturnTo("/x/..//evil.example")).toBeNull();
    // Pages whose names merely start with "api" are fine.
    expect(normalizeReturnTo("/apiary")).toBe("/apiary");
  });

  it("returns the canonical path the browser would open", () => {
    expect(normalizeReturnTo("/profile/../settings/notifications")).toBe("/settings/notifications");
  });

  it("keeps a path whose query holds an encoded percent sign", () => {
    expect(normalizeReturnTo("/community/search?q=100%25")).toBe("/community/search?q=100%25");
    expect(normalizeReturnTo("/campaigns?q=50%25off")).toBe("/campaigns?q=50%25off");
    expect(normalizeReturnTo("/x?q=a%25b")).toBe("/x?q=a%25b");
  });

  it("removes secret query parameters and keeps the rest", () => {
    expect(normalizeReturnTo("/blog/my-post?preview=secret123")).toBe("/blog/my-post");
    expect(normalizeReturnTo("/campaign-updates/unsubscribe?token=abc&x=1")).toBe(
      "/campaign-updates/unsubscribe?x=1",
    );
    expect(normalizeReturnTo("/newsletter/confirm?TOKEN=abc")).toBe("/newsletter/confirm?TOKEN=abc");
    expect(normalizeReturnTo("/x?code=abc#section")).toBe("/x#section");
  });

  it("drops non-strings and empty values", () => {
    expect(normalizeReturnTo(undefined)).toBeNull();
    expect(normalizeReturnTo(null)).toBeNull();
    expect(normalizeReturnTo("   ")).toBeNull();
    expect(normalizeReturnTo(42 as unknown as string)).toBeNull();
  });
});
