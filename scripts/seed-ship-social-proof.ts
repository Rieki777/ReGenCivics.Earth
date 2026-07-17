/**
 * Seed social-proof bookings for the ReGen Ship, so a new visitor sees the
 * calendar already filling and the free-voyage ladder already moving, instead of
 * an empty ship.
 *
 * What it does:
 *   - Creates a small pool of clearly-labeled demo crew accounts (openId prefix
 *     "demo-ship-seed:"). They carry NO quest points, so they never enter the
 *     weighted draw and can never win a real free voyage.
 *   - Places 10 "confirmed" one-week bookings on the real Monday voyage grid,
 *     spread Sep 2026 -> Mar 2027, weighted toward the later months, skipping the
 *     Thanksgiving / Christmas / New Year weeks (holidays left open).
 *
 * Why 10: the first-year target is 40 voyages (100%), so 10 = 25% booked. That is
 * safely under the 40% first release, so NO free voyage is auto-drawn from this
 * seed data. It only makes the calendar and ladder feel alive.
 *
 * Idempotent: bookings are keyed by startDate + the "seed:social-proof" notes tag,
 * demo users by openId. Re-running will not duplicate.
 *
 * Reversible:
 *   npx tsx scripts/seed-ship-social-proof.ts --undo
 * removes every seed booking and demo user this script created.
 *
 * Usage:
 *   npx tsx scripts/seed-ship-social-proof.ts --dry-run
 *   npx tsx scripts/seed-ship-social-proof.ts
 *   npx tsx scripts/seed-ship-social-proof.ts --undo
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { DEMO_BOOKING_OPENID_PREFIX } from "../shared/shipDemo";

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");
const UNDO = process.argv.includes("--undo");

// One shared prefix, so the drawing's exclusion can never drift from the seed.
const SEED_OPENID_PREFIX = DEMO_BOOKING_OPENID_PREFIX;
const SEED_NOTES_TAG = "seed:social-proof";

// A one-week voyage boards Monday and returns the following Sunday; the next
// week boards the following Monday (server/lib/ship-config VOYAGE_NIGHTS = 7,
// SHIP_SEASON_START_YMD = 2026-07-27). endDate is start + 7 nights.
function nextMondayGridEnd(startYmd: string): string {
  const d = new Date(`${startYmd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

// Demo crews (names are never shown publicly for a booking; they exist only to
// own the row and are labeled so they are easy to find and remove).
const DEMO_CREWS = [
  "Demo Crew — Alder & Fern",
  "Demo Crew — The Wren",
  "Demo Crew — Cedar House",
  "Demo Crew — Rill & Stone",
  "Demo Crew — The Manzanita",
  "Demo Crew — Salmonberry",
  "Demo Crew — Two Rivers",
  "Demo Crew — The Kestrel",
];

// 10 bookings on the real Monday grid, Sep 2026 -> Mar 2027, heavier on the later
// months (Jan/Feb/Mar carry two each; Sep-Dec one each). Holiday weeks skipped:
// Thanksgiving (wk of 11-23), Christmas (wk of 12-21), New Year (wk of 12-28).
const BOOKINGS: Array<{ start: string; crew: number; guests: number; children: number }> = [
  { start: "2026-09-14", crew: 0, guests: 2, children: 0 },
  { start: "2026-10-19", crew: 1, guests: 4, children: 0 },
  { start: "2026-11-09", crew: 2, guests: 2, children: 0 },
  { start: "2026-12-07", crew: 3, guests: 3, children: 1 },
  { start: "2027-01-11", crew: 4, guests: 2, children: 0 },
  { start: "2027-01-25", crew: 0, guests: 2, children: 0 }, // Alder & Fern, repeat crew
  { start: "2027-02-08", crew: 5, guests: 4, children: 0 },
  { start: "2027-02-22", crew: 6, guests: 2, children: 0 },
  { start: "2027-03-15", crew: 1, guests: 3, children: 0 }, // The Wren, repeat crew
  { start: "2027-03-29", crew: 7, guests: 2, children: 0 },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL not set. Check your .env.");
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log(`DRY RUN — would seed ${DEMO_CREWS.length} demo crews and ${BOOKINGS.length} confirmed bookings (25% of the 40-voyage target, under the 40% first release):`);
    for (const b of BOOKINGS) {
      console.log(`  ${b.start} -> ${nextMondayGridEnd(b.start)}  ${DEMO_CREWS[b.crew]}  (${b.guests} aboard)`);
    }
    console.log("No free voyage is auto-drawn at 25%. Run without --dry-run to write, or --undo to remove.");
    return;
  }

  const conn = await mysql.createConnection(url);
  try {
    if (UNDO) {
      const [delBookings] = await conn.execute(
        `DELETE FROM ship_bookings WHERE notes = ? AND userId IN (SELECT id FROM users WHERE openId LIKE ?)`,
        [SEED_NOTES_TAG, `${SEED_OPENID_PREFIX}%`],
      );
      const [delUsers] = await conn.execute(`DELETE FROM users WHERE openId LIKE ?`, [`${SEED_OPENID_PREFIX}%`]);
      const bCount = (delBookings as { affectedRows?: number }).affectedRows ?? 0;
      const uCount = (delUsers as { affectedRows?: number }).affectedRows ?? 0;
      console.log(`Undo complete. Removed ${bCount} seed bookings and ${uCount} demo crews.`);
      return;
    }

    // 1) Upsert demo crew accounts, remembering each id by its slot index.
    const crewIds: number[] = [];
    for (let i = 0; i < DEMO_CREWS.length; i++) {
      const openId = `${SEED_OPENID_PREFIX}${i + 1}`;
      const [existing] = await conn.execute("SELECT id FROM users WHERE openId = ? LIMIT 1", [openId]);
      if (Array.isArray(existing) && existing.length > 0) {
        crewIds[i] = (existing[0] as { id: number }).id;
      } else {
        const [res] = await conn.execute(
          "INSERT INTO users (openId, name, loginMethod, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, 'seed', NOW(), NOW(), NOW())",
          [openId, DEMO_CREWS[i]],
        );
        crewIds[i] = (res as { insertId: number }).insertId;
      }
    }

    // 2) Insert the confirmed bookings, skipping any already seeded on that week.
    let inserted = 0;
    let skipped = 0;
    for (const b of BOOKINGS) {
      const end = nextMondayGridEnd(b.start);
      const userId = crewIds[b.crew];
      const [existing] = await conn.execute(
        "SELECT id FROM ship_bookings WHERE startDate = ? AND notes = ? LIMIT 1",
        [b.start, SEED_NOTES_TAG],
      );
      if (Array.isArray(existing) && existing.length > 0) {
        skipped++;
        continue;
      }
      await conn.execute(
        `INSERT INTO ship_bookings
           (userId, startDate, endDate, guests, children, status,
            dietCommitmentAt, waterDoctrineCommitmentAt, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'confirmed', NOW(), NOW(), ?, NOW(), NOW())`,
        [userId, b.start, end, b.guests, b.children, SEED_NOTES_TAG],
      );
      inserted++;
    }
    console.log(`Done. Demo crews ready: ${crewIds.length}. Bookings inserted: ${inserted}, already present: ${skipped}.`);
    console.log(`That is ${inserted + skipped}/40 voyages = ${Math.round(((inserted + skipped) / 40) * 100)}% booked. First free voyage still releases at 40%.`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
