/**
 * import-application-draft.ts
 *
 * Load a draft written in Cowork into a program's packet, so Rye sees every
 * answer in /admin/funding with its live count and lint (funding engine
 * Phase 1). The draft is the same markdown the draft linter reads: one
 * "## <order>" heading per answer, lines starting with ">" ignored
 * (docs/private/APPLICATION_KIT.md).
 *
 * Each changed answer becomes a new version; an unchanged one writes nothing.
 * Nothing is submitted anywhere. Keep the answers as submitted by importing
 * the final draft with --source import --note "as submitted ...": the version
 * history holds them after later edits.
 *
 * Usage:
 *   npx tsx scripts/import-application-draft.ts --program pearx_w27 --draft docs/private/drafts/pearx_w27.md
 *   ... --write                                  # apply (default is a dry run)
 *   ... --source import --note "as submitted 2026-10-04"
 *
 * Requires DATABASE_URL (.env), migration 0277 and the program's questions
 * (scripts/seed-app-questions.ts).
 */
import "dotenv/config";
import * as fs from "fs";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { asc, eq } from "drizzle-orm";
import { appQuestions } from "../drizzle/schema";
import { lintAnswer, parseDraft } from "../shared/applicationLint.mjs";
import { confirmedNumbers, normalizeBody, saveQuestionDraft } from "../server/funding/kit";

const write = process.argv.includes("--write");
const SOURCES = ["cowork", "import", "rye"] as const;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const programKey = arg("--program");
  const draftPath = arg("--draft");
  const source = (arg("--source") ?? "cowork") as (typeof SOURCES)[number];
  const note = arg("--note") ?? null;
  if (!programKey || !draftPath) {
    console.error('Usage: npx tsx scripts/import-application-draft.ts --program <program_key> --draft <file.md> [--write] [--source cowork|import|rye] [--note "..."]');
    process.exit(2);
  }
  if (!SOURCES.includes(source)) throw new Error(`--source must be one of ${SOURCES.join(", ")}`);
  if (!fs.existsSync(draftPath)) throw new Error(`Draft not found: ${draftPath}`);

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (check .env)");
  const conn = await mysql.createConnection(url);
  const db = drizzle(conn) as unknown as Parameters<typeof saveQuestionDraft>[0];
  try {
    const questions = await db
      .select()
      .from(appQuestions)
      .where(eq(appQuestions.programKey, programKey))
      .orderBy(asc(appQuestions.questionOrder));
    if (!questions.length) throw new Error(`No questions for ${programKey}. Run scripts/seed-app-questions.ts --write first.`);
    const byOrder = new Map(questions.map((q) => [q.questionOrder, q]));
    const confirmed = await confirmedNumbers(db);
    const answers = parseDraft(fs.readFileSync(draftPath, "utf8"));

    let changed = 0;
    let errors = 0;
    for (const [order, text] of answers) {
      const q = byOrder.get(order);
      if (!q) {
        console.log(`  ? ## ${order} matches no question in ${programKey}; skipped`);
        continue;
      }
      const body = normalizeBody(text);
      const lint = lintAnswer({ charLimit: q.charLimit, wordLimit: q.wordLimit }, body, confirmed);
      const same = (q.answerDraft ?? "") === body;
      if (!same) changed++;
      errors += lint.errors.length;
      const limit = q.charLimit ? ` ${lint.chars}/${q.charLimit} chars` : q.wordLimit ? ` ${lint.words}/${q.wordLimit} words` : "";
      console.log(`  ${same ? "=" : "~"} #${order}${limit}${lint.errors.length ? `  x ${lint.errors.join("; ")}` : ""}`);
      if (write && !same) {
        await saveQuestionDraft(db, { questionId: q.id, body, source, note });
      }
    }
    console.log(`\n${answers.size} answers read, ${changed} changed, ${errors} lint error(s).`);
    if (!write) console.log("Dry run: nothing written. Add --write to save the changed answers.");
  } finally {
    await conn.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[import-application-draft] failed:", err);
    process.exit(1);
  });
