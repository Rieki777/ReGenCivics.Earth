/**
 * marketing-metrics.ts — Deterministic weekly marketing numbers for the W1
 * (Monday) tracker task. Pulls what can be pulled from source; everything it
 * cannot verify it prints as "n/a" so the tracker never carries invented data.
 *
 * What it reads, and from where (see marketing/MEASUREMENT.md section 3):
 *   - Voyage weeks booked + meter %   ← ship_bookings (the live read path in
 *                                        server/routes/ship.ts loadFreeVoyageStatus)
 *   - Giveaway entries (total/verified) ← ship_giveaway_entries
 *   - Email list size                  ← EmailOctopus API (EMAILOCTOPUS_API_KEY)
 *   - Socials, Zeffy (MRR / members)   ← manual, not fetched here
 *
 * Seed rows: ship_bookings carries `notes = 'seed:social-proof'` demo voyages
 * that exist to keep the PUBLIC meter releasing free-voyage news beats. The
 * live read path counts them, so the public meter % includes them. This script
 * reports BOTH: `weeksBookedReal` (seed excluded — the true traction number the
 * tracker should trend) and `meterPublicPercent` (seed included — what the site
 * shows). Never trend the public meter as if it were real bookings.
 *
 * Usage (Windows PowerShell, from project root):
 *   $env = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
 *   foreach ($line in $env) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v.Trim('"')) }
 *   npx tsx scripts/marketing-metrics.ts
 *
 * Or inline:
 *   $Env:DATABASE_URL="mysql://..."; $Env:EMAILOCTOPUS_API_KEY="..."; npx tsx scripts/marketing-metrics.ts
 *
 * Output: a human summary, a JSON blob, and a paste-ready TRACKER.md row.
 */
import mysql from "mysql2/promise";
import { freeVoyagesUnlocked } from "../shared/shipFreeVoyage";

// Source of truth: server/lib/ship-config.ts MAIDEN_YEAR_VOYAGE_TARGET. Inlined
// here so this script stays runnable without dragging in server-only deps.
const MAIDEN_YEAR_VOYAGE_TARGET = 40;

// Mirrors server/lib/ship-logic.ts percentBooked.
function percentBooked(bookedVoyages: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((bookedVoyages / target) * 100)));
}

const NA = "n/a";

function isoWeekMonday(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // back to Monday
  x.setUTCDate(x.getUTCDate() + diff);
  return x.toISOString().slice(0, 10);
}

async function readBookings(conn: mysql.Connection) {
  // Live read path counts confirmed+active+completed. Seed social-proof rows
  // are tagged notes = 'seed:%'.
  const [pub] = await conn.execute<any[]>(
    "SELECT COUNT(*) AS n FROM ship_bookings WHERE status IN ('confirmed','active','completed')"
  );
  const [real] = await conn.execute<any[]>(
    "SELECT COUNT(*) AS n FROM ship_bookings WHERE status IN ('confirmed','active','completed') AND (notes IS NULL OR notes NOT LIKE 'seed:%')"
  );
  const [req] = await conn.execute<any[]>(
    "SELECT COUNT(*) AS n FROM ship_bookings WHERE status = 'requested'"
  );
  const publicBooked = Number(pub[0].n);
  const realBooked = Number(real[0].n);
  const requested = Number(req[0].n);
  return {
    weeksBookedReal: realBooked,
    weeksBookedPublic: publicBooked,
    seedBookings: publicBooked - realBooked,
    bookingRequestsOpen: requested,
    meterPublicPercent: percentBooked(publicBooked, MAIDEN_YEAR_VOYAGE_TARGET),
    meterRealPercent: percentBooked(realBooked, MAIDEN_YEAR_VOYAGE_TARGET),
    freeVoyagesUnlockedPublic: freeVoyagesUnlocked(percentBooked(publicBooked, MAIDEN_YEAR_VOYAGE_TARGET)),
  };
}

async function readGiveaway(conn: mysql.Connection) {
  const [total] = await conn.execute<any[]>("SELECT COUNT(*) AS n FROM ship_giveaway_entries");
  const [verified] = await conn.execute<any[]>(
    "SELECT COUNT(*) AS n FROM ship_giveaway_entries WHERE verifiedAt IS NOT NULL"
  );
  return { entriesTotal: Number(total[0].n), entriesVerified: Number(verified[0].n) };
}

async function readEmailOctopus(): Promise<{ listSize: number | null; note: string }> {
  const key = process.env.EMAILOCTOPUS_API_KEY;
  if (!key) return { listSize: null, note: "EMAILOCTOPUS_API_KEY not set" };
  const listId = process.env.EMAILOCTOPUS_LIST_ID; // optional; if unset, sum all lists
  try {
    const base = "https://emailoctopus.com/api/1.6";
    if (listId) {
      const r = await fetch(`${base}/lists/${listId}?api_key=${encodeURIComponent(key)}`);
      if (!r.ok) return { listSize: null, note: `EmailOctopus HTTP ${r.status}` };
      const j: any = await r.json();
      const n = j?.counts?.subscribed;
      return typeof n === "number" ? { listSize: n, note: "subscribed count" } : { listSize: null, note: "no counts.subscribed" };
    }
    const r = await fetch(`${base}/lists?api_key=${encodeURIComponent(key)}&limit=100`);
    if (!r.ok) return { listSize: null, note: `EmailOctopus HTTP ${r.status}` };
    const j: any = await r.json();
    const lists: any[] = j?.data ?? [];
    if (!lists.length) return { listSize: null, note: "no lists returned" };
    const sum = lists.reduce((acc, l) => acc + (l?.counts?.subscribed ?? 0), 0);
    return { listSize: sum, note: `summed subscribed across ${lists.length} list(s)` };
  } catch (e: any) {
    return { listSize: null, note: `EmailOctopus error: ${e?.message ?? e}` };
  }
}

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  const conn = await mysql.createConnection(DATABASE_URL);
  const [bookings, giveaway, email] = [
    await readBookings(conn),
    await readGiveaway(conn),
    await readEmailOctopus(),
  ];
  await conn.end();

  const weekOf = isoWeekMonday();
  const listCell = email.listSize === null ? NA : String(email.listSize);
  const entriesCell = giveaway.entriesTotal === 0 ? "0 (pre-launch)" : `${giveaway.entriesVerified} verified / ${giveaway.entriesTotal}`;

  const result = {
    weekOf,
    listSize: email.listSize,
    listSizeNote: email.note,
    ...bookings,
    ...giveaway,
    // Manual sources, not fetched by this script:
    appsWaitlist: NA,
    monthlyMembers: NA,
    mrr: NA,
    podcastPitchesBooked: NA,
    socials: NA,
  };

  console.log("=== Marketing metrics (deterministic) ===");
  console.log(`week of ............. ${weekOf}`);
  console.log(`email list size ..... ${listCell}   (${email.note})`);
  console.log(`weeks booked (real).. ${bookings.weeksBookedReal}   [seed excluded]`);
  console.log(`weeks booked (public) ${bookings.weeksBookedPublic}   [+${bookings.seedBookings} seed social-proof]`);
  console.log(`open booking requests ${bookings.bookingRequestsOpen}`);
  console.log(`meter % (public) .... ${bookings.meterPublicPercent}%   (real: ${bookings.meterRealPercent}%)`);
  console.log(`free voyages unlocked ${bookings.freeVoyagesUnlockedPublic}`);
  console.log(`giveaway entries .... ${giveaway.entriesVerified} verified / ${giveaway.entriesTotal} total`);
  console.log("manual (not fetched): apps/waitlist, monthly members, MRR, podcast, socials");
  console.log("\n=== JSON ===");
  console.log(JSON.stringify(result, null, 2));
  console.log("\n=== TRACKER.md row (verify manual cells before pasting) ===");
  console.log(
    `| ${weekOf} | ${listCell} | ${NA} | ${bookings.weeksBookedReal} real (${bookings.seedBookings} seed) | ${bookings.meterPublicPercent}% (seed) | ${entriesCell} | ${NA} | ${NA} | ${NA} | ${NA} | (fill status) |`
  );
}

main().catch((e) => {
  console.error("marketing-metrics error:", e?.message ?? e);
  process.exit(1);
});
