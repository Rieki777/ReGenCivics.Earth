// backfill-forum-threads.mjs
// Run with: DATABASE_URL=... node scripts/backfill-forum-threads.mjs [--dry-run] [--execute]

import mysql from 'mysql2/promise'

const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute')

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL)

  // Get all approved applications that don't have a forum post
  const [apps] = await conn.execute(`
    SELECT a.id, a.name, a.type, a.about, u.id as teamUserId
    FROM applications a
    JOIN users u ON u.email = 'team@regencivics.earth'
    WHERE a.status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM forumPosts fp
        WHERE fp.title = CONCAT('🏡 ', a.name)
           OR fp.title = CONCAT('🤝 ', a.name)
           OR fp.title = a.name
      )
  `)

  console.log(`Found ${apps.length} applications without forum threads`)

  for (const app of apps) {
    const emoji = app.type === 'land_project' ? '🏡' : '🤝'
    const categorySlug = app.type === 'land_project' ? 'active-projects' : 'alliance-partners'

    const [[category]] = await conn.execute(
      'SELECT id FROM forumCategories WHERE slug = ? LIMIT 1',
      [categorySlug]
    )
    if (!category) {
      console.log(`No category found for slug: ${categorySlug}, skipping ${app.name}`)
      continue
    }

    const title = `${emoji} ${app.name}`
    const body = app.about || `Welcome to the ${app.name} forum thread. Share updates, ask questions, and connect with the community.`

    console.log(`${dryRun ? '[DRY RUN] Would create' : 'Creating'}: "${title}" in ${categorySlug}`)

    if (!dryRun) {
      await conn.execute(
        'INSERT INTO forumPosts (title, content, authorId, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [title, body, app.teamUserId, category.id]
      )
    }
  }

  await conn.end()
  console.log('Done')
}

main().catch(console.error)
