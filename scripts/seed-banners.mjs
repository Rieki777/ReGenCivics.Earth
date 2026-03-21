#!/usr/bin/env node
/**
 * Seed banner content into the DB.
 * Run: DATABASE_URL=... node scripts/seed-banners.mjs
 */
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

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

const conn = await mysql.createConnection(DATABASE_URL);
// Table: siteBanners — columns: key, title, content, isActive, createdAt, updatedAt
for (const banner of banners) {
  await conn.execute(
    `INSERT INTO siteBanners (\`key\`, title, content, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content), isActive = VALUES(isActive), updatedAt = NOW()`,
    [banner.key, banner.title, banner.content, banner.isActive]
  );
  console.log('Seeded:', banner.key);
}
await conn.end();
console.log('Done.');
