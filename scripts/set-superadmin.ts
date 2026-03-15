/**
 * Set rieki.cordon@gmail.com as superadmin
 * Usage: npx tsx scripts/set-superadmin.ts [--dry-run]
 *
 * Run AFTER: pnpm db:push (to apply the superadmin enum change)
 */
import mysql from "mysql2/promise";

const DRY_RUN = process.argv.includes("--dry-run");
const TARGET_EMAIL = "rieki.cordon@gmail.com";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);

  // Check current role
  const [rows] = await conn.execute(
    "SELECT id, name, email, role FROM users WHERE email = ?",
    [TARGET_EMAIL]
  ) as any;

  if (!rows.length) {
    console.error(`No user found with email: ${TARGET_EMAIL}`);
    await conn.end();
    process.exit(1);
  }

  const user = rows[0];
  console.log(`Found user: ${user.name} (${user.email}) — current role: ${user.role}`);

  if (user.role === "superadmin") {
    console.log("Already superadmin. Nothing to do.");
    await conn.end();
    return;
  }

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would set role = 'superadmin' for user id=${user.id}`);
  } else {
    await conn.execute(
      "UPDATE users SET role = 'superadmin' WHERE id = ?",
      [user.id]
    );
    console.log(`Set role = 'superadmin' for ${user.email} (id=${user.id})`);
  }

  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
