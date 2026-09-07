/**
 * server/routes/calendarFeed.ts
 *
 * The subscribe endpoints behind every "add to calendar" button on the site.
 *
 *   GET /calendar/all.ics           every session
 *   GET /calendar/open-access.ics   the monthly open sessions + Selection Day
 *   GET /calendar/season2.ics       the thirteen Season 2 weeks
 *   GET /calendar/event/:id.ics     one session
 *   GET /regen-civics-all-events.ics  legacy alias, see below
 *   GET /join                       durable redirect into the live room
 *
 * Raw Express rather than tRPC: calendar clients issue a plain unauthenticated
 * GET and expect `text/calendar`. tRPC's JSON envelope would be meaningless.
 *
 * These MUST be registered before serveStatic(). express.static serves
 * client/public with `maxAge: 1y, immutable`, and until 2026-09-07 that is
 * exactly what happened to the old static feed: every CDN and client cached it
 * for a year with instructions never to revalidate, so a schedule change could
 * not reach a subscriber even after a redeploy.
 */

import type { Express, Request, Response } from "express";
import crypto from "node:crypto";
import { logger } from "../_core/logger";
import {
  loadFeedRows,
  renderFeed,
  renderSingleEvent,
  type FeedKind,
  type FeedRow,
} from "../lib/calendarFeed";
import { RIVERSIDE_ROOM_URL } from "@shared/sessionLinks";

const log = logger("calendar-feed");

/**
 * Fifteen minutes.
 *
 * Long enough that a crawler or a hot-reload loop is cheap, short enough that
 * an edit in Admin > Events is visible to the next poll. Google re-reads a
 * subscribed ICS on its own schedule (hours, not minutes) and ignores our
 * headers; this bounds how stale an intermediary is allowed to be, which is the
 * part we control. `immutable` is deliberately absent.
 */
const FEED_CACHE_CONTROL = "public, max-age=900, s-maxage=900, must-revalidate";

function sendCalendar(res: Response, body: string, filename: string): void {
  const etag = `W/"${crypto.createHash("sha1").update(body).digest("hex").slice(0, 24)}"`;
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.setHeader("Cache-Control", FEED_CACHE_CONTROL);
  res.setHeader("ETag", etag);
  // The feed is public but it is not a page. Keep it out of the index.
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.status(200).send(body);
}

async function serveFeed(kind: FeedKind, filename: string, res: Response): Promise<void> {
  const rows = await loadFeedRows();
  sendCalendar(res, renderFeed(rows, kind), filename);
}

/** Accepts `/calendar/event/12` and `/calendar/event/12.ics`. */
function parseEventId(raw: string): number | null {
  const id = Number(raw.replace(/\.ics$/i, ""));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function registerCalendarFeedRoutes(app: Express): void {
  const feeds: Array<{ path: string; kind: FeedKind; filename: string }> = [
    { path: "/calendar/all.ics", kind: "all", filename: "regen-civics-all-sessions.ics" },
    {
      path: "/calendar/open-access.ics",
      kind: "open-access",
      filename: "regen-civics-open-sessions.ics",
    },
    { path: "/calendar/season2.ics", kind: "season2", filename: "regen-civics-season-2.ics" },
    // The URL every existing subscriber is already polling. It has to keep
    // answering for as long as anyone holds it, which is forever.
    {
      path: "/regen-civics-all-events.ics",
      kind: "all",
      filename: "regen-civics-all-sessions.ics",
    },
  ];

  for (const feed of feeds) {
    app.get(feed.path, async (_req: Request, res: Response) => {
      try {
        await serveFeed(feed.kind, feed.filename, res);
      } catch (err) {
        log.error(`calendar feed failed: ${feed.path}`, err);
        res.status(503).type("text/plain").send("Calendar temporarily unavailable.");
      }
    });
  }

  app.get("/calendar/event/:id", async (req: Request, res: Response) => {
    const id = parseEventId(String(req.params.id ?? ""));
    if (id == null) {
      res.status(404).type("text/plain").send("Not found.");
      return;
    }
    try {
      const rows = await loadFeedRows();
      const row: FeedRow | undefined = rows.find((r) => r.id === id);
      if (!row) {
        res.status(404).type("text/plain").send("Not found.");
        return;
      }
      sendCalendar(res, renderSingleEvent(row), `regen-civics-event-${id}.ics`);
    } catch (err) {
      log.error("single event feed failed", err);
      res.status(503).type("text/plain").send("Calendar temporarily unavailable.");
    }
  });

  /**
   * The join link that goes into every calendar invite and every reminder
   * email. Invites live on people's phones for months, so they must never
   * carry the Riverside studio URL directly: that URL carries a token, and if
   * the token ever rotates, a hardcoded invite is dead with no way to fix it.
   * One redirect, changed in one place.
   */
  app.get("/join", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.redirect(302, RIVERSIDE_ROOM_URL);
  });
}
