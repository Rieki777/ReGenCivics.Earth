import { describe, expect, it } from "vitest";
import {
  SITE_ASSETS_ORIGIN,
  SITE_CANONICAL_PAGES,
  SITE_ORIGIN,
  SITE_WWW_ORIGIN,
  absoluteSiteUrl,
  formatSiteContextForPrompt,
} from "./siteContext";
import { matchesAppRoute } from "./appRoutes";

describe("absoluteSiteUrl", () => {
  it("builds apex URLs and leaves absolute hrefs alone", () => {
    expect(absoluteSiteUrl("/")).toBe(SITE_ORIGIN);
    expect(absoluteSiteUrl("season2")).toBe(`${SITE_ORIGIN}/season2`);
    expect(absoluteSiteUrl("/apply")).toBe(`${SITE_ORIGIN}/apply`);
    expect(absoluteSiteUrl("https://example.com/x")).toBe("https://example.com/x");
  });
});

describe("SITE_CANONICAL_PAGES", () => {
  it("only lists paths the SPA router knows", () => {
    for (const page of SITE_CANONICAL_PAGES) {
      expect(page.path.startsWith("/")).toBe(true);
      expect(matchesAppRoute(page.path)).toBe(true);
    }
  });

  it("includes the high-traffic CTAs email bots keep inventing", () => {
    const paths = new Set(SITE_CANONICAL_PAGES.map((p) => p.path));
    for (const required of [
      "/season2",
      "/apply",
      "/investor",
      "/claim-seeds",
      "/email-preferences",
      "/schedule",
      "/newsletter",
    ]) {
      expect(paths.has(required)).toBe(true);
    }
  });
});

describe("formatSiteContextForPrompt", () => {
  it("forbids inventing links and lists real URLs", () => {
    const block = formatSiteContextForPrompt();
    expect(block).toContain("never invent links");
    expect(block).toContain(SITE_ORIGIN);
    expect(block).toContain(SITE_WWW_ORIGIN);
    expect(block).toContain(SITE_ASSETS_ORIGIN);
    expect(block).toContain(`${SITE_ORIGIN}/season2`);
    expect(block).toContain(`${SITE_ORIGIN}/apply`);
    expect(block).toContain(`${SITE_ORIGIN}/claim-seeds`);
    expect(block).toContain("ask the admin for the correct URL");
    expect(block).not.toMatch(/[\u2014\u2013]/);
  });
});
