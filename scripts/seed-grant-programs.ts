/**
 * seed-grant-programs.ts
 *
 * Load the grant programs land projects can apply to from the gitignored
 * docs/private/research/grant-sources-seed.json into funding_pipeline
 * (audience project or both; funding engine Phase 5, drizzle/0279), then
 * recompute every profiled project's matches.
 *
 * Program rows are upserted on programKey and carry research facts only
 * (server/funding/kitSeed.ts planProgramRow): the seed never writes appStatus,
 * stage, owner, next action or notes. A seed name that already belongs to one
 * of ReGen Civics' own funder rows is skipped and reported, never taken over.
 *
 * Usage:
 *   npx tsx scripts/seed-grant-programs.ts            # dry run: report only
 *   npx tsx scripts/seed-grant-programs.ts --write    # apply, then refresh matches
 *   add --file <path> to read another seed file
 *
 * Requires DATABASE_URL (.env) and migration 0279.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { fundingPipeline, projectFundingProfiles } from "../drizzle/schema";
import { planProgramRow, validateProgramSeed, type GrantProgramSeed } from "../server/funding/kitSeed";
import { refreshMatches } from "../server/funding/projectFunding";

const write = process.argv.includes("--write");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.resolve(__dirname, "..", "docs", "private", "research", "grant-sources-seed.json");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = arg("--file") ?? DEFAULT_FILE;
  if (!fs.existsSync(file)) throw new Error(`Seed file not found: ${file}`);
  const programs = JSON.parse(fs.readFileSync(file, "utf8")) as GrantProgramSeed[];
  const problems = validateProgramSeed(programs);
  if (problems.length) {
    console.error("[seed-grant-programs] the seed file has problems; nothing was written:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (check .env)");
  const conn = await mysql.createConnection(url);
  const db = drizzle(conn) as unknown as Parameters<typeof refreshMatches>[0];
  let added = 0;
  let refreshed = 0;
  let skipped = 0;
  try {
    for (const p of programs) {
      const row = planProgramRow(p);
      const [byKey] = await db.select({ id: fundingPipeline.id }).from(fundingPipeline).where(eq(fundingPipeline.programKey, p.key)).limit(1);
      if (byKey) {
        refreshed++;
        console.log(`  = ${p.key}${row.deadlineAt ? `, deadline ${row.deadlineAt.toISOString()}` : ""}`);
        if (write) await db.update(fundingPipeline).set(row).where(eq(fundingPipeline.id, byKey.id));
        continue;
      }
      const [byName] = await db
        .select({ id: fundingPipeline.id, audience: fundingPipeline.audience })
        .from(fundingPipeline)
        .where(eq(fundingPipeline.name, row.name))
        .limit(1);
      if (byName) {
        skipped++;
        console.log(`  ! ${p.key}: "${row.name}" is already funder row #${byName.id} (${byName.audience}); skipped, rename one to seed it`);
        continue;
      }
      added++;
      console.log(`  + ${p.key} (${row.audience}, ${row.programStatus ?? "status unknown"})${row.deadlineAt ? `, deadline ${row.deadlineAt.toISOString()}` : ""}`);
      if (write) await db.insert(fundingPipeline).values({ ...row, priority: "P2" });
    }
    console.log(`\n${programs.length} programs: ${added} new, ${refreshed} refreshed, ${skipped} skipped.`);

    if (write) {
      const profiles = await db.select({ applicationId: projectFundingProfiles.applicationId }).from(projectFundingProfiles);
      for (const pr of profiles) await refreshMatches(db, pr.applicationId);
      console.log(`Matches recomputed for ${profiles.length} profiled project(s).`);
    } else {
      console.log("Dry run: nothing written. Add --write to apply.");
    }
  } finally {
    await conn.end();
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error("[seed-grant-programs] failed:", err);
    process.exit(1);
  });
