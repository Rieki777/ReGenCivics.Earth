/**
 * Backfill unique handles for every user that doesn't have one yet.
 * Run after migration 0091_user_handles.sql.
 *
 * Usage: npx tsx scripts/backfill-handles.ts
 *
 * Standalone: connects directly via mysql2 so it doesn't need the full
 * server bundle's environment validation.
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

function slugify(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 38);
}

function isValid(h: string): boolean {
  return HANDLE_RE.test(h);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set. Aborting.");
    process.exit(1);
  }
  const parsed = new URL(url);
  const conn = await mysql.createConnection({
    host: parsed.hostname,
    port: parseInt(parsed.port || "3306"),
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1),
  });

  const [rows] = await conn.execute<any[]>(
    "SELECT id, name, email FROM users WHERE handle IS NULL"
  );
  console.log(`Found ${rows.length} users without a handle.`);

  let updated = 0;
  let errors = 0;

  for (const row of rows) {
    const baseFromName = slugify(row.name);
    const baseFromEmail = row.email ? slugify(String(row.email).split("@")[0]) : "";
    let base = baseFromName || baseFromEmail || `player-${row.id}`;
    if (!isValid(base)) base = `player-${row.id}`;

    let candidate = base;
    let suffix = 1;
    let chosen: string | null = null;

    while (suffix < 1000) {
      const [existing] = await conn.execute<any[]>(
        "SELECT id FROM users WHERE handle = ? LIMIT 1",
        [candidate]
      );
      if (existing.length === 0) {
        chosen = candidate;
        break;
      }
      suffix += 1;
      candidate = `${base}-${suffix}`.slice(0, 40);
    }

    if (!chosen) {
      console.error(`  user ${row.id}: ran out of suffix attempts, skipping`);
      errors += 1;
      continue;
    }

    try {
      await conn.execute("UPDATE users SET handle = ? WHERE id = ?", [chosen, row.id]);
      updated += 1;
      console.log(`  user ${row.id} (${row.name ?? "unnamed"}) -> @${chosen}`);
    } catch (err: any) {
      errors += 1;
      console.error(`  user ${row.id} failed: ${err.message}`);
    }
  }

  console.log("");
  console.log(`Done. ${updated} updated, ${errors} errors.`);
  await conn.end();
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
