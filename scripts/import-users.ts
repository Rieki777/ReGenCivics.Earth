/**
 * import-users.ts — Import users from CSV into the users table.
 * Usage: npx tsx scripts/import-users.ts
 */
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import mysql from "mysql2/promise";

const CSV_PATH = path.join(process.cwd(), "scripts/data/users_20260312_191542.csv");
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
    headers.forEach((h, i) => (row[h.trim()] = (cols[i] ?? "").trim()));

    try {
      await conn.execute(
        `INSERT IGNORE INTO users (id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parseInt(row.id),
          row.openId,
          row.name || null,
          row.email || null,
          row.loginMethod || null,
          (row.role === "admin" ? "admin" : "user") as "user" | "admin",
          parseDate(row.createdAt),
          parseDate(row.updatedAt),
          parseDate(row.lastSignedIn),
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
  console.log(`Users import complete: ${inserted} inserted, ${skipped} skipped.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
