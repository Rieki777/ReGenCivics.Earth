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

describe.skipIf(!built)("crawler content over HTTP", () => {
  it("serves the homepage prose to a client that runs no JavaScript", async () => {
    const html = await (await fetch(`${base}/`)).text();
    // The specific sentence, not just "some text": a generic length assertion
    // would pass on the nav bar alone once someone server-renders a header.
    expect(html).toContain("ReGen Civics is a fund in formation");
    expect(html).toContain('id="__crawler_content__"');
    expect(html).toContain("<noscript>");
    expect(agentVisibleText(html).length).toBeGreaterThan(1000);
  });

  it("still serves the routes that already worked", async () => {
    // /opportunity read FULL in the same baseline that found / blank, so it is
    // the control: if this breaks, the catch-all itself regressed rather than
    // the homepage specifically.
    const html = await (await fetch(`${base}/opportunity`)).text();
    expect(html).toContain("The investment opportunity");
    expect(agentVisibleText(html).length).toBeGreaterThan(1000);
  });

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
