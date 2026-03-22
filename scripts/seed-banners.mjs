#!/usr/bin/env node
/**
 * Seed banner rows into siteBanners table.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE so it's safe to re-run.
 *
 * Run: DATABASE_URL=... node scripts/seed-banners.mjs
 */
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const banners = [
  { key: 'main-banner', title: 'Main Site Banner', content: '', isActive: 0 },
  { key: 'apply-banner', title: 'Apply Page Banner', content: '', isActive: 0 },
  { key: 'community-banner', title: 'Community Page Banner', content: '', isActive: 0 },
  { key: 'map-banner', title: 'Map Page Banner', content: '', isActive: 0 },
  {
    key: 'fund-launch-banner',
    title: 'Fund Launch Announcement Banner',
    content: '🌱 Fund Launches Late 2026 — Accepting Letters of Intent Now | [Investor Info →](/investor) or [Apply for Season 2](/seasons)',
    isActive: 1,
  },
];

let conn;
try {
  conn = await mysql.createConnection(DATABASE_URL);

  for (const b of banners) {
    await conn.execute(
      `INSERT INTO siteBanners (\`key\`, title, content, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content), isActive = VALUES(isActive), updatedAt = NOW()`,
      [b.key, b.title, b.content, b.isActive]
    );
    console.log(`  Seeded: ${b.key} (active: ${b.isActive ? 'yes' : 'no'})`);
  }

  console.log(`\nDone. ${banners.length} banner rows seeded.`);
} catch (err) {
  console.error('Failed:', err.message);
  process.exit(1);
} finally {
  if (conn) await conn.end();
}
