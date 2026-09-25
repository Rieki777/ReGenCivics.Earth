/**
 * getGoogleLoginUrl carries the page to come back to through the OAuth state.
 * A section link (#your-contributions) is part of that page, query string or
 * not, and a secret in the query never rides along.
 */
import { describe, expect, it } from "vitest";
import { getGoogleLoginUrl } from "./const";

function returnToOf(href: string): string | null {
  return new URL(href, "https://regencivics.earth").searchParams.get("returnTo");
}

describe("getGoogleLoginUrl", () => {
  it("keeps the hash on a path with a query string", () => {
    expect(returnToOf(getGoogleLoginUrl("/project/hill-farm?campaign=3#your-contributions"))).toBe(
      "/project/hill-farm?campaign=3#your-contributions",
    );
  });

  it("keeps the hash on a path without a query string", () => {
    expect(returnToOf(getGoogleLoginUrl("/project/hill-farm#needs"))).toBe("/project/hill-farm#needs");
  });

  it("still strips a stale error parameter and keeps the hash", () => {
    expect(returnToOf(getGoogleLoginUrl("/project/hill-farm?campaign=3&error=auth_failed#needs"))).toBe(
      "/project/hill-farm?campaign=3#needs",
    );
  });

  it("never carries a secret query parameter", () => {
    expect(returnToOf(getGoogleLoginUrl("/blog/post?preview=secret#top"))).toBe("/blog/post#top");
  });

  it("carries nothing for a server endpoint", () => {
    expect(getGoogleLoginUrl("/api/auth/email/verify?token=x")).toBe("/api/oauth/google");
  });
});
