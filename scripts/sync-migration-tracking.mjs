/**
 * One-shot: mark every drizzle/NNNN_*.sql migration as applied in
 * `_migrations_applied`. Used to back-fill the runner's tracking table
 * after migrations were applied via drizzle-kit push or manual SQL.
 *
 * Idempotent: INSERT IGNORE skips existing rows.
 */
import * as dotenv from "dotenv";
import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";

dotenv.config();
const url = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || "3306"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
});

await conn.execute(`
  CREATE TABLE IF NOT EXISTS _migrations_applied (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    appliedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    statementsRun INT DEFAULT 0
  )
`);

const dir = path.resolve("drizzle");
const files = fs
  .readdirSync(dir)
  .filter((f) => /^\d{4}.*\.sql$/.test(f))
  .sort();

let inserted = 0;
let skipped = 0;
for (const f of files) {
  const [result] = await conn.execute(
    "INSERT IGNORE INTO _migrations_applied (filename, statementsRun) VALUES (?, ?)",
    [f, 0]
  );
  if ((result).affectedRows > 0) {
    inserted++;
    console.log(`  + ${f}`);
  } else {
    skipped++;
  }
}
console.log(`\nResults: ${inserted} marked applied, ${skipped} already tracked`);
await conn.end();
