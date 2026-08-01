/**
 * server/jobs/outdoorsySync.ts
 *
 * Phase 2 of the Outdoorsy sync: pull the channel's calendar back in, so a week
 * sold on Outdoorsy stops being sellable on regencivics.earth.
 *
 * Spec: CLAUDE_CODE_PROMPT_2026-08-01_OUTDOORSY_SYNC.md section 6, with two
 * corrections forced by what the live feed actually turned out to contain.
 * Both were verified against rental 543254 on 2026-08-01, not assumed.
 *
 * ── Correction 1: the feed exports manual blocks, not just bookings ──────────
 *
 * The spec says "the export carries only real Outdoorsy bookings", and builds
 * its whole safety case on that ("there is no echo loop... the single biggest
 * thing that makes two-way iCal safe here"). It is not true. Every hand-set
 * Unavailable range comes back out of the export as a VEVENT reading
 * `SUMMARY:Unavailable - <vehicle>` / `DESCRIPTION:Status: unavailable`. So the
 * calendar we mirror INTO Outdoorsy is a calendar Outdoorsy mirrors back at us.
 *
 * ── Correction 2: the UIDs are ephemeral ────────────────────────────────────
 *
 * Two fetches 43 seconds apart shared not one UID, and every event carried a
 * CREATED stamp equal to the fetch time. The ids are minted per response. So
 * "upsert by externalUid, delete rows whose UID vanished" would delete and
 * recreate the entire table on every run, forever, and any UID written into
 * ship_bookings.platformBookingRef would be meaningless the instant it landed.
 *
 * ── What this job does instead ──────────────────────────────────────────────
 *
 * Identity comes from the only stable thing the feed offers: the date range.
 * The key is `outdoorsy:<start>:<end>`, so an unchanged calendar produces an
 * unchanged key set and a re-run is a genuine no-op.
 *
 * And rather than trying to tell an echo of our own block apart from a real
 * booking (the feed gives no way to; both render identically), the job asks a
 * better question: is this range ALREADY unavailable on our side? If it is,
 * whatever Outdoorsy is showing there is our own state coming home, and it is
 * ignored. Only a range that is open on our side but closed on theirs is real
 * new information, and that is the only case that writes a blackout.
 *
 * That rule also subsumes the spec's platform_pending linking step. A guest who
 * requests a week here and then pays on Outdoorsy has a booking holding the
 * week already, so the inbound echo is ignored rather than double-counting it.
 * No UID gets written to platformBookingRef, because the feed has no stable id
 * worth putting there. See section 6d of the spec for the original design.
 */

import { and, eq, inArray, lt } from "drizzle-orm";
import { getDb } from "../db";
import { shipBookings, shipBlackoutDates, shipPricingWindows } from "../../drizzle/schema";
import { parseIcalEvents, type IcalEvent } from "../lib/ical-parse";
import { snapRangeToVoyageWeeks } from "../../shared/shipVoyageGrid";
import { enumerateVoyageWeeks } from "../lib/ship-logic";
import {
  SHIP_SEASON_START_YMD,
  SHIP_YEAR2_START_YMD,
  YEAR2_PRICE_MULTIPLIER,
  SHIP_BOOKING_HORIZON_WEEKS,
  SHIP_SEASONAL_BANDS,
} from "../lib/ship-config";
import { assertSafeExternalUrl } from "../_core/ssrf";
import { notifyShipCalendarConflict } from "../_core/notify";
import { logger } from "../_core/logger";

const log = logger("outdoorsy-sync");

/** Tag written to ship_blackout_dates.source for every row this job owns. */
export const OUTDOORSY_SOURCE = "outdoorsy";

/** How long the fetch may take before we give up and leave the calendar as-is. */
const FETCH_TIMEOUT_MS = 10_000;

/** Refuse a feed larger than this. A booking feed is kilobytes, not megabytes. */
const MAX_FEED_BYTES = 2_000_000;

/**
 * How long an unapproved request keeps its hold before the sweep cancels it.
 * Matches HOLD_TTL_HOURS in server/routes/shipCalendarFeed.ts, which stops
 * showing it as TENTATIVE at the same age.
 */
const HOLD_TTL_HOURS = 72;

/** Statuses that hold the calendar. Mirrors BLOCKING_STATUSES in routes/ship.ts. */
const BLOCKING_STATUSES = ["approved", "platform_pending", "confirmed", "active"] as const;

export type OutdoorsySyncReport = {
  /** VEVENTs parsed out of the feed. */
  fetched: number;
  /** Ranges ignored because our own calendar already closed them. */
  echoed: number;
  created: number;
  updated: number;
  deleted: number;
  conflicts: number;
  sweptHolds: number;
  /** Non-fatal reasons a pass did not run. Non-empty means something was skipped. */
  skipped: string[];
};

const emptyReport = (): OutdoorsySyncReport => ({
  fetched: 0, echoed: 0, created: 0, updated: 0,
  deleted: 0, conflicts: 0, sweptHolds: 0, skipped: [],
});

/**
 * The stable identity of an inbound range.
 *
 * Deliberately derived from the dates rather than the feed's own UID: see the
 * header. Readable on purpose, so a row in the admin panel can be matched
 * against the Outdoorsy calendar by eye.
 */
export function rangeKey(startDate: string, endDate: string): string {
  return `outdoorsy:${startDate}:${endDate}`;
}

/** A short, non-identifying label for the admin panel. Carries no guest data. */
function reasonFor(startDate: string, endDate: string): string {
  return `Outdoorsy hold ${startDate} to ${endDate}`;
}

async function fetchFeed(url: string): Promise<string> {
  // SSRF guard: the URL comes from env, but env is one leaked deploy variable
  // away from pointing at the metadata service or an internal address.
  await assertSafeExternalUrl(url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "error",
      headers: { Accept: "text/calendar, text/plain;q=0.9, */*;q=0.1" },
    });
    if (!res.ok) throw new Error(`feed returned HTTP ${res.status}`);
    const text = await res.text();
    if (text.length > MAX_FEED_BYTES) {
      throw new Error(`feed too large (${text.length} bytes)`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

type DbInstance = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/**
 * Every day our own calendar already treats as unavailable.
 *
 * Built from `enumerateVoyageWeeks`, the same call that renders /ship/book and
 * the outbound feed, so this job cannot form a different opinion about
 * availability than the rest of the app. Migration passages are included even
 * though no blackout row exists for them, which matters: without that, a
 * repositioning week would read as "open here, closed there" and the job would
 * write a blackout mirroring a block we already imposed.
 *
 * Outdoorsy-sourced blackouts are excluded from the input, or a range this job
 * wrote last run would look like our own state this run and never be cleaned up.
 */
async function loadClosedDays(db: DbInstance, today: string): Promise<Set<string>> {
  const [blocking, requestedRows, blackouts, pricing] = await Promise.all([
    db
      .select({ startDate: shipBookings.startDate, endDate: shipBookings.endDate })
      .from(shipBookings)
      .where(inArray(shipBookings.status, [...BLOCKING_STATUSES])),
    db
      .select({ startDate: shipBookings.startDate, endDate: shipBookings.endDate })
      .from(shipBookings)
      .where(eq(shipBookings.status, "requested")),
    db
      .select({
        startDate: shipBlackoutDates.startDate,
        endDate: shipBlackoutDates.endDate,
        reason: shipBlackoutDates.reason,
        source: shipBlackoutDates.source,
      })
      .from(shipBlackoutDates),
    db.select().from(shipPricingWindows),
  ]);

  const weeks = enumerateVoyageWeeks({
    seasonStart: SHIP_SEASON_START_YMD,
    year2Start: SHIP_YEAR2_START_YMD,
    year2Multiplier: YEAR2_PRICE_MULTIPLIER,
    horizonWeeks: SHIP_BOOKING_HORIZON_WEEKS,
    today,
    booked: blocking,
    requested: requestedRows,
    blackouts: blackouts
      .filter((b) => b.source !== OUTDOORSY_SOURCE)
      .map((b) => ({ startDate: b.startDate, endDate: b.endDate, reason: b.reason })),
    pricingWindows: pricing.map((p) => ({
      startDate: p.startDate,
      endDate: p.endDate,
      multiplier: p.multiplier,
      label: p.label,
    })),
    bands: SHIP_SEASONAL_BANDS,
  });

  const closed = new Set<string>();
  for (const w of weeks) {
    // A "requested" week is a soft hold, not a closure: someone may never
    // complete the Covenant, and a real Outdoorsy booking on that week is
    // information we need rather than an echo to swallow.
    if (w.state === "open" || w.state === "requested") continue;
    for (let d = new Date(`${w.startDate}T00:00:00Z`); ; d.setUTCDate(d.getUTCDate() + 1)) {
      const ymd = d.toISOString().slice(0, 10);
      if (ymd >= w.endDate) break;
      closed.add(ymd);
    }
  }
  return closed;
}

/** True when every day of [start, end) is already unavailable on our side. */
function fullyClosed(closed: Set<string>, startDate: string, endDate: string): boolean {
  for (let d = new Date(`${startDate}T00:00:00Z`); ; d.setUTCDate(d.getUTCDate() + 1)) {
    const ymd = d.toISOString().slice(0, 10);
    if (ymd >= endDate) return true;
    if (!closed.has(ymd)) return false;
  }
}

/**
 * Pull the channel feed and reconcile it into ship_blackout_dates.
 *
 * Idempotent: rows are keyed on the snapped date range, so a second pass over
 * an unchanged calendar reports created/updated/deleted all zero.
 */
export async function runOutdoorsySync(): Promise<OutdoorsySyncReport> {
  const report = emptyReport();

  // Off unless switched on, and it must stay that way until the Outdoorsy
  // calendar carries only genuine unavailability.
  //
  // On 2026-08-01 the feed included the range Rye had blocked for YEAR-TWO
  // PRICING reasons (2027-04-05 onward: one flat nightly rate cannot straddle
  // the $300 to $600 boundary). Outdoorsy exports a pricing block and a real
  // booking as byte-identical "Status: unavailable" events, so this job cannot
  // tell them apart, and importing that one range closed about fifteen weeks on
  // regencivics.earth that were genuinely bookable direct. Verified by running
  // it: `fetched=10 echoed=9 created=1`, and that one create was the bad one.
  //
  // The echo rule below catches every block that mirrors a week we already
  // hold. It cannot catch a block over a week we still have for sale, because
  // from the feed alone that is indistinguishable from a real booking.
  if (process.env.OUTDOORSY_SYNC_ENABLED !== "true") {
    log.warn("OUTDOORSY_SYNC_ENABLED is not 'true', inbound sync disabled");
    report.skipped.push("OUTDOORSY_SYNC_ENABLED not set to 'true'");
    return report;
  }

  const url = process.env.OUTDOORSY_ICAL_URL;
  if (!url) {
    log.warn("OUTDOORSY_ICAL_URL not set, inbound sync disabled");
    report.skipped.push("OUTDOORSY_ICAL_URL not set");
    return report;
  }

  const db = await getDb();
  if (!db) {
    report.skipped.push("no database");
    return report;
  }

  const text = await fetchFeed(url);
  const events = parseIcalEvents(text);
  report.fetched = events.length;

  const recurring = events.filter((e) => e.hasRrule);
  if (recurring.length > 0) {
    // The parser does not expand RRULE. A calendar feed should never carry one;
    // if it starts to, occurrences past the first go unblocked, so say so.
    log.error(
      `feed carried ${recurring.length} recurring event(s); occurrences beyond the first are NOT blocked`,
    );
    report.skipped.push(`${recurring.length} recurring event(s) not expanded`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const closed = await loadClosedDays(db, today);

  const existing = await db
    .select({
      id: shipBlackoutDates.id,
      startDate: shipBlackoutDates.startDate,
      endDate: shipBlackoutDates.endDate,
      externalUid: shipBlackoutDates.externalUid,
    })
    .from(shipBlackoutDates)
    .where(eq(shipBlackoutDates.source, OUTDOORSY_SOURCE));

  const existingByKey = new Map(
    existing.filter((r) => r.externalUid).map((r) => [r.externalUid as string, r]),
  );

  // The zero-VEVENT guard. A feed that suddenly reads empty is far more likely
  // to be a bad response than a mass cancellation, and acting on it would open
  // every held week to the public at once.
  const suspiciousEmpty = events.length === 0 && existing.length > 0;
  if (suspiciousEmpty) {
    log.error(
      `feed returned 0 events but ${existing.length} synced blackout(s) exist; SKIPPING the delete pass`,
    );
    report.skipped.push(
      `feed empty while ${existing.length} synced blackout(s) exist: delete pass skipped`,
    );
  }

  const now = new Date();
  const seenKeys = new Set<string>();
  const conflictNotes: string[] = [];

  for (const event of events) {
    const snapped = snapRangeToVoyageWeeks({
      seasonStart: SHIP_SEASON_START_YMD,
      startDate: event.startDate,
      endDate: event.endDate,
    });

    // Our own state coming home. The feed cannot distinguish a block we pushed
    // from a booking they took, so we decide by what we already know: a range
    // we have already closed tells us nothing new.
    if (fullyClosed(closed, snapped.startDate, snapped.endDate)) {
      report.echoed++;
      continue;
    }

    const key = rangeKey(snapped.startDate, snapped.endDate);
    if (seenKeys.has(key)) continue; // two events snapped onto the same weeks
    seenKeys.add(key);

    // Execution only reaches here when the range is NOT fully closed on our
    // side. If it nonetheless touches a week we do hold, Outdoorsy has sold
    // something that straddles a voyage already spoken for. The blackout below
    // closes it either way; a human needs to know, because two guests may both
    // believe that week is theirs.
    if (anyClosed(closed, snapped.startDate, snapped.endDate)) {
      report.conflicts++;
      conflictNotes.push(`${snapped.startDate} to ${snapped.endDate} straddles a week already held here`);
      log.error(
        `CONFLICT: Outdoorsy range ${snapped.startDate}..${snapped.endDate} partially overlaps our own held weeks`,
      );
    }

    const prior = existingByKey.get(key);
    if (!prior) {
      await db.insert(shipBlackoutDates).values({
        startDate: snapped.startDate,
        endDate: snapped.endDate,
        reason: reasonFor(snapped.startDate, snapped.endDate),
        source: OUTDOORSY_SOURCE,
        externalUid: key,
        externalUpdatedAt: now,
        syncedAt: now,
      });
      report.created++;
      log.info(`blocked ${snapped.startDate}..${snapped.endDate} from Outdoorsy`);
    } else if (prior.startDate !== snapped.startDate || prior.endDate !== snapped.endDate) {
      // Cannot normally happen, since the key IS the range. Kept so a manual
      // edit to the row heals on the next run rather than drifting forever.
      await db
        .update(shipBlackoutDates)
        .set({
          startDate: snapped.startDate,
          endDate: snapped.endDate,
          reason: reasonFor(snapped.startDate, snapped.endDate),
          externalUpdatedAt: now,
          syncedAt: now,
        })
        .where(eq(shipBlackoutDates.id, prior.id));
      report.updated++;
    } else {
      await db
        .update(shipBlackoutDates)
        .set({ syncedAt: now })
        .where(eq(shipBlackoutDates.id, prior.id));
    }
  }

  // A range that left the feed is a cancellation, or a week we have since
  // closed ourselves. Either way our row for it should go.
  if (!suspiciousEmpty) {
    for (const [key, row] of existingByKey) {
      if (seenKeys.has(key)) continue;
      await db.delete(shipBlackoutDates).where(eq(shipBlackoutDates.id, row.id));
      report.deleted++;
      log.info(`released ${row.startDate}..${row.endDate}, no longer held on Outdoorsy`);
    }
  }

  report.sweptHolds = await sweepStaleHolds(db);

  if (conflictNotes.length > 0) {
    try {
      await notifyShipCalendarConflict(conflictNotes);
    } catch (err) {
      log.error("conflict notification failed", err);
    }
  }

  log.info(
    `sync done: fetched=${report.fetched} echoed=${report.echoed} created=${report.created} updated=${report.updated} deleted=${report.deleted} conflicts=${report.conflicts} sweptHolds=${report.sweptHolds}`,
  );
  return report;
}

/** True when any day of [start, end) is already unavailable on our side. */
function anyClosed(closed: Set<string>, startDate: string, endDate: string): boolean {
  for (let d = new Date(`${startDate}T00:00:00Z`); ; d.setUTCDate(d.getUTCDate() + 1)) {
    const ymd = d.toISOString().slice(0, 10);
    if (ymd >= endDate) return false;
    if (closed.has(ymd)) return true;
  }
}

/**
 * Cancel `requested` bookings older than the hold TTL.
 *
 * An abandoned request otherwise sits on a week forever, going out to the
 * channels as a TENTATIVE hold and quietly making the ship look busier than she
 * is. The outbound feed already ignores holds this old; this removes the row so
 * the booking page agrees.
 */
async function sweepStaleHolds(db: DbInstance): Promise<number> {
  const cutoff = new Date(Date.now() - HOLD_TTL_HOURS * 3_600_000);
  const stale = await db
    .select({ id: shipBookings.id })
    .from(shipBookings)
    .where(and(eq(shipBookings.status, "requested"), lt(shipBookings.createdAt, cutoff)));
  if (stale.length === 0) return 0;

  await db
    .update(shipBookings)
    .set({ status: "cancelled" })
    .where(inArray(shipBookings.id, stale.map((s) => s.id)));
  return stale.length;
}

export type { IcalEvent };
