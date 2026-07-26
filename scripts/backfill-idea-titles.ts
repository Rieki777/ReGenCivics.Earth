/**
 * Give every harvested idea a real title.
 *
 * The vault sends `title` as the first ~45 characters of the raw note, cut
 * mid-word, which made the ripe-idea feed and the "what would this draw from"
 * panel unreadable. This writes a real one to `display_title` and leaves
 * `title` alone so re-syncing the bridge never clobbers it.
 *
 * Three modes, because the titles can come from either the app's own LLM path
 * or from a person (or an agent) doing it by hand:
 *
 *   # 1. Let the app title them, twenty per call on the light tier.
 *   #    Needs OPENROUTER_API_KEY, which is production-only.
 *   npx tsx scripts/backfill-idea-titles.ts
 *   npx tsx scripts/backfill-idea-titles.ts --limit 60
 *
 *   # 2. Export untitled ideas as JSONL to title elsewhere.
 *   #    Ordered by ripeness, so the top of the feed gets fixed first.
 *   npx tsx scripts/backfill-idea-titles.ts --export notes.jsonl --limit 120
 *
 *   # 3. Apply titles from JSONL of {"id":123,"title":"..."}.
 *   npx tsx scripts/backfill-idea-titles.ts --apply titles.jsonl
 *
 * All three are idempotent: only rows still missing a display_title are ever
 * picked up, so stopping and restarting is safe.
 */
// Must be the first import: ES module imports are hoisted and evaluated in
// order, so env has to be loaded before server/_core/env validates it.
import "dotenv/config";
import fs from "fs";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "../server/db";
import { harvestIdeas } from "../drizzle/schema";
import { titleUntitledIdeas } from "../server/lib/harvest-titles";
import { ENV } from "../server/_core/env";

/** Enough of a note to title it. More than this is wasted reading. */
const NOTE_CHARS = 280;

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function requireDb() {
  const db = await getDb();
  if (!db) {
    console.error("No database. Check DATABASE_URL.");
    process.exit(1);
  }
  return db;
}

function requireOwner(): number {
  const ownerId = ENV.ownerUserId;
  if (!ownerId) {
    console.error("OWNER_USER_ID is not set, so there is no one to title ideas for.");
    process.exit(1);
  }
  return ownerId;
}

const untitled = (ownerId: number) => and(
  eq(harvestIdeas.ownerId, ownerId),
  or(isNull(harvestIdeas.displayTitle), eq(harvestIdeas.displayTitle, "")),
);

/** Dump untitled ideas as JSONL, ripest first. */
async function exportNotes(file: string, cap: number) {
  const db = await requireDb();
  const ownerId = requireOwner();
  const rows = await db
    .select({ id: harvestIdeas.id, title: harvestIdeas.title, summary: harvestIdeas.summary })
    .from(harvestIdeas)
    .where(untitled(ownerId))
    .orderBy(desc(harvestIdeas.ripeness))
    .limit(Number.isFinite(cap) ? cap : 1000);

  const lines = rows.map((r) => JSON.stringify({
    id: r.id,
    note: (r.summary ?? r.title).replace(/\s+/g, " ").trim().slice(0, NOTE_CHARS),
  }));
  fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
  console.log(`Exported ${rows.length} untitled ideas to ${file}`);
}

/** Write hand-supplied titles back. Ignores ids that are already titled. */
async function applyTitles(file: string) {
  const db = await requireDb();
  const ownerId = requireOwner();

  const parsed: Array<{ id: number; title: string }> = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const row = JSON.parse(trimmed);
      const id = Number(row?.id);
      // House style: no em-dashes, no trailing period.
      const title = String(row?.title ?? "").trim().replace(/[—–]/g, ",").replace(/\.$/, "");
      if (Number.isFinite(id) && title) parsed.push({ id, title: title.slice(0, 300) });
    } catch {
      console.warn(`Skipping unparseable line: ${trimmed.slice(0, 80)}`);
    }
  }
  if (parsed.length === 0) {
    console.error("Nothing to apply.");
    process.exit(1);
  }

  // Only touch this owner's still-untitled rows, so a stale file cannot
  // overwrite titles that have since been written.
  const eligible = await db
    .select({ id: harvestIdeas.id })
    .from(harvestIdeas)
    .where(and(untitled(ownerId), inArray(harvestIdeas.id, parsed.map((p) => p.id))));
  const allowed = new Set(eligible.map((e) => e.id));

  let written = 0;
  for (const { id, title } of parsed) {
    if (!allowed.has(id)) continue;
    await db.update(harvestIdeas).set({ displayTitle: title }).where(eq(harvestIdeas.id, id));
    written += 1;
  }
  console.log(`Applied ${written} titles (${parsed.length - written} already titled or not yours).`);
}

/** The app's own path: light tier, twenty per call. */
async function runLLM(cap: number) {
  const db = await requireDb();
  const ownerId = requireOwner();

  const [{ n: remaining }] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(harvestIdeas)
    .where(untitled(ownerId));

  const target = Math.min(Number(remaining), cap);
  console.log(`${remaining} ideas without a display title. Titling ${target}.`);

  let done = 0;
  let emptyRounds = 0;
  while (done < target) {
    const written = await titleUntitledIdeas(ownerId, 20);
    if (written === 0) {
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
}

async function main() {
  const cap = process.argv.includes("--limit") ? Number(flag("--limit")) : Infinity;
  const exportTo = flag("--export");
  const applyFrom = flag("--apply");

  if (exportTo) await exportNotes(exportTo, cap);
  else if (applyFrom) await applyTitles(applyFrom);
  else await runLLM(cap);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
