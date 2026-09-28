/**
 * Seed one standing admin_automations row for the funding deadline pings:
 * type=funding_deadlines, cadence=hourly, enabled=1 (funding engine Phase 2).
 *
 * Run once after drizzle/0278_funding_deadline_pings.sql is applied. Skips if a
 * row with the same (name, type) already exists, so re-runs are no-ops. Mirrors
 * scripts/seed-brain-morning-automation.ts.
 *
 * The runner treats this type as due on every hourly cron tick; the job itself
 * sends each 21-, 7- and 2-day ping exactly once (server/funding/deadlines.ts).
 *
 * Picks the createdBy as the lowest-id superadmin (then admin) so the automation
 * has a real human owner for the audit trail. Override with --userId=<n>.
 *
 * Usage:
 *   npx tsx scripts/seed-funding-deadlines-automation.ts
 *   npx tsx scripts/seed-funding-deadlines-automation.ts --userId=42
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const NAME = "Funding deadline pings";
const TYPE = "funding_deadlines";
const CADENCE = "hourly";

function parseUserId(): number | null {
  const arg = process.argv.find((a) => a.startsWith("--userId="));
  if (!arg) return null;
  const v = parseInt(arg.split("=")[1] ?? "", 10);
  return Number.isFinite(v) && v > 0 ? v : null;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set. Aborting.");
    process.exit(1);
  }
  const conn = await mysql.createConnection(url);
  try {
    const [existingRows] = await conn.execute(
      "SELECT id, cadence, enabled FROM admin_automations WHERE name = ? AND type = ? LIMIT 1",
      [NAME, TYPE],
    );
    const existing = (existingRows as Array<{ id: number; cadence: string; enabled: number }>)[0];
    if (existing) {
      console.log(`Already seeded: id=${existing.id} cadence=${existing.cadence} enabled=${existing.enabled}. Nothing to do.`);
      return;
    }

    let userId = parseUserId();
    if (!userId) {
      const [rows] = await conn.execute(
        "SELECT id FROM users WHERE role IN ('superadmin','admin') ORDER BY FIELD(role,'superadmin','admin'), id ASC LIMIT 1",
      );
      const owner = (rows as Array<{ id: number }>)[0];
      if (!owner) {
        console.error("No admin or superadmin user found. Pass --userId=<n> to override.");
        process.exit(2);
      }
      userId = owner.id;
    }

    const [result] = await conn.execute(
      "INSERT INTO admin_automations (name, type, cadence, enabled, createdBy) VALUES (?, ?, ?, 1, ?)",
      [NAME, TYPE, CADENCE, userId],
    );
    const insertId = (result as { insertId: number }).insertId;
    console.log(`Seeded admin_automations row id=${insertId} (createdBy=${userId}, cadence=${CADENCE}).`);
    console.log("It runs on every hourly cron tick and pings 21, 7 and 2 days before each funder deadline.");
    console.log("It needs TELEGRAM_BRAIN_BOT_TOKEN and TELEGRAM_BRAIN_OWNER_ID on the service, or lastResult will read 'Not sent'.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
