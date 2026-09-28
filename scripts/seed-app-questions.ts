/**
 * seed-app-questions.ts
 *
 * Load each program's application questions from the gitignored
 * docs/private/app_questions_seed.json into app_questions (funding engine
 * Phase 1, drizzle/0277), creating the funder row when the pipeline lacks it.
 * The seed file is private because it sits beside strategy notes; this script
 * is public, its input is not.
 *
 * What it writes (server/funding/kitSeed.ts decides, and tests it):
 *   - a funder row for a program the pipeline does not have (500 Global,
 *     PearX, Techstars, Emergent Ventures when the kit was built);
 *   - on the funder row: track when unset, cycle, the deadline as a real
 *     instant with its source and check date, the application link when unset;
 *   - every question with its section, type, limits and verification.
 * What it never writes: appStatus, stage, owner, next action, notes, or any
 * draft. A question the portal dropped is removed only when it holds no draft.
 *
 * Usage:
 *   npx tsx scripts/seed-app-questions.ts            # dry run: report only
 *   npx tsx scripts/seed-app-questions.ts --write    # apply
 *   add --file <path> to read another seed file
 *
 * Requires DATABASE_URL (.env) and migration 0277.
 */
// First import on purpose: ES imports are hoisted, and the server modules
// below read the environment when they load.
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, inArray } from "drizzle-orm";
import { appQuestions, fundingPipeline } from "../drizzle/schema";
import {
  funderFor,
  planFunderInsert,
  planFunderUpdate,
  planQuestionRows,
  validateQuestionSeed,
  type QuestionSeedFile,
} from "../server/funding/kitSeed";

const write = process.argv.includes("--write");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.resolve(__dirname, "..", "docs", "private", "app_questions_seed.json");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = arg("--file") ?? DEFAULT_FILE;
  if (!fs.existsSync(file)) throw new Error(`Seed file not found: ${file}`);
  const seed = JSON.parse(fs.readFileSync(file, "utf8")) as QuestionSeedFile;
  const problems = validateQuestionSeed(seed);
  if (problems.length) {
    console.error(`[seed-app-questions] the seed file has ${problems.length} problem(s); nothing was read into the database:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (check .env)");
  const conn = await mysql.createConnection(url);
  const db = drizzle(conn);
  const today = new Date().toISOString().slice(0, 10);

  try {
    for (const program of seed.programs) {
      const funder = funderFor(program);
      if (!funder) continue; // validateQuestionSeed already refused this
      console.log(`\n${program.program} (${program.program_key}), ${program.questions.length} questions`);

      const [row] = await db.select().from(fundingPipeline).where(eq(fundingPipeline.name, funder.name)).limit(1);
      let pipelineId = -1;
      if (!row) {
        const insert = planFunderInsert(program, today, seed.generated_at);
        console.log(`  + funder row "${insert.name}" (${insert.category}), deadline ${insert.deadlineAt ? insert.deadlineAt.toISOString() : "none"}`);
        if (write) {
          const [created] = await db.insert(fundingPipeline).values(insert).$returningId();
          pipelineId = created.id;
        }
      } else {
        pipelineId = row.id;
        const { patch, deadline } = planFunderUpdate(program, row, seed.generated_at);
        const keys = Object.keys(patch);
        console.log(`  = funder row #${row.id} "${row.name}": ${keys.length ? `sets ${keys.join(", ")}` : "no change"}`);
        console.log(`    deadline: ${deadline.at ? `${deadline.at.toISOString()} (${deadline.note})` : `none (${deadline.kind}: ${deadline.note})`}`);
        if (write && keys.length) await db.update(fundingPipeline).set(patch).where(eq(fundingPipeline.id, row.id));
      }

      const rows = planQuestionRows(program, pipelineId);
      const existing = await db
        .select({ id: appQuestions.id, questionOrder: appQuestions.questionOrder, answerDraft: appQuestions.answerDraft })
        .from(appQuestions)
        .where(eq(appQuestions.programKey, program.program_key));
      const byOrder = new Map(existing.map((e) => [e.questionOrder, e]));

      let added = 0;
      let refreshed = 0;
      for (const r of rows) {
        const found = byOrder.get(r.questionOrder);
        if (found) {
          refreshed++;
          if (write) await db.update(appQuestions).set(r).where(eq(appQuestions.id, found.id));
        } else {
          added++;
          if (write) await db.insert(appQuestions).values(r);
        }
      }
      const inSeed = new Set(rows.map((r) => r.questionOrder));
      const dropped = existing.filter((e) => !inSeed.has(e.questionOrder));
      const removable = dropped.filter((e) => !e.answerDraft);
      const kept = dropped.filter((e) => e.answerDraft);
      if (write && removable.length) {
        await db.delete(appQuestions).where(inArray(appQuestions.id, removable.map((e) => e.id)));
      }
      console.log(`    questions: ${added} new, ${refreshed} refreshed, ${removable.length} removed${kept.length ? `, ${kept.length} kept because they hold a draft (orders ${kept.map((k) => k.questionOrder).join(", ")})` : ""}`);
    }
  } finally {
    await conn.end();
  }
  if (!write) console.log("\nDry run: nothing written. Add --write to apply.");
}

// Exit explicitly: the server modules open handles that keep the process alive.
main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error("[seed-app-questions] failed:", err);
    process.exit(1);
  });
