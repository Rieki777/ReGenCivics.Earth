// cleanup-land-project-threads.mjs
// Run with: DATABASE_URL=... node scripts/cleanup-land-project-threads.mjs
// Run with --execute flag to actually delete

import mysql from 'mysql2/promise'

const execute = process.argv.includes('--execute')

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL)

  const [posts] = await conn.execute(`
    SELECT fp.id, fp.title, fp.createdAt
    FROM forumPosts fp
    WHERE fp.authorId = (SELECT id FROM users WHERE email = 'team@regencivics.earth' LIMIT 1)
      AND fp.categoryId = (SELECT id FROM forumCategories WHERE slug = 'active-projects' LIMIT 1)
    ORDER BY fp.createdAt
  `)

  console.log('Posts that would be deleted:')
  console.log(posts)

  if (execute) {
    const ids = posts.map(p => p.id)
    if (ids.length > 0) {
      await conn.execute(`DELETE FROM forumPosts WHERE id IN (${ids.join(',')})`)
      console.log(`Deleted ${ids.length} posts`)
    } else {
      console.log('No posts to delete')
    }
  } else {
    console.log('Dry run -- pass --execute to delete')
  }

  await conn.end()
}

main().catch(console.error)
