// seed-banners.mjs
// Run with: DATABASE_URL=... node scripts/seed-banners.mjs

import mysql from 'mysql2/promise'

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL)

  // siteBanners schema: id, key (unique), title, content, isActive (boolean/tinyint), displayStartDate, displayEndDate, createdAt, updatedAt
  const banners = [
    {
      key: 'main-banner',
      title: 'Global (all pages)',
      content: '',
      isActive: 0,
    },
    {
      key: 'apply-banner',
      title: 'Apply Page Banner',
      content: '',
      isActive: 0,
    },
    {
      key: 'community-banner',
      title: 'Community Page Banner',
      content: '',
      isActive: 0,
    },
    {
      key: 'map-banner',
      title: 'Map Page Banner',
      content: '',
      isActive: 0,
    },
    {
      key: 'fund-launch-banner',
      title: 'Fund Launch Announcement',
      content: '🌱 Fund Launches Late 2026, Accepting Letters of Intent Now | [Investor Info](/investor) or [Apply for Season 2](/seasons)',
      isActive: 1,
    },
  ]

  for (const banner of banners) {
    await conn.execute(
      `INSERT INTO siteBanners (\`key\`, title, content, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW()`,
      [banner.key, banner.title, banner.content, banner.isActive]
    )
    console.log(`Seeded: ${banner.key}`)
  }

  await conn.end()
  console.log('Done')
}

main().catch(console.error)
