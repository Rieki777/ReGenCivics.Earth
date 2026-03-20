// find-resources-thread.mjs
// Run with: DATABASE_URL=... node scripts/find-resources-thread.mjs

import mysql from 'mysql2/promise'

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL)

  const [rows] = await conn.execute(`
    SELECT fp.id, fp.title, fp.createdAt
    FROM forumPosts fp
    WHERE fp.categoryId = (SELECT id FROM forumCategories WHERE slug = 'general' LIMIT 1)
      AND (fp.title LIKE '%resource%' OR fp.title LIKE '%book%' OR fp.title LIKE '%learn%' OR fp.title LIKE '%read%')
    ORDER BY fp.createdAt DESC
    LIMIT 10
  `)

  console.log('Resources threads in General category:')
  console.log(JSON.stringify(rows, null, 2))

  await conn.end()
}

main().catch(console.error)
