/**
 * _check-schema.ts -- show columns for key tables + list users + application status breakdown
 */
import * as mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // Users
  // Users columns first
  const [ucols] = await conn.execute(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' ORDER BY ORDINAL_POSITION"
  ) as any;
  console.log("\n=== users columns ===");
  console.log(ucols.map((c: any) => c.COLUMN_NAME).join(", "));

  const [users] = await conn.execute(
    "SELECT * FROM users ORDER BY id ASC LIMIT 20"
  ) as any;
  console.log("\n=== Users ===");
  for (const u of users) console.log(JSON.stringify(u));

  // Applications columns
  const [cols] = await conn.execute(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='applications' ORDER BY ORDINAL_POSITION"
  ) as any;
  console.log("\n=== applications columns ===");
  console.log(cols.map((c: any) => c.COLUMN_NAME).join(", "));

  // Application counts
  const [counts] = await conn.execute(
    "SELECT status, COUNT(*) as count FROM applications GROUP BY status ORDER BY count DESC"
  ) as any;
  console.log("\n=== Application counts by status ===");
  for (const r of counts) console.log(`  ${r.status}: ${r.count}`);

  // Land projects table check
  const [tables] = await conn.execute(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME"
  ) as any;
  console.log("\n=== All tables ===");
  console.log(tables.map((t: any) => t.TABLE_NAME).join(", "));

  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
