/**
 * What the server actually SERVES to a non-executing agent, over HTTP.
 *
 * crawler-learn.test.ts checks that `resolveCrawlerContent` returns the right
 * content. This checks that a request actually receives it, which is a
 * different failure surface and the one that bit us.
 *
 * The bug this exists to prevent: `PAGE_CONTENT["/"]` was written, correct, and
 * covered by content-level tests, while a dedicated `app.get("/")` handler
 * mounted ahead of the catch-all served the bare shell and never called
 * resolveCrawlerContent. Every content test passed. The homepage answered
 * 16.6 KB of HTML with zero characters of body text, measured on production by
 * the phase -2 agent baseline on 2026-09-23.
 *
 * A test that asserts the content resolves would have passed throughout. Only
 * a test that makes a real request can fail on it, so this one does.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { serveStatic } from "./_core/vite";
import { COOP } from "../shared/fund";
import { escapeHtml } from "./_core/crawler-content";
import { SEASON_ONE } from "../shared/regenYear";
// @ts-expect-error plain .mjs module, typed loosely on purpose
import { findRetired, findG5, findTraction } from "../scripts/check-fund-claims.mjs";

// serveStatic resolves the build directory from NODE_ENV: "development" looks
// for <repo>/dist/public, anything else for <__dirname>/public, which only
// exists inside a deployed bundle. Under vitest NODE_ENV is "test", so the
// production branch would point at a directory that is never there. The test
// sets "development" purely to aim the lookup at the real build output.
const distPublic = resolve(__dirname, "..", "dist", "public");
const built = existsSync(resolve(distPublic, "index.html"));

let server: Server;
let base: string;

beforeAll(async () => {
  if (!built) return;
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  const app = express();
  // The catch-all reads res.locals.nonce the way the real CSP middleware sets
  // it. Without this the nonce substitution runs with an empty string, which
  // is fine for these assertions and is what an unnonced deploy would do.
  app.use((_req, res, next) => {
    res.locals.nonce = "test-nonce";
    next();
  });
  serveStatic(app);
  process.env.NODE_ENV = prev;
  await new Promise<void>((done) => {
    server = app.listen(0, "127.0.0.1", () => done());
  });
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
});

afterAll(async () => {
  if (server) await new Promise<void>((done) => server.close(() => done()));
});

/** Everything in <body> that is not script or style: what a no-JS agent reads. */
function agentVisibleText(html: string): string {
  const body = html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  return (body ? body[1] : html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Only the injected crawler block: the prose crawler-content.ts writes from
 * source. The rest of the response is the built shell, which can lag the
 * source until the next build, so the claims checks below read this part.
 */
function crawlerBlock(html: string): string {
  const m = html.match(/<div id="__crawler_content__"[^>]*>([\s\S]*?)<\/div>/);
  return m ? m[1] : "";
}

/**
 * The Season One (2022) record from shared/regenYear.ts may appear (Phase 0
 * spec). It renders as "43 land projects applied", which the traction rule
 * would otherwise flag; every other count stays banned.
 */
const SEASON_ONE_RECORD = new Set(
  [SEASON_ONE.applied, SEASON_ONE.presented, SEASON_ONE.selected].map((n) => `${n} land projects`),
);

/**
 * The gate's own checks (scripts/check-fund-claims.mjs) over what a crawler
 * actually receives. Search engines and AI assistants read this block and
 * repeat it; until 2026-09-27 it told them the fund targeted a return. The
 * source scan cannot see numbers that arrive through interpolation, so the
 * traction rule runs on the rendered HTML here.
 */
function expectNoFundClaims(route: string, block: string) {
  expect(block.length, `${route}: empty crawler block`).toBeGreaterThan(200);
  expect(findRetired(`${route}.html`, block), route).toEqual([]);
  expect(findG5(`${route}.html`, block), route).toEqual([]);
  const traction = findTraction(`${route}.html`, block).filter(
    (v: { match: string }) => !SEASON_ONE_RECORD.has(v.match),
  );
  expect(traction, route).toEqual([]);
}

describe.skipIf(!built)("crawler content over HTTP", () => {
  it("serves the homepage prose to a client that runs no JavaScript", async () => {
    const html = await (await fetch(`${base}/`)).text();
    // The specific sentences, not just "some text": a generic length assertion
    // would pass on the nav bar alone once someone server-renders a header.
    expect(html).toContain("ReGen Civics builds the tools and runs the in-real-life game");
    expect(html).toContain(COOP.statement);
    expect(html).toContain(COOP.notAnOffer);
    expect(html).toContain('id="__crawler_content__"');
    expect(html).toContain("<noscript>");
    expect(agentVisibleText(html).length).toBeGreaterThan(1000);
    expectNoFundClaims("/", crawlerBlock(html));
  });

  it("still serves the routes that already worked", async () => {
    // /opportunity read FULL in the same baseline that found / blank, so it is
    // the control: if this breaks, the catch-all itself regressed rather than
    // the homepage specifically.
    const html = await (await fetch(`${base}/opportunity`)).text();
    expect(html).toContain(`Help design the ${COOP.name}`);
    expect(html).toContain(COOP.statement);
    expect(html).toContain(COOP.designPrinciplesNote);
    expect(agentVisibleText(html).length).toBeGreaterThan(1000);
    expectNoFundClaims("/opportunity", crawlerBlock(html));
  });

  it("serves the cooperative, in COOP's words, at /fund and /loi", async () => {
    for (const route of ["/fund", "/loi"]) {
      const html = await (await fetch(`${base}${route}`)).text();
      expect(html, route).toContain(COOP.statement);
      expect(html, route).toContain(COOP.notAnOffer);
      expectNoFundClaims(route, crawlerBlock(html));
    }
  });

  it("keeps fund, return and traction language out of the token, governance, glossary and land prose", async () => {
    // Every word of these blocks is written in crawler-content.ts itself, so a
    // failure here is always a sentence someone wrote there.
    for (const route of ["/land", "/tokenomics", "/governance", "/glossary", "/game", "/assembly"]) {
      const html = await (await fetch(`${base}${route}`)).text();
      expectNoFundClaims(route, crawlerBlock(html));
    }
  });

  it("serves /schedule, which was blank to agents until 2026-09-24", async () => {
    // With no DATABASE_URL this renders the empty-sessions copy, which is the
    // right assertion for the serving path: the question here is whether the
    // route reaches getScheduleContent at all. crawler-schedule.test.ts mocks
    // the rows and checks the dates themselves.
    const html = await (await fetch(`${base}/schedule`)).text();
    expect(html).toContain("Upcoming ReGen Civics sessions");
    expect(html).toContain('id="__crawler_content__"');
    expect(html).toContain('"@type":"ItemList"');
  });

  // Routes the phase -2 baseline measured as blank, now carrying prose taken
  // from the live page. One assertion each, on a distinctive sentence rather
  // than a length, so a page that regresses to the shell fails here even if
  // something else server-renders a header into the body.
  it.each([
    ["/season2", "thirteen regenerative land projects"],
    ["/crowd-pooling", "Crowd pooling on this page is a character sheet"],
    ["/game-mechanics", "visible and tunable"],
    ["/connect", "which path calls to you"],
    ["/play", "five minutes or five years"],
    ["/ally", "weaving a support network"],
    ["/ship/book", "Fleetwood Revolution"],
    ["/ship/terms", "Voyage Covenant"],
    ["/ship/guide", "Mindful, Careful, Slow"],
    ["/custom-games", "fail on coordination long before"],
    ["/calculator", "nine forms of capital"],
    ["/marketplace", "Connection Hub"],
  ])("serves prose on %s", async (path, phrase) => {
    const html = await (await fetch(`${base}${path}`)).text();
    expect(html.toLowerCase()).toContain(phrase.toLowerCase());
    expect(html).toContain('id="__crawler_content__"');
    expect(agentVisibleText(html).length).toBeGreaterThan(1000);
  });

  it("keeps /loi's disclaimers intact, because an agent will relay them", async () => {
    // This page is the C funnel's conversion point and the most compliance
    // sensitive thing the crawler serves. The spec's hard rule is that
    // explore_investment_thesis never quotes terms and never implies an offer.
    // An agent that reads a summary with the disclaimers trimmed off would
    // describe a cooperative taking money, which is the opposite of true.
    //
    // Asserted against COOP rather than against literals on purpose. This
    // route was written by two lanes on the same day; the version that landed
    // builds every sentence from shared/fund.ts so the disclaimers cannot
    // drift between the page and the crawler, and a test carrying its own copy
    // of the sentences would reintroduce exactly that drift.
    const html = await (await fetch(`${base}/loi`)).text();
    for (const claim of [COOP.statement, COOP.interestPromise, COOP.notAnOffer]) {
      expect(html, `/loi is missing a COOP disclaimer: ${claim.slice(0, 60)}`).toContain(
        escapeHtml(claim),
      );
    }
  });

  it.each(["/campaigns", "/bounties"])(
    "serves the %s listing, even with nothing to list",
    async (path) => {
      // With no DATABASE_URL these render their empty-state copy. That is the
      // right assertion here: this test asks whether the route reaches its
      // builder at all. crawler-lists.test.ts mocks the rows and checks what
      // a populated listing says.
      const html = await (await fetch(`${base}${path}`)).text();
      expect(html).toContain('id="__crawler_content__"');
      expect(html).toContain('"@type":"ItemList"');
    },
  );

  it("leaves a route with no authored content empty, so the check can fail", async () => {
    // The known negative. Without one, every assertion above would also pass
    // against a server that injected the same blob into every response.
    const html = await (await fetch(`${base}/notifications`)).text();
    expect(html).not.toContain('id="__crawler_content__"');
    expect(agentVisibleText(html).length).toBeLessThan(200);
  });

  it("keeps the nonce substitution the dedicated handler used to do", async () => {
    // The removed `/` handler existed for this. Losing it while gaining the
    // crawler body would trade one production break for another.
    const html = await (await fetch(`${base}/`)).text();
    expect(html).not.toContain("{{NONCE}}");
  });

  it("sets no-store on the homepage, so a 304 cannot pair a stale nonce with a fresh CSP header", async () => {
    const res = await fetch(`${base}/`);
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
});
