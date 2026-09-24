/**
 * The server-side redirect middleware, over real HTTP.
 *
 * These routes redirected only in the browser until 2026-09-24, so anything
 * that does not run JavaScript got an empty shell instead of a destination.
 * The behaviour that matters is the status line and the Location header, so
 * that is what this asserts, on a real request rather than on the map.
 *
 * The middleware is re-declared here rather than imported, because the real
 * one is mounted inside server/_core/index.ts alongside the whole app: route
 * registration, the database and the boot sequence. Importing that to test
 * four lines of routing would make this suite depend on a database it does not
 * need. The redirect logic itself lives in shared/redirects.ts and IS imported,
 * so the part that could be wrong is the part under test; what is duplicated
 * is three lines of Express plumbing. redirect-parity.test.ts guards the map,
 * and the shape below is kept identical to the mount in index.ts.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { redirectFor } from "@shared/redirects";

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const to = redirectFor(req.path);
    if (!to) return next();
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const [target, fragment] = to.split("#");
    res.redirect(301, `${target}${qs}${fragment ? `#${fragment}` : ""}`);
  });
  app.use((_req, res) => res.status(200).send("fell through"));
  await new Promise<void>((done) => {
    server = app.listen(0, "127.0.0.1", () => done());
  });
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
});

afterAll(async () => {
  if (server) await new Promise<void>((done) => server.close(() => done()));
});

const head = (path: string) =>
  fetch(`${base}${path}`, { redirect: "manual", method: "GET" });

describe("server-side route redirects", () => {
  it("answers 301 with a Location, not an empty 200", async () => {
    const res = await head("/economy");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/bionomics");
  });

  it("keeps the query string, so an attribution token survives the hop", async () => {
    // Load-bearing once the agent surface mints ref tokens: every url a tool
    // returns carries one, and a redirect that drops it makes the call
    // unattributable.
    const res = await head("/investor-form?ref=abc123&utm_source=x");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/investor?ref=abc123&utm_source=x");
  });

  it("keeps a fragment after the query, not before it", async () => {
    const res = await head("/local-food-economy?ref=z");
    expect(res.headers.get("location")).toBe(
      "/bionomics?ref=z#local-food-economies",
    );
  });

  it("redirects off-site destinations too", async () => {
    const res = await head("/church");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://core.regencivics.earth");
  });

  it("tolerates a trailing slash", async () => {
    // A crawler that found /economy/ in someone else's markup should still be
    // sent somewhere rather than landing on the shell.
    expect((await head("/economy/")).headers.get("location")).toBe("/bionomics");
  });

  it("leaves a route that is not a redirect alone", async () => {
    // The known negative. Without it these assertions would also pass against
    // a middleware that redirected everything.
    const res = await head("/community");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("fell through");
  });

  it("leaves the root alone", async () => {
    // `/` is the one path where a stray trailing-slash rule could match
    // everything, and it is the page the previous commit just un-blanked.
    const res = await head("/");
    expect(res.status).toBe(200);
  });

  it("does not turn a POST into a redirect", async () => {
    // A 301 on a POST is rewritten to GET by most clients, which would
    // silently drop a form body.
    const res = await fetch(`${base}/economy`, {
      method: "POST",
      redirect: "manual",
    });
    expect(res.status).toBe(200);
  });
});
