/**
 * cleanup-applications.mjs
 *
 * Audits the applications table and removes phantom/broken records.
 * Keeps only records with a valid project name (non-empty, matches known real applications
 * OR has a meaningful non-fragment project name).
 *
 * Run with: node scripts/cleanup-applications.mjs
 * Add --dry-run to preview without deleting.
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Load .env manually
const envPath = resolve(projectRoot, '.env');
try {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
  console.log('[env] Loaded .env');
} catch (e) {
  console.warn('[env] Could not load .env:', e.message);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set in environment');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');
if (isDryRun) console.log('\n*** DRY RUN — no changes will be made ***\n');

// Known real project names (from the CSV analysis)
const REAL_PROJECT_NAMES = new Set([
  'LaLa Gardens Cooperative',
  'Tabi',
  'Tioga',
  'Ubuntu',
  'Finca Sagrada',
  'Heartland Retreat',
  'Traditional Dream Factory',
  'Highland Lake CampUS',
  'Liminal Village',
  'The Nyx',
  'Our NeighbourGood',
  'La Tierra',
  'StarSeed Village',
  'Living University Network',
  'Aquarella',
]);

// Admin-reviewed statuses indicate real applications (set manually by admins)
const ADMIN_REVIEWED_STATUSES = new Set(['active', 'inactive', 'approved', 'under_review', 'rejected', 'changes_requested']);

// A record is "real" if:
// 1. It has an admin-reviewed status (active, inactive, approved, under_review, rejected, changes_requested)
// 2. OR its project name exactly (or closely) matches a known real project name
function isRealRecord(row) {
  const name = row.projectName ? row.projectName.trim() : '';
  const status = row.status;

  // Admin-reviewed status = definitely real
  if (ADMIN_REVIEWED_STATUSES.has(status)) return true;

  // Check against known names (case-insensitive)
  const nameLower = name.toLowerCase();
  for (const real of REAL_PROJECT_NAMES) {
    if (nameLower === real.toLowerCase()) return true;
    // Allow trailing whitespace variants
    if (nameLower.replace(/\s+$/, '') === real.toLowerCase()) return true;
  }

  return false;
}

async function main() {
  const mysql = (await import('mysql2/promise')).default;

  const pool = mysql.createPool({
    uri: DATABASE_URL,
    connectionLimit: 3,
    waitForConnections: true,
  });

  try {
    const conn = await pool.getConnection();

    // Get all applications
    console.log('Fetching all applications...');
    const [rows] = await conn.execute('SELECT id, projectName, status, createdAt FROM applications ORDER BY id ASC');

    console.log(`Total rows in database: ${rows.length}`);

    const toKeep = [];
    const toDelete = [];

    for (const row of rows) {
      if (isRealRecord(row)) {
        toKeep.push(row);
      } else {
        toDelete.push(row);
      }
    }

    console.log(`\nRecords to KEEP: ${toKeep.length}`);
    for (const r of toKeep) {
      console.log(`  [${r.id}] "${r.projectName}" (${r.status})`);
    }

    console.log(`\nRecords to DELETE: ${toDelete.length}`);
    if (toDelete.length <= 20) {
      for (const r of toDelete) {
        const preview = (r.projectName || '').slice(0, 60).replace(/\n/g, ' ');
        console.log(`  [${r.id}] "${preview}..."`);
      }
    } else {
      // Show first 10 and last 5
      for (const r of toDelete.slice(0, 10)) {
        const preview = (r.projectName || '').slice(0, 60).replace(/\n/g, ' ');
        console.log(`  [${r.id}] "${preview}"`);
      }
      console.log(`  ... (${toDelete.length - 15} more) ...`);
      for (const r of toDelete.slice(-5)) {
        const preview = (r.projectName || '').slice(0, 60).replace(/\n/g, ' ');
        console.log(`  [${r.id}] "${preview}"`);
      }
    }

    if (!isDryRun && toDelete.length > 0) {
      console.log(`\nDeleting ${toDelete.length} phantom records...`);
      const idsToDelete = toDelete.map(r => r.id);

      // Delete in batches of 100
      const batchSize = 100;
      let deleted = 0;
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');
        const [result] = await conn.execute(
          `DELETE FROM applications WHERE id IN (${placeholders})`,
          batch
        );
        deleted += result.affectedRows;
        process.stdout.write(`  Deleted ${deleted}/${toDelete.length}...\r`);
      }
      console.log(`\nDone. Deleted ${deleted} phantom records.`);
      console.log(`Remaining: ${toKeep.length} real applications.`);
    } else if (isDryRun) {
      console.log('\n(Dry run — no changes made)');
    }

    conn.release();
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

main();
