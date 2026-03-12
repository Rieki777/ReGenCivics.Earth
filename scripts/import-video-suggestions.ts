/**
 * import-video-suggestions.ts — Import video_suggestions from CSV.
 * Usage: npx tsx scripts/import-video-suggestions.ts
 */
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import mysql from "mysql2/promise";

const CSV_PATH = path.join(process.cwd(), "scripts/data/video_suggestions_20260312_191733.csv");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

function parseDate(val: string | undefined): string | null {
  if (!val || val.trim() === "") return null;
  return val.replace(" ", "T");
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL!);
  let inserted = 0;
  let skipped = 0;

  const rl = readline.createInterface({ input: fs.createReadStream(CSV_PATH) });
  let headers: string[] = [];
  let isFirst = true;

  for await (const line of rl) {
    if (isFirst) {
      headers = line.split(",");
      isFirst = false;
      continue;
    }
    if (!line.trim()) continue;

    const cols = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h.trim()] = (cols[i] ?? "").trim().replace(/^"|"$/g, "")));

    // voterEmails may be a JSON array or comma-separated; normalize to JSON
    let voterEmailsJson: string | null = null;
    if (row.voterEmails) {
      try {
        JSON.parse(row.voterEmails); // already valid JSON
        voterEmailsJson = row.voterEmails;
      } catch {
        // comma-separated list
        const emails = row.voterEmails.split(",").map((e) => e.trim()).filter(Boolean);
        voterEmailsJson = JSON.stringify(emails);
      }
    }

    const validCategories = ["how_to_play", "how_to_participate", "how_to_invest", "how_to_apply", "how_to_contribute", "other"];
    const category = validCategories.includes(row.category) ? row.category : "other";

    const validStatuses = ["pending", "accepted", "completed", "rejected"];
    const status = validStatuses.includes(row.status) ? row.status : "pending";

    try {
      await conn.execute(
        `INSERT IGNORE INTO video_suggestions (id, title, description, category, submitterEmail, submitterName,
          voteCount, voterEmails, status, completedVideoUrl, completedBlogSlug, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parseInt(row.id),
          row.title || "Untitled",
          row.description || null,
          category,
          row.submitterEmail || null,
          row.submitterName || null,
          parseInt(row.voteCount ?? "0") || 0,
          voterEmailsJson,
          status,
          row.completedVideoUrl || null,
          row.completedBlogSlug || null,
          parseDate(row.createdAt),
          parseDate(row.updatedAt),
        ]
      );
      inserted++;
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        skipped++;
      } else {
        console.error(`Row ${row.id} error:`, err.message);
        skipped++;
      }
    }
  }

  await conn.end();
  console.log(`Video suggestions import complete: ${inserted} inserted, ${skipped} skipped.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
