/**
 * The route allowlist, against the router it claims to describe.
 *
 * shared/appRoutes.ts decides which URLs the server answers 200 for. If it
 * drifts from App.tsx in one direction a real page starts returning 404 to
 * crawlers; in the other, the soft-404 space reopens. So the list is checked
 * against the source rather than trusted, and the matcher is checked against
 * every pattern it contains.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  APP_ROUTE_PATTERNS,
  SERVER_RENDERED_PREFIXES,
  matchesAppRoute,
} from "@shared/appRoutes";
import { LEARN_SLUGS } from "@shared/learnContent";

const appSrc = readFileSync(
  resolve(__dirname, "../client/src/App.tsx"),
  "utf8",
);

function routesInApp(): string[] {
  return [...new Set([...appSrc.matchAll(/<Route path=\{"([^"]+)"\}/g)].map((m) => m[1]))].sort();
}

describe("the allowlist matches App.tsx exactly", () => {
  it("finds routes to compare against", () => {
    // Guard the guard: a regex that stops matching would make every
    // assertion below pass against an empty set.
    expect(routesInApp().length).toBeGreaterThan(100);
  });

  it("has no route App.tsx lacks, and lacks no route App.tsx has", () => {
    const inApp = routesInApp();
    const inList = [...APP_ROUTE_PATTERNS].sort();
    // Reported as two directed diffs, because "arrays differ" tells you
    // nothing about which way to fix it.
    expect(inApp.filter((r) => !inList.includes(r))).toEqual([]);
    expect(inList.filter((r) => !inApp.includes(r))).toEqual([]);
  });

  it("uses only wouter syntax the matcher implements", () => {
    for (const p of APP_ROUTE_PATTERNS) {
      expect(p.startsWith("/"), p).toBe(true);
      expect(p, `${p} uses an unsupported wildcard`).not.toContain("*");
      for (const seg of p.split("/").slice(1)) {
        if (!seg.startsWith(":")) continue;
        expect(seg, `${p} has an unsupported param form`).toMatch(/^:[A-Za-z][A-Za-z0-9]*\??$/);
      }
    }
  });

  it("carries the catch-all separately, not as a pattern", () => {
    // <Route><NotFound/></Route> has no path and must not appear in the list.
    expect(appSrc).toContain("<Route><EB><NotFound /></EB></Route>");
    expect(APP_ROUTE_PATTERNS).not.toContain("");
  });
});

describe("matchesAppRoute accepts everything the app serves", () => {
  it.each([...APP_ROUTE_PATTERNS])("accepts a concrete url for %s", (pattern) => {
    // Substitute a plausible value for each param, dropping optional ones.
    const concrete =
      pattern
        .split("/")
        .map((seg) => {
          if (!seg.startsWith(":")) return seg;
          return seg.endsWith("?") ? null : "sample-value";
        })
        .filter((s) => s !== null)
        .join("/") || "/";
    expect(matchesAppRoute(concrete), `${pattern} -> ${concrete}`).toBe(true);
  });

  it("accepts the optional-segment route with and without the segment", () => {
    expect(matchesAppRoute("/messages")).toBe(true);
    expect(matchesAppRoute("/messages/abc123")).toBe(true);
  });

  it.each([
    "/",
    "/fund",
    "/learn",
    "/glossary",
    "/community",
    "/community/post/635",
    "/blog/the-regen-ship",
    "/campaign/12",
    "/campaign/12/manage",
    "/quest/gut-health",
    "/network",
    "/ship/inventory/galley",
    "/embed/anything/at/all",
  ])("accepts the real url %s", (path) => {
    expect(matchesAppRoute(path)).toBe(true);
  });

  it.each(LEARN_SLUGS)("accepts the real Learn page /learn/%s", (slug) => {
    expect(matchesAppRoute(`/learn/${slug}`)).toBe(true);
  });
});

describe("matchesAppRoute rejects what does not exist", () => {
  it.each([
    "/totally-made-up-route",
    "/fund/extra-segment",
    "/community/post/635/extra",
    "/quest/one/two",
    "/wp-admin",
    "/.env",
    "/admin/../secret",
  ])("rejects %s", (path) => {
    expect(matchesAppRoute(path)).toBe(false);
  });

  it("does not let a param swallow extra path segments", () => {
    // '/quest/:slug' must not match '/quest/a/b'; a greedy [\s\S]+ would.
    expect(matchesAppRoute("/quest/a")).toBe(true);
    expect(matchesAppRoute("/quest/a/b")).toBe(false);
  });

  it("does not treat a prefix as a match", () => {
    expect(matchesAppRoute("/fun")).toBe(false);
    expect(matchesAppRoute("/fundraising")).toBe(false);
  });

  it("keeps the server-rendered prefixes to their own subtree", () => {
    for (const p of SERVER_RENDERED_PREFIXES) {
      expect(matchesAppRoute(p)).toBe(true);
      expect(matchesAppRoute(`${p}/child`)).toBe(true);
      expect(matchesAppRoute(`${p}-not-really`)).toBe(false);
    }
  });

  it("is case sensitive, matching wouter", () => {
    expect(matchesAppRoute("/Fund")).toBe(false);
    expect(matchesAppRoute("/fund")).toBe(true);
  });
});

describe("the two 404 layers compose", () => {
  // This allowlist answers "is there a route of this shape". It deliberately
  // cannot answer "does this particular page exist", because for /campaign/:id
  // and /community/post/:id only the database knows. Where we DO know the full
  // set, a second check narrows it. /learn is the one such space today.
  //
  // Keeping these separate is what stops the allowlist from needing a list of
  // every valid id in the system.
  it("accepts any /learn/<slug> shape at the route layer", () => {
    expect(matchesAppRoute("/learn/buy-cheap-things")).toBe(true);
  });

  it("leaves the slug layer to reject the ones that do not exist", () => {
    // server/_core/vite.ts checks LEARN_SLUGS and 404s the rest; the guards
    // for that live in server/learn-publication.test.ts.
    expect(LEARN_SLUGS).not.toContain("buy-cheap-things");
    expect(LEARN_SLUGS).toContain("crowd-pooling");
  });

  it("still rejects an invented top-level path at the route layer", () => {
    // The case the slug layer could never catch, and the reason this
    // allowlist exists at all.
    expect(matchesAppRoute("/totally-made-up-route")).toBe(false);
  });

  it("rejects a shape no route declares, even under a real prefix", () => {
    expect(matchesAppRoute("/learn/crowd-pooling/nested")).toBe(false);
  });
});
