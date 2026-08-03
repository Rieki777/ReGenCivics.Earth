/**
 * The Learn hub against everything that publishes it.
 *
 * The content tests check the articles and the crawler tests check the HTML.
 * This checks the seams: that the links inside the content point at routes that
 * exist, and that the files we hand to crawlers list the pages we actually
 * ship. Both are drift, which is the failure mode this project keeps hitting
 * (llms.txt named a ninth form of capital the product does not have for a
 * month, and nothing failed).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LEARN_ARTICLES, LEARN_SLUGS, parseInline } from "@shared/learnContent";

const root = resolve(__dirname, "..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

/** Every path the client router can serve, from the wouter <Route> list. */
function appRoutes(): Set<string> {
  const src = read("client/src/App.tsx");
  const routes = new Set<string>();
  for (const m of src.matchAll(/<Route path=\{"([^"]+)"\}/g)) routes.add(m[1]);
  return routes;
}

/** Every internal href the Learn content points at, from every field. */
function learnHrefs(): Set<string> {
  const hrefs = new Set<string>();
  for (const a of LEARN_ARTICLES) {
    for (const step of a.nextSteps) hrefs.add(step.href);
    for (const slug of a.related) hrefs.add(`/learn/${slug}`);
    for (const s of a.sections) {
      if (s.table?.sourceUrl) hrefs.add(s.table.sourceUrl);
      if (s.figure?.sourceUrl) hrefs.add(s.figure.sourceUrl);
      for (const text of [...(s.paragraphs ?? []), ...(s.bullets ?? [])]) {
        for (const t of parseInline(text)) {
          if (t.type === "link" && t.href.startsWith("/")) hrefs.add(t.href);
        }
      }
    }
  }
  return hrefs;
}

describe("Learn links resolve to real routes", () => {
  const routes = appRoutes();
  const hrefs = [...learnHrefs()].sort();

  it("finds the routes it is checking against", () => {
    // Guard the guard: if the App.tsx regex ever stops matching, every
    // assertion below would pass vacuously.
    expect(routes.size).toBeGreaterThan(50);
    expect(routes.has("/fund")).toBe(true);
    expect(hrefs.length).toBeGreaterThan(10);
  });

  it.each([...new Set([...learnHrefs()])].sort())("%s is a route the app serves", (href) => {
    if (href.startsWith("/learn/")) {
      expect(LEARN_SLUGS).toContain(href.slice("/learn/".length));
      return;
    }
    expect(routes.has(href)).toBe(true);
  });

  it("never links an article to itself", () => {
    for (const a of LEARN_ARTICLES) {
      expect(a.related).not.toContain(a.slug);
      for (const step of a.nextSteps) expect(step.href).not.toBe(`/learn/${a.slug}`);
    }
  });

  it("keeps sibling links reciprocal enough to form a connected hub", () => {
    // Every article must be reachable from at least one other article, or it
    // is an orphan that only the index links to.
    const linkedTo = new Set(LEARN_ARTICLES.flatMap((a) => a.related));
    for (const slug of LEARN_SLUGS) expect(linkedTo.has(slug)).toBe(true);
  });
});

describe("published indexes list every Learn page", () => {
  it("llms.txt links every article and the hub", () => {
    const txt = read("client/public/llms.txt");
    expect(txt).toContain("https://regencivics.earth/learn)");
    for (const slug of LEARN_SLUGS) {
      expect(txt, `llms.txt is missing /learn/${slug}`).toContain(
        `https://regencivics.earth/learn/${slug}`,
      );
    }
  });

  it("the sitemap handler is driven by the registry, not a hand-kept copy", () => {
    // A literal list here would be the next thing to drift, so the test
    // asserts the wiring rather than the output.
    const src = read("server/_core/index.ts");
    expect(src).toContain("LEARN_SLUGS.map");
    expect(src).toContain("/learn");
  });

  it("the crawler content resolver is reachable for the hub and each slug", () => {
    const src = read("server/_core/crawler-content.ts");
    expect(src).toContain('reqPath === "/learn"');
    expect(src).toMatch(/\/\^\\\/learn\\\/\(\[a-z0-9-\]\+\)\$\//);
  });
});

describe("unknown Learn slugs are a real 404, not a soft one", () => {
  const src = read("server/_core/vite.ts");

  it("detects an unknown slug against the registry, not a hand-kept list", () => {
    expect(src).toContain("LEARN_SLUGS.includes(learnSlugMatch[1])");
    expect(src).toContain('import { LEARN_SLUGS } from "@shared/learnContent"');
  });

  it("sets a 404 status for one", () => {
    expect(src).toContain("if (unknownLearnSlug) res.status(404)");
  });

  it("does not let a missing page nominate itself as canonical", () => {
    // Before this, /learn/anything served canonical=/learn/anything, so every
    // fabricated URL advertised itself as the original.
    expect(src).toMatch(/unknownLearnSlug\s*\?\s*`\$\{BASE_URL\}\/learn`/);
  });

  it("still serves the app body, so a mistyped URL lands somewhere useful", () => {
    // The 404 is a status change only; res.send(withNonce) is unconditional.
    const sendIdx = src.indexOf("res.send(withNonce)");
    const statusIdx = src.indexOf("if (unknownLearnSlug) res.status(404)");
    expect(statusIdx).toBeGreaterThan(-1);
    expect(sendIdx).toBeGreaterThan(statusIdx);
  });

  it("leaves the hub itself alone", () => {
    // The regex requires something after /learn/, so /learn cannot match.
    const m = "/learn".match(/^\/learn\/(.+)$/);
    expect(m).toBeNull();
  });

  it.each(LEARN_SLUGS)("does not 404 the real slug %s", (slug) => {
    const m = `/learn/${slug}`.match(/^\/learn\/(.+)$/);
    expect(m).not.toBeNull();
    expect(LEARN_SLUGS.includes(m![1])).toBe(true);
  });

  it.each([
    "not-a-real-page",
    "buy-cheap-things",
    "crowd-pooling-extra",
    "Crowd-Pooling",
    "crowd-pooling/nested",
  ])("treats /learn/%s as unknown", (slug) => {
    const m = `/learn/${slug}`.match(/^\/learn\/(.+)$/);
    expect(m).not.toBeNull();
    expect(LEARN_SLUGS.includes(m![1])).toBe(false);
  });
});

describe("Learn slugs are URL-safe", () => {
  it.each(LEARN_SLUGS)("%s is lowercase, hyphenated, no encoding needed", (slug) => {
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(encodeURIComponent(slug)).toBe(slug);
  });
});
