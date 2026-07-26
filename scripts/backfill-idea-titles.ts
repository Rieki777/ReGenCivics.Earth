/**
 * Give every harvested idea a real title.
 *
 * The vault sends `title` as the first ~45 characters of the raw note, cut
 * mid-word, which made the ripe-idea feed and the "what would this draw from"
 * panel unreadable. This walks every idea missing a `display_title`, batches
 * them twenty at a time through the light tier, and writes real ones.
 *
 *   npx tsx scripts/backfill-idea-titles.ts           # all of them
 *   npx tsx scripts/backfill-idea-titles.ts --limit 60  # just the first 60
 *
 * Idempotent: rerunning only picks up rows that are still untitled, so it is
 * safe to stop it and start it again. Titles that already read well are copied
 * across as-is rather than sent to the model.
 */
// Must be the first import: ES module imports are hoisted and evaluated in
// order, so env has to be loaded before server/_core/env validates it.
import "dotenv/config";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "../server/db";
import { harvestIdeas } from "../drizzle/schema";
import { titleUntitledIdeas } from "../server/lib/harvest-titles";
import { ENV } from "../server/_core/env";

async function main() {
  const limitArg = process.argv.indexOf("--limit");
  const cap = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

  const ownerId = ENV.ownerUserId;
  if (!ownerId) {
    console.error("OWNER_USER_ID is not set, so there is no one to title ideas for.");
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("No database. Check DATABASE_URL.");
    process.exit(1);
  }

  const [{ n: remaining }] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(harvestIdeas)
    .where(and(
      eq(harvestIdeas.ownerId, ownerId),
      or(isNull(harvestIdeas.displayTitle), eq(harvestIdeas.displayTitle, "")),
    ));

  const target = Math.min(Number(remaining), cap);
  console.log(`${remaining} ideas without a display title. Titling ${target}.`);

  let done = 0;
  let emptyRounds = 0;
  while (done < target) {
    const written = await titleUntitledIdeas(ownerId, 20);
    if (written === 0) {
      // Two dry rounds means everything left is failing, not finishing.
      if (++emptyRounds >= 2) {
        console.warn("Two rounds wrote nothing. Stopping rather than looping.");
        break;
      }
      continue;
    }
    emptyRounds = 0;
    done += written;
    console.log(`  ${done}/${target}`);
  }

  console.log(`Done. ${done} titled.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
