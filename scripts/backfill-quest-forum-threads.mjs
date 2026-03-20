// backfill-quest-forum-threads.mjs
// Run with: DATABASE_URL=... node scripts/backfill-quest-forum-threads.mjs [--dry-run] [--execute]

import mysql from 'mysql2/promise'

const dryRun = !process.argv.includes('--execute')

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL)

  // Get all quest suggestions without forum threads
  const [quests] = await conn.execute(`
    SELECT id, title FROM questSuggestions
    WHERE questForumThreadId IS NULL
    ORDER BY id
  `)

  console.log(`Found ${quests.length} quest suggestions without forum threads`)

  if (quests.length === 0) {
    await conn.end()
    return
  }

  // Get quests-gameplay category
  const [[category]] = await conn.execute(
    "SELECT id FROM forumCategories WHERE slug = 'quests-gameplay' LIMIT 1"
  )
  if (!category) {
    console.error("quests-gameplay category not found")
    await conn.end()
    return
  }

  // Get team user
  const [[teamUser]] = await conn.execute(
    "SELECT id FROM users WHERE email = 'team@regencivics.earth' LIMIT 1"
  )
  if (!teamUser) {
    console.error("team@regencivics.earth user not found")
    await conn.end()
    return
  }

  for (const quest of quests) {
    const title = quest.title
    const body = `This is the discussion thread for the "${title}" quest. Complete the quest and share your experience here. Questions, reflections, and completions all welcome.`

    console.log(`${dryRun ? '[DRY RUN] Would create' : 'Creating'} thread for: "${title}"`)

    if (!dryRun) {
      const [result] = await conn.execute(
        'INSERT INTO forumPosts (title, content, authorId, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [title, body, teamUser.id, category.id]
      )
      await conn.execute(
        'UPDATE questSuggestions SET questForumThreadId = ? WHERE id = ?',
        [result.insertId, quest.id]
      )
      console.log(`  Created post ID ${result.insertId}, updated questSuggestion ${quest.id}`)
    }
  }

  await conn.end()
  console.log(`\nDone. ${quests.length} quest suggestions processed.`)
}

main().catch(console.error)
