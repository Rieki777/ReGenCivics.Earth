/**
 * How the site describes itself (shared/siteCopy.ts, Rye's framing of
 * 2026-09-28) reaches every surface that describes it.
 *
 * The TypeScript surfaces import the strings, so they cannot drift. The static
 * ones cannot import anything: index.html's meta tags and Organization JSON-LD,
 * and the two llms files. Before the shared module, five files each kept a copy
 * of the site description and they had already drifted into three different
 * sentences, so the static copies are held to the module here.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCAL_NEEDS, NEEDS_SECTION, SITE_DESCRIPTION, SITE_TAGLINE } from "@shared/siteCopy";
import { segmentsFromLine } from "../client/src/components/HeroTypewriter";
import { resolveCrawlerContent } from "./_core/crawler-content";
// @ts-expect-error plain .mjs module, typed loosely on purpose
import { findG5 } from "../scripts/check-fund-claims.mjs";

const ROOT = path.resolve(__dirname, "..");
// Built from code points so this file carries no dash characters itself.
const EN_OR_EM_DASH = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("the shared copy", () => {
  it("fits a search result and keeps the house style", () => {
    expect([...SITE_DESCRIPTION].length).toBeLessThanOrEqual(160);
    for (const text of [SITE_TAGLINE, SITE_DESCRIPTION, NEEDS_SECTION.heading, NEEDS_SECTION.body]) {
      expect(text).not.toMatch(EN_OR_EM_DASH);
      expect(findG5("client/src/pages/Home.tsx", `const a = ${JSON.stringify(text)};`)).toEqual([]);
    }
  });

  it("names the seven needs in Rye's order, and the heading lists the same seven", () => {
    expect(LOCAL_NEEDS).toEqual(["Housing", "Food", "Water", "Air", "Joy", "Meaning", "Purpose"]);
    const heading = NEEDS_SECTION.heading.toLowerCase();
    for (const need of LOCAL_NEEDS) expect(heading).toContain(need.toLowerCase());
  });
});

describe("the hero line", () => {
  const emphasis = [
    ["games", "a"],
    ["meet their needs together", "b"],
    ["refugee camps to HOAs", "c"],
  ] as const;

  it("types out the tagline word for word, with the accents on their phrases", () => {
    const segments = segmentsFromLine(SITE_TAGLINE, emphasis);
    expect(segments.map((s) => s.text).join("")).toBe(SITE_TAGLINE);
    expect(segments.filter((s) => s.className).map((s) => s.text)).toEqual([
      "games",
      "meet their needs together",
      "refugee camps to HOAs",
    ]);
  });

  it("skips a phrase the line no longer contains, and never drops text", () => {
    const segments = segmentsFromLine("We make games together.", [
      ["missing phrase", "x"],
      ["games", "y"],
    ]);
    expect(segments.map((s) => s.text).join("")).toBe("We make games together.");
    expect(segments.find((s) => s.className === "y")?.text).toBe("games");
    expect(segments.some((s) => s.className === "x")).toBe(false);
  });
});

describe("static surfaces carry the shared copy", () => {
  const html = read("client/index.html");

  it("index.html: description, Open Graph and Twitter all say SITE_DESCRIPTION", () => {
    for (const re of [
      /<meta name="description" content="([^"]*)"/,
      /<meta property="og:description" content="([^"]*)"/,
      /<meta name="twitter:description" content="([^"]*)"/,
    ]) {
      expect(html.match(re)?.[1]).toBe(SITE_DESCRIPTION);
    }
  });

  it("index.html: the Organization JSON-LD describes the site the same way", () => {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const org = blocks.flatMap((b) => (Array.isArray(b["@graph"]) ? b["@graph"] : [b])).find((n) => n["@type"] === "Organization");
    expect(org?.description).toBe(SITE_DESCRIPTION);
  });

  it("the llms files open with the tagline", () => {
    expect(read("client/public/llms.txt")).toContain(SITE_TAGLINE);
    expect(read("client/public/llms-full.txt")).toContain(SITE_TAGLINE);
  });
});

describe("crawler text", () => {
  it("the home article opens with the tagline", async () => {
    const content = await resolveCrawlerContent("/");
    expect(content?.bodyHtml).toContain(SITE_TAGLINE);
  });
});
