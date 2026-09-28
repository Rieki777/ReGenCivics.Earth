/**
 * seed-funding-prompts.ts
 *
 * Load the private positioning kernel (and, if present, a Cowork template) into
 * funding_prompts as a new active version. The texts live in a gitignored
 * folder, never in the repo: the kernel names funders and internal strategy
 * (plan P0-7, 2026-09-27). This script is public; its input is not.
 *
 * Reads, when present:
 *   docs/private/kernel/positioning_kernel.md  -> promptKey "positioning_kernel"
 *   docs/private/kernel/cowork_template.md     -> promptKey "cowork_template"
 *
 * Idempotent: a file identical to the active version saves nothing. Every save
 * is a new version; older versions stay for comparison and rollback in
 * /admin/funding (Kernel).
 *
 * Usage:
 *   npx tsx scripts/seed-funding-prompts.ts             # save changed texts
 *   npx tsx scripts/seed-funding-prompts.ts --dry-run   # report only
 *
 * Requires DATABASE_URL (.env). Needs migration 0275 applied.
 */
// First import on purpose: server/funding/prompts pulls in the server env
// check, and ES imports are hoisted, so a dotenv.config() call would run too late.
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { savePromptVersion, type PromptKey } from "../server/funding/prompts";

const isDryRun = process.argv.includes("--dry-run");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(__dirname, "..", "docs", "private", "kernel");

const FILES: Array<{ key: PromptKey; file: string }> = [
  { key: "positioning_kernel", file: "positioning_kernel.md" },
  { key: "cowork_template", file: "cowork_template.md" },
];

async function main() {
  const found = FILES.map((f) => ({ ...f, full: path.join(DIR, f.file) })).filter((f) => fs.existsSync(f.full));
  if (found.length === 0) {
    console.log(`[seed-funding-prompts] nothing to seed: no files in ${DIR}`);
    return;
  }
  for (const f of found) {
    const body = fs.readFileSync(f.full, "utf8");
    console.log(`[seed-funding-prompts] ${f.key}: ${body.length} chars from ${f.file}`);
  }
  if (isDryRun) {
    console.log("[seed-funding-prompts] --dry-run: no database writes");
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (check .env)");
  const conn = await mysql.createConnection(url);
  try {
    const db = drizzle(conn) as unknown as Parameters<typeof savePromptVersion>[0];
    for (const f of found) {
      const body = fs.readFileSync(f.full, "utf8");
      const { row, created } = await savePromptVersion(db, f.key, body, { note: `seeded from ${f.file}` });
      console.log(
        `[seed-funding-prompts] ${f.key}: ${created ? `saved version ${row.version}` : `unchanged (version ${row.version} is active)`}`,
      );
    }
  } finally {
    await conn.end();
  }
}

// Exit explicitly: importing the server modules opens handles (the shared DB
// pool, cache clients) that would otherwise keep the process alive.
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed-funding-prompts] failed:", err);
    process.exit(1);
  });
