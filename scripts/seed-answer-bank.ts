/**
 * seed-answer-bank.ts
 *
 * Load the starter answers (plan v1.3 section 5) from the gitignored
 * docs/private/answer_bank_seed.json into answer_bank as drafts (funding
 * engine Phase 1). Every answer arrives as a draft: Rye edits and approves in
 * /admin/funding (Answer bank), and approval is refused while an answer still
 * carries a [VERIFY] or [DECIDE] placeholder, a dash, or a G5 phrase.
 *
 * An answer that already exists is left alone, so re-running never undoes
 * Rye's edits. --update-drafts refreshes bodies only on answers still in
 * draft; an approved answer is never touched by a seed.
 *
 * Seed file shape:
 *   { "answers": [ { "slug": "what-we-do", "canonical_question": "...",
 *       "tags": ["company"], "bodies": { "short": "...", "150": "...", "500": "...", "long": "..." },
 *       "source_refs": ["land_projects_applied"], "notes": "...", "sort_order": 10 } ] }
 *
 * Usage:
 *   npx tsx scripts/seed-answer-bank.ts                    # dry run: report only
 *   npx tsx scripts/seed-answer-bank.ts --write            # insert missing answers
 *   npx tsx scripts/seed-answer-bank.ts --write --update-drafts
 *
 * Requires DATABASE_URL (.env) and migration 0277.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { and, eq } from "drizzle-orm";
import { answerBank } from "../drizzle/schema";
import { lintAnswer } from "../shared/applicationLint.mjs";
import { ANSWER_VARIANTS, VARIANT_TARGET_CHARS, saveAnswer, type AnswerVariant } from "../server/funding/kit";

const write = process.argv.includes("--write");
const updateDrafts = process.argv.includes("--update-drafts");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.resolve(__dirname, "..", "docs", "private", "answer_bank_seed.json");

interface SeedAnswer {
  slug: string;
  canonical_question: string;
  tags?: string[];
  bodies: Partial<Record<AnswerVariant, string>>;
  source_refs?: string[];
  notes?: string;
  sort_order?: number;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = arg("--file") ?? DEFAULT_FILE;
  if (!fs.existsSync(file)) throw new Error(`Seed file not found: ${file}`);
  const seed = JSON.parse(fs.readFileSync(file, "utf8")) as { answers: SeedAnswer[] };
  const problems: string[] = [];
  const slugs = new Set<string>();
  for (const a of seed.answers ?? []) {
    if (!/^[a-z0-9-]+$/.test(a.slug ?? "")) problems.push(`bad slug: ${JSON.stringify(a.slug)}`);
    if (slugs.has(a.slug)) problems.push(`duplicate slug: ${a.slug}`);
    slugs.add(a.slug);
    if (!a.canonical_question) problems.push(`${a.slug}: no canonical_question`);
    if (!ANSWER_VARIANTS.some((v) => a.bodies?.[v])) problems.push(`${a.slug}: no body`);
  }
  if (problems.length) {
    console.error("[seed-answer-bank] the seed file has problems; nothing was written:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (check .env)");
  const conn = await mysql.createConnection(url);
  const db = drizzle(conn) as unknown as Parameters<typeof saveAnswer>[0];
  try {
    for (const a of seed.answers) {
      const lintNotes = ANSWER_VARIANTS.flatMap((v) => {
        const body = a.bodies[v];
        if (!body) return [];
        const r = lintAnswer({ charLimit: VARIANT_TARGET_CHARS[v] }, body);
        return r.errors.length ? [`${v}: ${r.errors.length} to fix before approval`] : [];
      });
      const [existing] = await db
        .select()
        .from(answerBank)
        .where(and(eq(answerBank.projectId, 0), eq(answerBank.slug, a.slug)))
        .limit(1);
      const input = {
        id: existing?.id,
        projectId: 0,
        slug: a.slug,
        canonicalQuestion: a.canonical_question,
        tags: a.tags ?? null,
        bodies: a.bodies,
        sourceRefs: a.source_refs ?? null,
        notes: a.notes ?? null,
        sortOrder: a.sort_order ?? 0,
      };
      if (!existing) {
        console.log(`  + ${a.slug}${lintNotes.length ? `  (${lintNotes.join("; ")})` : ""}`);
        if (write) await saveAnswer(db, input, null, "seed");
      } else if (updateDrafts && existing.status === "draft") {
        console.log(`  ~ ${a.slug}: draft refreshed from the seed`);
        if (write) await saveAnswer(db, input, null, "seed");
      } else {
        console.log(`  = ${a.slug}: exists (${existing.status}); not touched`);
      }
    }
  } finally {
    await conn.end();
  }
  if (!write) console.log("\nDry run: nothing written. Add --write to apply.");
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error("[seed-answer-bank] failed:", err);
    process.exit(1);
  });
