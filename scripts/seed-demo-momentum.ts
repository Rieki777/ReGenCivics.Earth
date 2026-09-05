/**
 * Give the example campaigns healthy momentum.
 *
 * The demo campaigns sat at two to eleven per cent on the pooled bar and one to
 * two per cent on the cash bar, which reads as a dying project rather than an
 * invitation. Rye, 2026-09-05: better to project success than weak outcomes.
 *
 * It does NOT write the cached pledged* columns directly. Those are derived from
 * contributions by `updateCampaignPledgedTotals`, so a hand-set number would be
 * silently reverted the next time anything triggered a recompute. Instead it
 * seeds real accepted contributions that add up to the target, then runs the
 * server's own recompute. The numbers are then true, and stay true.
 *
 * ONLY TOUCHES CAMPAIGNS FLAGGED isDemo = 1. A real campaign's figures are
 * somebody's actual work and are never invented.
 *
 *   npx tsx scripts/seed-demo-momentum.ts           # add momentum
 *   npx tsx scripts/seed-demo-momentum.ts --down    # remove it again
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config({ quiet: true });

const MARKER = "DEMO-MOMENTUM";

/** Per campaign: how full the pooled bar and the cash bar should read. */
const TARGETS: Array<{ pooled: number; cash: number }> = [
  { pooled: 0.62, cash: 0.55 },
  { pooled: 0.78, cash: 0.71 },
  { pooled: 0.71, cash: 0.64 },
  { pooled: 0.85, cash: 0.80 },
];

const GIVERS = [
  ["Mira Okonkwo", "resource"], ["Tomas Lindqvist", "equipment"], ["Aisha Rahman", "role"],
  ["Jonah Whitefeather", "land"], ["Elena Cruz", "resource"], ["Kwame Mensah", "role"],
  ["Sofia Bianchi", "equipment"], ["Ravi Nair", "resource"], ["Freya Andersen", "role"],
  ["Diego Fuentes", "land"], ["Yuki Tanaka", "resource"], ["Amara Diallo", "equipment"],
] as const;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL is not set."); process.exit(1); }

const url = new URL(DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname, port: Number(url.port || 3306), user: url.username,
  password: decodeURIComponent(url.password), database: url.pathname.slice(1),
  decimalNumbers: true,
});

const down = process.argv.includes("--down");

const [demos]: any = await conn.query(
  `SELECT id, title, currency, totalValue, financialTarget
     FROM campaigns WHERE isDemo = 1 ORDER BY id`,
);
if (!demos.length) { console.log("No demo campaigns found."); await conn.end(); process.exit(0); }

if (down) {
  const [res]: any = await conn.query(
    `DELETE FROM campaign_contributions WHERE description LIKE ?`, [`%${MARKER}%`]);
  console.log(`Removed ${res.affectedRows} seeded contributions.`);
} else {
  // Clear any previous run first, so this is idempotent rather than cumulative.
  await conn.query(`DELETE FROM campaign_contributions WHERE description LIKE ?`, [`%${MARKER}%`]);

  for (let i = 0; i < demos.length; i++) {
    const c = demos[i];
    const t = TARGETS[i % TARGETS.length];
    const goal = Number(c.totalValue) + Number(c.financialTarget);
    const cashTarget = Number(c.financialTarget);

    // The cash half, as financial contributions.
    const cashWanted = Math.round(cashTarget * t.cash);
    // The in-kind half is whatever else is needed to reach the pooled target.
    const inKindWanted = Math.max(0, Math.round(goal * t.pooled) - cashWanted);

    const rows: Array<[string, string, string, number]> = [];
    // Split each half across several givers so the ledger looks like a community
    // rather than one benefactor, with uneven amounts rather than round ones.
    const split = (total: number, parts: number) => {
      const weights = Array.from({ length: parts }, (_, k) => 1 + ((k * 7919) % 13) / 10);
      const sum = weights.reduce((a, b) => a + b, 0);
      const out = weights.map((w) => Math.round((total * w) / sum));
      out[out.length - 1] += total - out.reduce((a, b) => a + b, 0); // exact
      return out;
    };

    split(cashWanted, 4).forEach((amt, k) => {
      const [name] = GIVERS[(i * 3 + k) % GIVERS.length];
      rows.push([name, `${name.split(" ")[0].toLowerCase()}${i}${k}@example.com`, "financial", amt]);
    });
    split(inKindWanted, 5).forEach((amt, k) => {
      const [name, type] = GIVERS[(i * 5 + k + 4) % GIVERS.length];
      rows.push([name, `${name.split(" ")[0].toLowerCase()}${i}k${k}@example.com`, type, amt]);
    });

    for (const [name, email, type, amt] of rows) {
      await conn.query(
        `INSERT INTO campaign_contributions
          (campaignId, userId, contributorName, contributorEmail, contributionType, title,
           description, estimatedValue, financialAmount, status, quantityPledged, isAnonymous, submittedAt)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 'accepted', 1, 0, NOW())`,
        [c.id, name, email, type, `${name}'s contribution`,
         `${MARKER}. Example data on an example campaign.`,
         amt, type === "financial" ? amt : null],
      );
    }

    // The server's own recompute, so the cached columns are derived and not invented.
    await conn.query(
      `UPDATE campaigns c SET
         pledgedTotal     = COALESCE((SELECT SUM(estimatedValue) FROM campaign_contributions WHERE campaignId = c.id AND status IN ('accepted','fulfilled','thanked')), 0),
         pledgedFinancial = COALESCE((SELECT SUM(COALESCE(financialAmount, estimatedValue)) FROM campaign_contributions WHERE campaignId = c.id AND status IN ('accepted','fulfilled','thanked') AND contributionType = 'financial'), 0),
         pledgedLand      = COALESCE((SELECT SUM(estimatedValue) FROM campaign_contributions WHERE campaignId = c.id AND status IN ('accepted','fulfilled','thanked') AND contributionType = 'land'), 0),
         pledgedEquipment = COALESCE((SELECT SUM(estimatedValue) FROM campaign_contributions WHERE campaignId = c.id AND status IN ('accepted','fulfilled','thanked') AND contributionType = 'equipment'), 0),
         pledgedRoles     = COALESCE((SELECT SUM(estimatedValue) FROM campaign_contributions WHERE campaignId = c.id AND status IN ('accepted','fulfilled','thanked') AND contributionType = 'role'), 0),
         pledgedResources = COALESCE((SELECT SUM(estimatedValue) FROM campaign_contributions WHERE campaignId = c.id AND status IN ('accepted','fulfilled','thanked') AND contributionType = 'resource'), 0)
       WHERE c.id = ?`, [c.id]);
  }
}

const [after]: any = await conn.query(
  `SELECT id, title, totalValue, financialTarget, pledgedTotal, pledgedFinancial
     FROM campaigns WHERE isDemo = 1 ORDER BY id`);
console.log("\nExample campaigns now read:");
for (const x of after) {
  const goal = Number(x.totalValue) + Number(x.financialTarget);
  const pooled = goal ? (Number(x.pledgedTotal) / goal) * 100 : 0;
  const cash = Number(x.financialTarget) ? (Number(x.pledgedFinancial) / Number(x.financialTarget)) * 100 : 0;
  console.log(`  #${x.id} ${String(x.title).slice(0, 30).padEnd(30)} pooled ${pooled.toFixed(0)}%  cash ${cash.toFixed(0)}%`);
}

await conn.end();
