/**
 * Reconciliation safety net for Zeffy donations.
 *
 * Zeffy's webhook (server/webhooks/zeffy.ts) is the primary path for recording
 * completed gifts. This script is a backup: it pulls recent payments from
 * Zeffy's read-only API and inserts any that are missing from church_donations
 * (matched on zeffyPaymentId), in case a webhook delivery was ever lost. Safe
 * to run repeatedly; it never mutates an existing row.
 *
 * WRITES to the Railway DB, so RYE runs it. Needs ZEFFY_API_KEY and
 * DATABASE_URL. Suggested cadence: daily, manually or via a Railway cron
 * (see the regen-railway-crons skill) once this has been run manually a few
 * times and looks right.
 *
 *   npx tsx scripts/reconcile-zeffy.ts
 *   npx tsx scripts/reconcile-zeffy.ts --since=2026-07-01
 *   npx tsx scripts/reconcile-zeffy.ts --dry-run
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const ZEFFY_API_BASE = "https://api.zeffy.com/api/v1";

type ZeffyPayment = {
  id: string;
  status?: string;
  amount?: number;
  currency?: string;
  campaignId?: string;
  contact?: { email?: string | null } | null;
  isRecurring?: boolean;
};

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}
const DRY_RUN = process.argv.includes("--dry-run");

async function fetchPayments(apiKey: string, since?: string): Promise<ZeffyPayment[]> {
  const url = new URL(`${ZEFFY_API_BASE}/payments`);
  if (since) url.searchParams.set("since", since);
  const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!resp.ok) throw new Error(`Zeffy API ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const json = (await resp.json()) as { data?: ZeffyPayment[] } | ZeffyPayment[];
  return Array.isArray(json) ? json : (json.data ?? []);
}

async function main() {
  const apiKey = process.env.ZEFFY_API_KEY;
  if (!apiKey) throw new Error("ZEFFY_API_KEY is not set.");

  const since = arg("since");
  const payments = await fetchPayments(apiKey, since);
  const completed = payments.filter((p) => !p.status || p.status.toLowerCase() === "completed" || p.status.toLowerCase() === "succeeded");
  console.log(`Fetched ${payments.length} payments (${completed.length} completed${since ? ` since ${since}` : ""}).`);

  if (DRY_RUN) {
    console.log("--dry-run: no DB writes.");
    for (const p of completed.slice(0, 5)) {
      console.log(`  ${p.id}: ${((p.amount ?? 0) / 100).toFixed(2)} ${(p.currency ?? "usd").toUpperCase()}`);
    }
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set. Use --dry-run to test without a DB.");
  const pool = mysql.createPool({ uri: dbUrl, connectionLimit: 5 });

  try {
    let inserted = 0;
    let skipped = 0;
    for (const p of completed) {
      const [existing] = await pool.query("SELECT id FROM church_donations WHERE zeffyPaymentId = ? LIMIT 1", [p.id]);
      if ((existing as unknown[]).length > 0) {
        skipped++;
        continue;
      }
      await pool.query(
        `INSERT INTO church_donations (provider, zeffyPaymentId, zeffyCampaignId, donorEmail, amountCents, currency, giftInterval, status)
         VALUES ('zeffy', ?, ?, ?, ?, ?, ?, 'succeeded')`,
        [p.id, p.campaignId ?? null, p.contact?.email ?? null, p.amount ?? 0, (p.currency ?? "usd").toLowerCase(), p.isRecurring ? "monthly" : "one_time"],
      );
      inserted++;
    }
    console.log(`Reconciled: ${inserted} inserted, ${skipped} already present.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
