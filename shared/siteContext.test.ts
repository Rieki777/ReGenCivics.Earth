import { describe, expect, it } from "vitest";
import {
  SITE_ASSETS_ORIGIN,
  SITE_CANONICAL_PAGES,
  SITE_ORIGIN,
  SITE_WWW_ORIGIN,
  absoluteSiteUrl,
  canonicalPublicBaseUrl,
  configuredPublicBaseUrl,
  formatSiteContextForPrompt,
  rewriteLegacySiteUrls,
} from "./siteContext";
import { matchesAppRoute } from "./appRoutes";

describe("absoluteSiteUrl", () => {
  it("builds apex URLs and leaves absolute hrefs alone", () => {
    expect(absoluteSiteUrl("/")).toBe(SITE_ORIGIN);
    expect(absoluteSiteUrl("season2")).toBe(`${SITE_ORIGIN}/season2`);
    expect(absoluteSiteUrl("/apply")).toBe(`${SITE_ORIGIN}/apply`);
    expect(absoluteSiteUrl("https://example.com/x")).toBe("https://example.com/x");
    expect(absoluteSiteUrl("https://regencivics.com/apply")).toBe(`${SITE_ORIGIN}/apply`);
    expect(absoluteSiteUrl("http://www.regencivics.com/join")).toBe(`${SITE_ORIGIN}/join`);
  });
});

describe("retired regencivics.com hosts", () => {
  it("rewrites bare and www bases to the .earth origin", () => {
    expect(canonicalPublicBaseUrl("https://regencivics.com")).toBe(SITE_ORIGIN);
    expect(canonicalPublicBaseUrl("https://regencivics.com/")).toBe(SITE_ORIGIN);
    expect(canonicalPublicBaseUrl("http://www.regencivics.com/blog")).toBe(SITE_ORIGIN);
    expect(canonicalPublicBaseUrl("https://REGENCIVICS.COM")).toBe(SITE_ORIGIN);
    expect(canonicalPublicBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
    expect(canonicalPublicBaseUrl("", "http://localhost:3000")).toBe("http://localhost:3000");
    expect(canonicalPublicBaseUrl("not a url")).toBe(SITE_ORIGIN);
  });

  it("prefers APP_BASE_URL, then APP_URL, then VITE_APP_URL, and still rewrites .com", () => {
    expect(configuredPublicBaseUrl({
      appBaseUrl: "https://www.regencivics.com",
      appUrl: "http://localhost:3000",
    })).toBe(SITE_ORIGIN);
    expect(configuredPublicBaseUrl({
      appUrl: "https://regencivics.com",
      viteAppUrl: "http://localhost:5000",
    })).toBe(SITE_ORIGIN);
    expect(configuredPublicBaseUrl({
      viteAppUrl: "http://127.0.0.1:3000",
    })).toBe("http://127.0.0.1:3000");
    expect(configuredPublicBaseUrl({})).toBe(SITE_ORIGIN);
  });

  it("rewrites links inside email HTML and leaves lookalikes alone", () => {
    const html = [
      '<a href="https://regencivics.com/blog/how-to-apply-for-season-2">Apply</a>',
      '<a href="http://www.regencivics.com/join?e=1">Join</a>',
      "See https://regencivics.com/season2 today.",
      "team@regencivics.com",
      "https://regencivics.com.evil.com/phish",
      "https://assets.regencivics.earth/logo.png",
    ].join(" ");
    const out = rewriteLegacySiteUrls(html);
    expect(out).toContain(`${SITE_ORIGIN}/blog/how-to-apply-for-season-2`);
    expect(out).toContain(`${SITE_ORIGIN}/join?e=1`);
    expect(out).toContain(`${SITE_ORIGIN}/season2`);
    expect(out).toContain("team@regencivics.com");
    expect(out).toContain("https://regencivics.com.evil.com/phish");
    expect(out).toContain("https://assets.regencivics.earth/logo.png");
    expect(out).not.toMatch(/https?:\/\/(?:www\.)?regencivics\.com(?![a-z0-9.-])/i);
  });
});

describe("SITE_CANONICAL_PAGES", () => {
  it("only lists paths the site actually serves", () => {
    // /join is a server route (GET /join in server/routes/calendarFeed.ts),
    // not a client route, so matchesAppRoute is false for it on purpose.
    const serverHooks = new Set(["/join"]);
    for (const page of SITE_CANONICAL_PAGES) {
      expect(page.path.startsWith("/")).toBe(true);
      expect(matchesAppRoute(page.path) || serverHooks.has(page.path), page.path).toBe(true);
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
      "/join",
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
    expect(block).toContain(`${SITE_ORIGIN}/join`);
    expect(block).toContain("Join the call");
    expect(block).toContain(`${SITE_ORIGIN}/apply`);
    expect(block).toContain(`${SITE_ORIGIN}/claim-seeds`);
    expect(block).toContain("ask the admin for the correct URL");
    expect(block).not.toMatch(/[\u2014\u2013]/);
  });
});
