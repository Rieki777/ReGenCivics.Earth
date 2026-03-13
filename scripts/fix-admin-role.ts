/**
 * fix-admin-role.ts — Sets a user's role to 'admin' by email address.
 *
 * Usage (Windows PowerShell — run from project root):
 *
 *   $env = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
 *   foreach ($line in $env) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v) }
 *   $Env:TARGET_EMAIL="your@email.com"; npx tsx scripts/fix-admin-role.ts
 *
 * Or inline:
 *   $Env:DATABASE_URL="mysql://..."; $Env:TARGET_EMAIL="your@email.com"; npx tsx scripts/fix-admin-role.ts
 *
 * What it does:
 *  1. Looks up the user by email
 *  2. Prints their current role and open_id
 *  3. Updates their role to 'admin'
 *  4. Prints their new open_id — copy this into OWNER_OPEN_ID in Railway
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
const TARGET_EMAIL = process.env.TARGET_EMAIL;

if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL environment variable is required.");
  process.exit(1);
}
if (!TARGET_EMAIL) {
  console.error("❌  TARGET_EMAIL environment variable is required.");
  console.error("    Set it to your login email, e.g.: $Env:TARGET_EMAIL=\"you@gmail.com\"");
  process.exit(1);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL!);
  console.log("✅  Connected to DB.\n");

  // Find user by email
  // Note: column name is openId (camelCase) as defined in drizzle/schema.ts
  const [rows] = await conn.execute<any[]>(
    "SELECT id, email, role, openId FROM users WHERE email = ?",
    [TARGET_EMAIL]
  );

  if (rows.length === 0) {
    console.error(`❌  No user found with email: ${TARGET_EMAIL}`);
    console.error("    Make sure you have logged into the site at least once first.");
    await conn.end();
    process.exit(1);
  }

  const user = rows[0];
  console.log("Found user:");
  console.log(`  id:      ${user.id}`);
  console.log(`  email:   ${user.email}`);
  console.log(`  role:    ${user.role}`);
  console.log(`  openId:  ${user.openId}`);

  if (user.role === "admin") {
    console.log("\n✅  User already has role='admin'. No change needed.");
    console.log(`\n👉  Set OWNER_OPEN_ID in Railway to: ${user.openId}`);
    await conn.end();
    return;
  }

  // Update to admin
  await conn.execute("UPDATE users SET role = 'admin' WHERE id = ?", [user.id]);
  console.log(`\n✅  Updated role to 'admin' for user id=${user.id}`);
  console.log(`\n👉  Now set OWNER_OPEN_ID in Railway to: ${user.openId}`);
  console.log("    This ensures future logins keep you as admin automatically.\n");

  await conn.end();
}

main().catch((e) => {
  console.error("❌  DB error:", e.message);
  process.exit(1);
});
