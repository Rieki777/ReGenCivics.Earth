/**
 * The routes as an HTTP surface: status, headers, body.
 *
 * Worth testing separately from the renderer because the two failures that hurt
 * here are not renderer bugs. One is a route that never mounts, which looks
 * exactly like a 404 from the SPA catch-all. The other is a cache header, and
 * `Cache-Control: public, max-age=31536000, immutable` on this exact path is
 * what stopped schedule changes reaching subscribers for months while the feed
 * body itself was perfectly correct.
 *
 * No DATABASE_URL in the test env, so loadFeedRows takes its catalog fallback,
 * which is also the path a production database outage would take.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { registerCalendarFeedRoutes } from "./routes/calendarFeed";
import { RIVERSIDE_ROOM_URL } from "@shared/sessionLinks";

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  registerCalendarFeedRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const FEED_PATHS = [
  "/calendar/all.ics",
  "/calendar/open-access.ics",
  "/calendar/season2.ics",
  // The URL every existing subscriber is already polling. It has to keep
  // answering for as long as anyone holds it, which is forever.
  "/regen-civics-all-events.ics",
];

describe("Feed routes", () => {
  it("serves every feed as text/calendar", async () => {
    for (const path of FEED_PATHS) {
      const res = await fetch(base + path);
      expect(res.status, path).toBe(200);
      expect(res.headers.get("content-type"), path).toContain("text/calendar");
      const body = await res.text();
      expect(body.startsWith("BEGIN:VCALENDAR"), path).toBe(true);
      expect(body.trimEnd().endsWith("END:VCALENDAR"), path).toBe(true);
    }
  });

  it("never marks a feed immutable", async () => {
    for (const path of FEED_PATHS) {
      const cc = (await fetch(base + path)).headers.get("cache-control") ?? "";
      // The whole point of the rewrite. `immutable` tells every cache in the
      // path not to revalidate, which makes "subscribe and updates arrive"
      // false no matter how correct the body is.
      expect(cc, path).not.toContain("immutable");
      expect(cc, path).toContain("max-age=900");
      expect(cc, path).toContain("must-revalidate");
    }
  });

  it("gives each feed a different set of sessions", async () => {
    const count = async (path: string) =>
      (await (await fetch(base + path)).text()).split("BEGIN:VEVENT").length - 1;

    const all = await count("/calendar/all.ics");
    const open = await count("/calendar/open-access.ics");
    const season2 = await count("/calendar/season2.ics");

    expect(season2).toBe(13);
    expect(all).toBeGreaterThan(season2);
    expect(open).toBeLessThan(all);
    // Selection Day is the one Season 2 week on the open feed.
    expect(open).toBe(all - season2 + 1);
  });

  it("answers the legacy path with the same calendar as /calendar/all.ics", async () => {
    const legacy = await (await fetch(base + "/regen-civics-all-events.ics")).text();
    const current = await (await fetch(base + "/calendar/all.ics")).text();
    expect(legacy).toBe(current);
  });

  it("serves one session, and 404s a bad id", async () => {
    // No database in this env, so rows carry no ids and every lookup misses.
    // The shape of the failure is what matters: a clean 404, not a 500.
    expect((await fetch(base + "/calendar/event/999999.ics")).status).toBe(404);
    expect((await fetch(base + "/calendar/event/not-a-number.ics")).status).toBe(404);
    expect((await fetch(base + "/calendar/event/-1")).status).toBe(404);
  });

  it("keeps the feeds out of search indexes", async () => {
    const res = await fetch(base + "/calendar/all.ics");
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("sets an ETag that changes with the content", async () => {
    const a = (await fetch(base + "/calendar/all.ics")).headers.get("etag");
    const b = (await fetch(base + "/calendar/season2.ics")).headers.get("etag");
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe("/join", () => {
  it("redirects to the live room", async () => {
    const res = await fetch(base + "/join", { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(RIVERSIDE_ROOM_URL);
  });

  it("is the indirection the invites rely on", async () => {
    // If this route stops existing, every calendar invite already distributed
    // points at a dead link. It is not decoration.
    const feed = await (await fetch(base + "/calendar/all.ics")).text();
    const unfolded = feed.split("\r\n ").join("");
    expect(unfolded).toContain("https://regencivics.earth/join");
    expect(unfolded).not.toContain("t=243a36b4d9fdbc785c4b");
  });
});
