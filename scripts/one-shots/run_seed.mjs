import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL first');
  process.exit(1);
}

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const raw = readFileSync('drizzle/0099_seed_citizenship_trust_harvest.sql', 'utf8');

// Strip comment lines, then split on semicolons
const stripped = raw
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

const stmts = stripped
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 20);

console.log(`Found ${stmts.length} statements to run\n`);

let ok = 0, fail = 0;
for (const stmt of stmts) {
  try {
    const [result] = await conn.query(stmt);
    console.log(`OK (${result.affectedRows ?? 0} rows): ${stmt.substring(0, 70).replace(/\n/g, ' ')}...`);
    ok++;
  } catch (e) {
    console.error(`FAIL: ${e.message}`);
    console.error(`  -> ${stmt.substring(0, 100).replace(/\n/g, ' ')}`);
    fail++;
  }
}

console.log(`\nDone: ${ok} ok, ${fail} failed`);
await conn.end();
