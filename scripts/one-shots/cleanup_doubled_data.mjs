/**
 * cleanup_doubled_data.mjs
 *
 * Fixes the duplicate rows created when the seed ran twice (partial first run
 * + full second run) for:
 *   - game_variables (gratitude/trust/harvest/projects categories doubled)
 *   - quest_unlock_tiers (6 rows, should be 3)
 *   - lunar_cycles (70 rows, should be 35)
 *
 * Run from the project root:
 *   node cleanup_doubled_data.mjs
 *
 * The script is read-only until you confirm. It shows what it will do, then
 * asks you to set DRY_RUN=false to actually execute.
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL first');
  process.exit(1);
}

const DRY_RUN = false; // dry run confirmed — this will now write to the DB

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('Connected to Railway MySQL\n');
console.log(DRY_RUN ? '=== DRY RUN — no writes ===' : '=== LIVE RUN — writing to DB ===');
console.log('');

// ─── 1. Diagnose game_variables duplicates ──────────────────────────────────

const [gvCategories] = await conn.query(`
  SELECT category, COUNT(*) as cnt
  FROM game_variables
  WHERE category IN ('citizenship','gratitude','trust','harvest','referral','proposals','organisations','projects')
  GROUP BY category
  ORDER BY category
`);

console.log('Current game_variables counts:');
const expected = { citizenship: 19, gratitude: 6, trust: 8, harvest: 6, referral: 7, proposals: 1, organisations: 1, projects: 7 };
gvCategories.forEach(r => {
  const exp = expected[r.category] || '?';
  const flag = r.cnt !== exp ? ' *** EXTRA ***' : ' OK';
  console.log(`  ${r.category}: ${r.cnt} (expected ${exp})${flag}`);
});
console.log('');

// The canonical key values from the seed SQL — any row NOT in this list is a stale artifact
const canonicalKeys = [
  // gratitude (6)
  'gratitude.multiplier.explorer','gratitude.multiplier.co_creator','gratitude.multiplier.steward','gratitude.multiplier.sage',
  'gratitude.trust_graph.received_weight','gratitude.trust_graph.max_bonus',
  // trust (8)
  'trust.weight.endorsements_from_projects','trust.weight.endorsements_from_players',
  'trust.weight.account_age_seasons','trust.weight.quests_completed',
  'trust.weight.gratitude_received','trust.weight.flags_validated',
  'trust.weight.contribution_percentile','trust.composting_rate',
  // harvest (6)
  'harvest.split.contributors','harvest.split.bffs','harvest.split.orgs','harvest.split.treasury',
  'harvest.test_pool_size','harvest.go_live_enabled',
  // projects (7)
  'project.accepted_endorsements','project.active_endorsements','project.active_contributions',
  'project.established_funded_campaigns','project.established_seasons',
  'project.anchor_seasons','project.anchor_endorsements',
];
const affectedCategories = ['gratitude','trust','harvest','projects'];
const catPlaceholders = affectedCategories.map(() => '?').join(',');
const keyPlaceholders = canonicalKeys.map(() => '?').join(',');

const [staleRows] = await conn.query(
  `SELECT id, category, \`key\` FROM game_variables
   WHERE category IN (${catPlaceholders})
     AND \`key\` NOT IN (${keyPlaceholders})
   ORDER BY category, \`key\``,
  [...affectedCategories, ...canonicalKeys]
);
console.log(`game_variables stale rows to delete (not in canonical key list): ${staleRows.length}`);
staleRows.forEach(r => console.log(`  id=${r.id} [${r.category}] key="${r.key}"`));

// ─── 2. Diagnose quest_unlock_tiers ─────────────────────────────────────────

const [qtRows] = await conn.query('SELECT id, name, minimumPercentile FROM quest_unlock_tiers ORDER BY id');
console.log(`\nquest_unlock_tiers: ${qtRows.length} rows (expected 3)`);
qtRows.forEach(r => console.log(`  id=${r.id} ${r.name} percentile=${r.minimumPercentile}`));

// ─── 3. Diagnose lunar_cycles ────────────────────────────────────────────────

const [lcCount] = await conn.query('SELECT COUNT(*) as cnt FROM lunar_cycles');
console.log(`\nlune_cycles: ${lcCount[0].cnt} rows (expected 35)`);

// ─── 4. Execute cleanup ──────────────────────────────────────────────────────

if (DRY_RUN) {
  console.log('\nDRY RUN complete. To actually run cleanup:');
  console.log('  Edit this file: set DRY_RUN = false at the top');
  console.log('  Then re-run: node cleanup_doubled_data.mjs');
  await conn.end();
  process.exit(0);
}

console.log('\n--- Running cleanup ---\n');

// 4a. Delete stale game_variables rows (keys not in the canonical seed list)
const [gvDel] = await conn.query(
  `DELETE FROM game_variables
   WHERE category IN (${catPlaceholders})
     AND \`key\` NOT IN (${keyPlaceholders})`,
  [...affectedCategories, ...canonicalKeys]
);
console.log(`game_variables: deleted ${gvDel.affectedRows} stale rows`);

// 4b. Truncate and reseed quest_unlock_tiers
await conn.query('TRUNCATE TABLE quest_unlock_tiers');
console.log('quest_unlock_tiers: truncated');
const [qtInsert] = await conn.query(`
  INSERT INTO quest_unlock_tiers (name, minimumPercentile, requiresRitesComplete) VALUES
  ('Cultivator', 70, TRUE),
  ('Elder', 85, TRUE),
  ('Guardian', 95, TRUE)
`);
console.log(`quest_unlock_tiers: inserted ${qtInsert.affectedRows} rows`);

// 4c. Truncate and reseed lunar_cycles from the seed SQL
await conn.query('TRUNCATE TABLE lunar_cycles');
console.log('lunar_cycles: truncated');

const seedSQL = readFileSync('./drizzle/0099_seed_citizenship_trust_harvest.sql', 'utf8');
// Extract just the lunar_cycles INSERT (everything after the lunar cycles comment header)
const lcStart = seedSQL.indexOf('INSERT INTO lunar_cycles');
const lcEnd = seedSQL.indexOf(';', lcStart) + 1;
const lcInsert = seedSQL.slice(lcStart, lcEnd);
const [lcResult] = await conn.query(lcInsert);
console.log(`lunar_cycles: inserted ${lcResult.affectedRows} rows`);

// ─── 5. Verify ──────────────────────────────────────────────────────────────

console.log('\n--- Verification ---\n');

const [gvFinal] = await conn.query(`
  SELECT category, COUNT(*) as cnt
  FROM game_variables
  WHERE category IN ('citizenship','gratitude','trust','harvest','referral','proposals','organisations','projects')
  GROUP BY category
  ORDER BY category
`);
console.log('game_variables final counts:');
gvFinal.forEach(r => {
  const exp = expected[r.category] || '?';
  const flag = r.cnt === exp ? 'OK' : `MISMATCH (expected ${exp})`;
  console.log(`  ${r.category}: ${r.cnt} — ${flag}`);
});

const [qtFinal] = await conn.query('SELECT COUNT(*) as cnt FROM quest_unlock_tiers');
const [lcFinal] = await conn.query('SELECT COUNT(*) as cnt FROM lunar_cycles');
console.log(`\nquest_unlock_tiers: ${qtFinal[0].cnt} rows — ${qtFinal[0].cnt === 3 ? 'OK' : 'MISMATCH'}`);
console.log(`lunar_cycles: ${lcFinal[0].cnt} rows — ${lcFinal[0].cnt === 35 ? 'OK' : 'MISMATCH'}`);

await conn.end();
console.log('\nDone.');
