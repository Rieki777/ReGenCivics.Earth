/**
 * Seed one standing admin_automations row for the second brain's morning
 * message: type=brain_morning, cadence=daily, enabled=1.
 *
 * Run once after drizzle/0231_admin_automation_brain_morning.sql is applied.
 * Skips if a row with the same (name, type) already exists, so re-runs are
 * no-ops. Mirrors scripts/seed-briefing-automation.ts, which is the pattern the
 * other standing routines were seeded with.
 *
 * The cadence column is set to 'daily' for readability and is not what decides
 * when this fires: the runner gates brain_morning on wall-clock time (first
 * hourly cron tick at or after 08:00 America/Los_Angeles, once per calendar day
 * in that zone). See server/routes/adminAutomations.ts.
 *
 * Picks the createdBy as the lowest-id superadmin (then admin) so the automation
 * has a real human owner for the audit trail. Override with --userId=<n>.
 *
 * Usage:
 *   npx tsx scripts/seed-brain-morning-automation.ts
 *   npx tsx scripts/seed-brain-morning-automation.ts --userId=42
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const NAME = "Second brain morning message";
const TYPE = "brain_morning";
const CADENCE = "daily";

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
    console.log("It fires on the first hourly cron tick at or after 08:00 America/Los_Angeles.");
    console.log("It needs TELEGRAM_BRAIN_BOT_TOKEN and TELEGRAM_BRAIN_OWNER_ID on the service, or lastResult will read 'Not sent'.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
