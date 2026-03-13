/**
 * check-db.ts — Diagnoses DB state: users, their roles, and application counts.
 *
 * Usage (Windows PowerShell — run from project root):
 *
 *   $env = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
 *   foreach ($line in $env) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v) }
 *   npx tsx scripts/check-db.ts
 *
 * Or inline:
 *   $Env:DATABASE_URL="mysql://..."; npx tsx scripts/check-db.ts
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL environment variable is required.");
  process.exit(1);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL!);

  console.log("✅  Connected to DB.\n");

  // --- Users ---
  const [users] = await conn.execute<any[]>(
    "SELECT id, email, role, openId, createdAt FROM users ORDER BY createdAt DESC LIMIT 20"
  );
  console.log("=== USERS (most recent first) ===");
  if (users.length === 0) {
    console.log("  (no users found)");
  } else {
    users.forEach((u) =>
      console.log(`  id=${u.id}  role=${u.role}  email=${u.email}  openId=${u.openId}`)
    );
  }

  // --- Applications ---
  const [counts] = await conn.execute<any[]>(
    "SELECT status, COUNT(*) AS count FROM applications GROUP BY status ORDER BY count DESC"
  );
  console.log("\n=== APPLICATIONS BY STATUS ===");
  if (counts.length === 0) {
    console.log("  (no applications found)");
  } else {
    counts.forEach((c) => console.log(`  ${c.status}: ${c.count}`));
  }

  // --- Total ---
  const [total] = await conn.execute<any[]>("SELECT COUNT(*) AS total FROM applications");
  console.log(`\n  TOTAL: ${total[0].total} application(s)`);

  await conn.end();
}

main().catch((e) => {
  console.error("❌  DB error:", e.message);
  process.exit(1);
});
