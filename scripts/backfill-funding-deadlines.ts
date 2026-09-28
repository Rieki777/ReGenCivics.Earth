/**
 * backfill-funding-deadlines.ts
 *
 * Fill funding_pipeline.deadlineAt and track where the research text makes
 * them unambiguous (funding engine Phase 1, drizzle/0277), and report every
 * row that stays without a date and why. Plan v1.3 section 4.3: "Migrate by
 * parsing, and flag rows that fail to parse. Nothing can trigger on free text."
 *
 * Rules (server/funding/kitSeed.ts planBackfill, shared/fundingDeadlines.ts):
 *   - only an exact date becomes deadlineAt; "~Aug 1", "Target Mar 1, 2027",
 *     "Opens late Jul" and a date with no year are reported, never written;
 *   - a date with no time is read as the start of that day, Pacific;
 *   - a track is set only from an unambiguous category (accelerators,
 *     government, philanthropy, fellowships, faith, web3, allies);
 *   - a row that already has a deadlineAt or a track keeps it.
 *
 * Usage:
 *   npx tsx scripts/backfill-funding-deadlines.ts            # dry run: report only
 *   npx tsx scripts/backfill-funding-deadlines.ts --write    # apply
 *
 * Requires DATABASE_URL (.env) and migration 0277.
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { fundingPipeline } from "../drizzle/schema";
import { planBackfill } from "../server/funding/kitSeed";

const write = process.argv.includes("--write");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (check .env)");
  const conn = await mysql.createConnection(url);
  const db = drizzle(conn);
  try {
    const rows = await db
      .select({
        id: fundingPipeline.id,
        name: fundingPipeline.name,
        category: fundingPipeline.category,
        deadline: fundingPipeline.deadline,
        deadlineAt: fundingPipeline.deadlineAt,
        track: fundingPipeline.track,
      })
      .from(fundingPipeline);
    const plan = planBackfill(rows);

    console.log(`${rows.length} funder rows.`);
    console.log(`\nDeadlines to write (${plan.deadlines.length}):`);
    for (const d of plan.deadlines) console.log(`  #${d.id} ${d.name}: "${d.text}" -> ${d.at.toISOString()} (${d.note})`);

    console.log(`\nRows left without a date, by reason:`);
    for (const [kind, list] of Object.entries(plan.unparsed).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${kind} (${list.length})`);
      for (const r of list) console.log(`    #${r.id} ${r.name}: "${r.text}"`);
    }

    console.log(`\nTracks to write (${plan.tracks.length}):`);
    for (const t of plan.tracks) console.log(`  #${t.id} ${t.name}: ${t.category} -> ${t.track}`);
    const untracked = Object.entries(plan.untracked).sort((a, b) => b[1] - a[1]);
    if (untracked.length) {
      console.log(`\nCategories left for Rye to set a track on (the category alone does not say):`);
      for (const [category, n] of untracked) console.log(`  ${n}  ${category}`);
    }

    if (write) {
      for (const d of plan.deadlines) await db.update(fundingPipeline).set({ deadlineAt: d.at }).where(eq(fundingPipeline.id, d.id));
      for (const t of plan.tracks) await db.update(fundingPipeline).set({ track: t.track }).where(eq(fundingPipeline.id, t.id));
      console.log(`\nWrote ${plan.deadlines.length} deadline(s) and ${plan.tracks.length} track(s).`);
    } else {
      console.log("\nDry run: nothing written. Add --write to apply.");
    }
  } finally {
    await conn.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill-funding-deadlines] failed:", err);
    process.exit(1);
  });
