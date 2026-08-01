/**
 * server/routes/shipCalendarFeed.ts
 *
 * The outbound availability feed the rental channels subscribe to.
 *
 *   GET /api/ship/calendar/:token/regen-ship.ics
 *
 * Phase 1 of the Outdoorsy sync (CLAUDE_CODE_PROMPT_2026-08-01_OUTDOORSY_SYNC.md).
 * Our calendar is the source of truth; this is how the channels find out.
 *
 * Why a raw Express route rather than tRPC: Outdoorsy fetches this with a plain
 * unauthenticated GET and expects text/calendar. tRPC's envelope would be
 * meaningless to it.
 *
 * Auth is a shared secret in the path (SHIP_ICAL_TOKEN), compared in constant
 * time. A wrong token gets a 404, not a 401: there is no reason to confirm to a
 * scanner that the route exists. The feed carries no guest data of any kind —
 * no names, no emails, no notes, no counts — only the dates the ship is spoken
 * for, because anyone holding the URL can read it.
 *
 * The week grid comes from the same `enumerateVoyageWeeks` call that powers
 * /ship/book, so the feed cannot drift from the booking page. See
 * server/lib/ship-ical.ts for why that matters.
 */

import type { Express, Request, Response } from "express";
import crypto from "node:crypto";
import { asc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "../db";
import { shipBookings, shipBlackoutDates, shipPricingWindows } from "../../drizzle/schema";
import { enumerateVoyageWeeks } from "../lib/ship-logic";
import {
  SHIP_SEASON_START_YMD,
  SHIP_YEAR2_START_YMD,
  YEAR2_PRICE_MULTIPLIER,
  SHIP_BOOKING_HORIZON_WEEKS,
  SHIP_SEASONAL_BANDS,
} from "../lib/ship-config";
import { buildBlocksFromWeeks, buildShipCalendar } from "../lib/ship-ical";
import { OUTDOORSY_SOURCE } from "../jobs/outdoorsySync";
import { logger } from "../_core/logger";

const log = logger("ship-ical");

/** Statuses that hold the calendar. Mirrors BLOCKING_STATUSES in routes/ship.ts. */
const BLOCKING_STATUSES = ["approved", "platform_pending", "confirmed", "active"] as const;

/**
 * How long an unapproved request keeps its soft hold in the feed.
 *
 * A `requested` booking does not block our own calendar, but it does go out as
 * a TENTATIVE hold so a channel cannot sell a week someone is mid-covenant on.
 * Holds older than this are ignored, otherwise an abandoned request would sit
 * on a week forever. Phase 2's cron sweeps the rows themselves; this is the
 * belt to that braces.
 */
const HOLD_TTL_HOURS = 72;

function timingSafeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function registerShipCalendarRoutes(app: Express): void {
  app.get("/api/ship/calendar/:token/regen-ship.ics", async (req: Request, res: Response) => {
    const expected = process.env.SHIP_ICAL_TOKEN;
    if (!expected) {
      log.warn("SHIP_ICAL_TOKEN not configured, calendar feed disabled");
      return res.status(404).end();
    }
    const supplied = String(req.params.token ?? "");
    if (!timingSafeEquals(supplied, expected)) return res.status(404).end();

    try {
      const d = await getDb();
      if (!d) return res.status(503).type("text/plain").send("Database unavailable.");

      const today = new Date().toISOString().slice(0, 10);
      const holdCutoff = new Date(Date.now() - HOLD_TTL_HOURS * 3600_000);

      const blocking = await d
        .select({ startDate: shipBookings.startDate, endDate: shipBookings.endDate })
        .from(shipBookings)
        .where(inArray(shipBookings.status, [...BLOCKING_STATUSES]));

      const requestedRows = await d
        .select({
          startDate: shipBookings.startDate,
          endDate: shipBookings.endDate,
          createdAt: shipBookings.createdAt,
        })
        .from(shipBookings)
        .where(eq(shipBookings.status, "requested"));

      // Live holds only. An abandoned request stops holding a week after the TTL.
      const requested = requestedRows
        .filter((r) => !r.createdAt || r.createdAt >= holdCutoff)
        .map((r) => ({ startDate: r.startDate, endDate: r.endDate }));

      // Outdoorsy-sourced blackouts are excluded, and this is not optional. The
      // inbound sync writes a blackout for every Outdoorsy booking; echoing
      // those back would hand the channel its own bookings as blocks, and worse,
      // a cancellation there could never reopen the week because our feed would
      // keep asserting it. Blocks from any OTHER source still go out: a week
      // held by hand, or by a future channel, is a week Outdoorsy must not sell.
      const blackouts = await d
        .select()
        .from(shipBlackoutDates)
        .where(ne(shipBlackoutDates.source, OUTDOORSY_SOURCE));
      const pricing = await d
        .select()
        .from(shipPricingWindows)
        .orderBy(asc(shipPricingWindows.startDate));

      const weeks = enumerateVoyageWeeks({
        seasonStart: SHIP_SEASON_START_YMD,
        year2Start: SHIP_YEAR2_START_YMD,
        year2Multiplier: YEAR2_PRICE_MULTIPLIER,
        horizonWeeks: SHIP_BOOKING_HORIZON_WEEKS,
        today,
        booked: blocking.map((b) => ({ startDate: b.startDate, endDate: b.endDate })),
        requested,
        blackouts: blackouts.map((b) => ({
          startDate: b.startDate,
          endDate: b.endDate,
          reason: b.reason,
        })),
        pricingWindows: pricing.map((p) => ({
          startDate: p.startDate,
          endDate: p.endDate,
          multiplier: p.multiplier,
          label: p.label,
        })),
        bands: SHIP_SEASONAL_BANDS,
      });

      const blocks = buildBlocksFromWeeks({ weeks, today });
      const ics = buildShipCalendar({ blocks, now: new Date() });

      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", 'inline; filename="regen-ship.ics"');
      // Five minutes. Outdoorsy polls every two hours, so this only bounds how
      // stale an intermediary can be, and keeps a hot-reload loop cheap.
      res.setHeader("Cache-Control", "public, max-age=300");
      // Never let this end up in a search index or a shared referrer.
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.setHeader("Referrer-Policy", "no-referrer");
      return res.status(200).send(ics);
    } catch (err) {
      log.error("ship calendar feed failed", err);
      // Do NOT fall back to an empty calendar: a channel reading an empty feed
      // would treat every date as open. Fail loudly instead.
      return res.status(500).type("text/plain").send("Calendar unavailable.");
    }
  });
}
