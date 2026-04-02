import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const conn = await mysql.createConnection(
  'mysql://root:RAILWAY_PASSWORD_REDACTED@nozomi.proxy.rlwy.net:46413/railway'
);

const raw = readFileSync('./drizzle/0100_seed_citizenship_powers.sql', 'utf8');
const stripped = raw.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
const stmts = stripped.split(';').map(s => s.trim()).filter(s => s.length > 20);

console.log(`Found ${stmts.length} statements\n`);
let ok = 0, fail = 0;
for (const stmt of stmts) {
  try {
    const [result] = await conn.query(stmt);
    console.log(`OK (${result.affectedRows ?? 0} rows): ${stmt.substring(0, 70).replace(/\n/g, ' ')}...`);
    ok++;
  } catch (e) { console.error(`FAIL: ${e.message}\n  ${stmt.substring(0, 120)}`); fail++; }
}
console.log(`\nDone: ${ok} ok, ${fail} failed`);

// Verify
const [cats] = await conn.query(`
  SELECT category, COUNT(*) as cnt FROM game_variables
  WHERE category IN ('citizenship','food_economy')
  GROUP BY category ORDER BY category
`);
console.log('\nVerification:');
const expected = { citizenship: 56, food_economy: 2 };
cats.forEach(r => {
  const exp = expected[r.category];
  console.log(`  ${r.category}: ${r.cnt} (expected ${exp}) ${r.cnt === exp ? 'OK' : '*** MISMATCH ***'}`);
});

await conn.end();
