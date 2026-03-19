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
