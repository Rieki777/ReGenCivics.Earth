/**
 * Interoperability Circle sync, against a real database.
 *
 * Dates are fixed in 2030 so the result does not depend on when the suite
 * runs. Every sync call passes its own `now`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, isNull, like } from "drizzle-orm";
import { getDb, setSiteSetting } from "./db";
import { events, eventSignups, eventAutoReminders, interopTimeVotes, siteSettings } from "../drizzle/schema";
import {
  addCircleSignups,
  ensureVotesTable,
  leaveCircle,
  syncInteropCircle,
  upcomingCircleRows,
} from "./lib/interopCircle";
import { INTEROP_CIRCLE_SEASON, INTEROP_PIN_SETTING } from "@shared/interopCircle";
import { resolveAutoReminderRecipients } from "./jobs/eventReminders";
import { loadFeedRows, renderFeed } from "./lib/calendarFeed";

const skipIfNoDb = !process.env.DATABASE_URL;
const EMAIL = "interop-circle-test@example.com";
const VOTER_PREFIX = "interopTest";

// Wednesday 2030-01-02, noon UTC.
const T0 = new Date("2030-01-02T12:00:00Z");
const HOUR = 3_600_000;

async function cleanup() {
  const db = await getDb();
  if (!db) return;
  await ensureVotesTable(db);
  const rows = await db.select({ id: events.id }).from(events).where(eq(events.season, INTEROP_CIRCLE_SEASON));
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    await db.delete(eventSignups).where(inArray(eventSignups.eventId, ids));
    await db.delete(eventAutoReminders).where(inArray(eventAutoReminders.eventId, ids));
    await db.delete(events).where(inArray(events.id, ids));
  }
  await db.delete(interopTimeVotes).where(like(interopTimeVotes.voterKey, `${VOTER_PREFIX}%`));
  await db.delete(siteSettings).where(like(siteSettings.key, "interop_circle_%"));
}

async function vote(key: string, slot: string) {
  const db = (await getDb())!;
  await db
    .insert(interopTimeVotes)
    .values({ slot, voterKey: `${VOTER_PREFIX}${key}` })
    .onDuplicateKeyUpdate({ set: { slot } });
}

describe.skipIf(skipIfNoDb)("Interoperability Circle sync", () => {
  beforeAll(async () => {
    process.env.EMAIL_HOLD = "true";
    await cleanup();
  });
  afterAll(cleanup);

  it("creates four weeks on the leading slot, each with reminders to its sign-ups", async () => {
    const db = (await getDb())!;
    await vote("A", "tue");
    const r = await syncInteropCircle({ force: true, now: T0 });
    expect(r).toMatchObject({ slot: "tue", inserted: 4, moved: 0 });

    const rows = await upcomingCircleRows(db, T0);
    expect(rows.map((x) => x.startTime.toISOString())).toEqual([
      "2030-01-08T18:00:00.000Z", // Tue 10:00 PST
      "2030-01-15T18:00:00.000Z",
      "2030-01-22T18:00:00.000Z",
      "2030-01-29T18:00:00.000Z",
    ]);

    const cfg = await db.select().from(eventAutoReminders).where(inArray(eventAutoReminders.eventId, rows.map((x) => x.id)));
    expect(cfg).toHaveLength(4);
    expect(cfg.every((c) => c.enabled === 1 && c.audienceMode === "custom")).toBe(true);

    await addCircleSignups(db, rows.map((x) => x.id), [{ email: EMAIL, name: "Tester" }]);
    const recipients = await resolveAutoReminderRecipients({
      eventId: rows[0].id,
      audienceMode: "custom",
      audienceConfig: { includeEventSignups: true },
    });
    expect(recipients.map((x) => x.email)).toContain(EMAIL);

    const feed = renderFeed(await loadFeedRows(T0), "interop-circle");
    expect(feed.match(/BEGIN:VEVENT/g)).toHaveLength(4);
  });

  it("waits for a new leader to settle, then moves every unfrozen week in one pass and emails once", async () => {
    const db = (await getDb())!;
    await vote("B", "thu");
    await vote("C", "thu");

    const early = await syncInteropCircle({ force: true, now: T0 });
    expect(early).toMatchObject({ slot: "tue", moved: 0 });

    const later = new Date(T0.getTime() + 25 * HOUR);
    const settled = await syncInteropCircle({ force: true, now: later });
    expect(settled).toMatchObject({ slot: "thu", inserted: 0, moved: 4, notified: 1 });

    const rows = await upcomingCircleRows(db, later);
    expect(rows[0].startTime.toISOString()).toBe("2030-01-11T02:00:00.000Z"); // Thu 18:00 PST
  });

  it("never moves a session inside the freeze window, and never adds one at short notice", async () => {
    const db = (await getDb())!;
    await setSiteSetting(INTEROP_PIN_SETTING, "tue");
    // Wed 2030-01-09 noon: Thursday's session is 38h out, frozen.
    const now = new Date("2030-01-09T12:00:00Z");
    const r = await syncInteropCircle({ force: true, now });
    const rows = await upcomingCircleRows(db, now);
    expect(rows[0].startTime.toISOString()).toBe("2030-01-11T02:00:00.000Z");
    expect(rows[1].startTime.toISOString()).toBe("2030-01-15T18:00:00.000Z");
    expect(r!.slot).toBe("tue");
    await setSiteSetting(INTEROP_PIN_SETTING, "");
  });

  it("carries members onto new weeks, and not once they leave", async () => {
    const db = (await getDb())!;
    const t = new Date("2030-01-30T12:00:00Z");
    await syncInteropCircle({ force: true, now: t });
    let rows = await upcomingCircleRows(db, t);
    const newest = rows[rows.length - 1];
    const carried = await db
      .select()
      .from(eventSignups)
      .where(and(eq(eventSignups.eventId, newest.id), isNull(eventSignups.cancelledAt)));
    expect(carried.map((c) => c.email)).toEqual([EMAIL]);

    await leaveCircle(db, EMAIL, T0);
    const t2 = new Date("2030-02-06T12:00:00Z");
    await syncInteropCircle({ force: true, now: t2 });
    rows = await upcomingCircleRows(db, t2);
    const after = await db
      .select()
      .from(eventSignups)
      .where(and(eq(eventSignups.eventId, rows[rows.length - 1].id), isNull(eventSignups.cancelledAt)));
    expect(after).toHaveLength(0);
  });
});
