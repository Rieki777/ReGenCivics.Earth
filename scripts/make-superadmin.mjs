/**
 * ⚠️ DANGER: PRIVILEGE-GRANTING SCRIPT. Writes role='superadmin' directly to
 * whatever database DATABASE_URL points at, with no prompt and no dry-run.
 * Check DATABASE_URL twice before running. Prefer scripts/set-superadmin.ts,
 * which has a --dry-run flag.
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [result] = await conn.execute(
  "UPDATE users SET role = 'superadmin' WHERE email = 'rieki.cordon@gmail.com'"
);
console.log('Updated rows:', result.affectedRows);
if (result.affectedRows === 0) {
  const [users] = await conn.execute("SELECT id, email, role FROM users WHERE email LIKE '%rieki%'");
  console.log('Found users:', users);
}
await conn.end();
