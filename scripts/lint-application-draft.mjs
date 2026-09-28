/**
 * Lint an application draft before anyone pastes it into a portal.
 *
 * Funding engine, Phase 1 (application kit). The rules live in
 * shared/applicationLint.mjs (limits, dashes, AI words, numbers) and
 * shared/g5Rules.mjs (G5 and retired claims), the same rulebook the site gate
 * and the admin packet view use. This file reads a draft and prints a report.
 *
 * Draft format: markdown with one heading per answered question, numbered by the
 * question's `order` in the program's question list:
 *
 *   ## 12
 *   Our answer...
 *
 *   ## Q13. What is your traction?      (the text after the number is ignored)
 *   > notes or the pasted question      (lines starting with ">" are not counted)
 *   Our answer...
 *
 * Questions come from a JSON file shaped like docs/private/app_questions_seed.json
 * (gitignored). Confirmed numbers come from --metrics <json> (an array of
 * {label, display|value} or the metrics.list shape) or, with --metrics-db, from
 * the confirmed rows of the metrics table via DATABASE_URL.
 *
 * Usage:
 *   node scripts/lint-application-draft.mjs --program pearx_w27 --draft path/to/pearx.md
 *   node scripts/lint-application-draft.mjs --program pearx_w27 --draft d.md --questions q.json --metrics-db
 *   add --json for machine output
 *
 * Exit code 1 when any answer breaks a hard rule: over a character or word
 * limit, a G5 phrase, a retired claim, or an em-dash or en-dash. Unconfirmed
 * numbers, AI words and contrast framing are warnings.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  AI_WORDS,
  CONTRAST_PATTERNS,
  charCount,
  confirmedNumberSet,
  extractNumbers,
  lintAnswer,
  normalizeNumber,
  parseDraft,
  wordCount,
} from "../shared/applicationLint.mjs";

export {
  AI_WORDS,
  CONTRAST_PATTERNS,
  charCount,
  confirmedNumberSet,
  extractNumbers,
  lintAnswer,
  normalizeNumber,
  parseDraft,
  wordCount,
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const DEFAULT_QUESTIONS = path.join(REPO, "docs", "private", "app_questions_seed.json");

async function loadMetricsFromDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("--metrics-db needs DATABASE_URL");
  const mysql = (await import("mysql2/promise")).default;
  const conn = await mysql.createConnection(url);
  try {
    const [rows] = await conn.query(
      "SELECT label, displayValue, valueNumeric FROM metrics WHERE confirmedAt IS NOT NULL",
    );
    return rows;
  } finally {
    await conn.end();
  }
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const programKey = arg("--program");
  const draftPath = arg("--draft");
  const questionsPath = arg("--questions") ?? DEFAULT_QUESTIONS;
  const asJson = process.argv.includes("--json");
  if (!programKey || !draftPath) {
    console.error("Usage: node scripts/lint-application-draft.mjs --program <program_key> --draft <file.md> [--questions q.json] [--metrics m.json | --metrics-db] [--json]");
    process.exit(2);
  }
  if (!existsSync(questionsPath)) {
    console.error(`Question list not found: ${questionsPath}`);
    process.exit(2);
  }
  const seed = JSON.parse(readFileSync(questionsPath, "utf8"));
  const program = (seed.programs ?? []).find((p) => p.program_key === programKey);
  if (!program) {
    console.error(`No program "${programKey}". Known: ${(seed.programs ?? []).map((p) => p.program_key).join(", ")}`);
    process.exit(2);
  }

  let metricRows = [];
  if (process.argv.includes("--metrics-db")) metricRows = await loadMetricsFromDb();
  else if (arg("--metrics")) metricRows = JSON.parse(readFileSync(arg("--metrics"), "utf8"));
  const confirmed = confirmedNumberSet(metricRows);

  const answers = parseDraft(readFileSync(draftPath, "utf8"));
  const results = [];
  for (const q of program.questions) {
    const answer = answers.get(q.order);
    if (answer === undefined || answer === "") {
      if (q.required) results.push({ order: q.order, question: q.text, missing: true, errors: [], warnings: ["required question has no answer"] });
      continue;
    }
    results.push({ order: q.order, question: q.text, char_limit: q.char_limit, word_limit: q.word_limit, ...lintAnswer(q, answer, confirmed) });
  }
  for (const order of answers.keys()) {
    if (!program.questions.some((q) => q.order === order)) {
      results.push({ order, question: "(no such question)", errors: [`heading ## ${order} matches no question in ${programKey}`], warnings: [] });
    }
  }
  results.sort((a, b) => a.order - b.order);

  const errorCount = results.reduce((n, r) => n + r.errors.length, 0);
  const warningCount = results.reduce((n, r) => n + r.warnings.length, 0);
  if (asJson) {
    console.log(JSON.stringify({ program: programKey, errors: errorCount, warnings: warningCount, confirmedNumbers: confirmed.size, results }, null, 2));
  } else {
    console.log(`${program.program}: ${answers.size} answers checked against ${program.questions.length} questions.`);
    if (!metricRows.length) console.log("No confirmed metrics loaded: every number is reported as unconfirmed. Use --metrics-db or --metrics.");
    // Unanswered required questions go on one line: a partial draft would
    // otherwise bury its real errors under one block per empty question.
    const missing = results.filter((r) => r.missing);
    for (const r of results) {
      if (r.missing || (!r.errors.length && !r.warnings.length)) continue;
      const limit = r.char_limit ? ` [${r.chars}/${r.char_limit} chars]` : r.word_limit ? ` [${r.words}/${r.word_limit} words]` : "";
      console.log(`\n#${r.order} ${String(r.question).slice(0, 80)}${limit}`);
      for (const e of r.errors) console.log(`  x ${e}`);
      for (const w of r.warnings) console.log(`  ! ${w}`);
    }
    if (missing.length) console.log(`\nRequired with no answer (${missing.length}): ${missing.map((r) => `#${r.order}`).join(", ")}`);
    console.log(`\n${errorCount} error(s), ${warningCount - missing.length} warning(s), ${missing.length} required question(s) with no answer.`);
  }
  process.exit(errorCount > 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}
