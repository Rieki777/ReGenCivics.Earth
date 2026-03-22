// backfill-quest-forum-threads.mjs  (Fix 140 Part D)
// Run with: DATABASE_URL=... node scripts/backfill-quest-forum-threads.mjs [--dry-run|--execute]
//
// For every quest suggestion that has no forum thread, creates a forum post
// in the quests-gameplay category and links it back via questForumThreadId.
//
// Requires the Fix 140 Part D migration (adding questForumThreadId column)
// to be applied first.

import mysql from 'mysql2/promise'

const dryRun = !process.argv.includes('--execute')

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set.')
    process.exit(1)
  }

  const conn = await mysql.createConnection(process.env.DATABASE_URL)

  try {
    // ── Pre-flight: verify questForumThreadId column exists ──────────────
    const [columns] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'questSuggestions'
         AND COLUMN_NAME = 'questForumThreadId'`
    )
    if (columns.length === 0) {
      console.error(
        'ERROR: questForumThreadId column does not exist on questSuggestions.\n' +
        'Apply the Fix 140 Part D migration first.'
      )
      return
    }

    // ── Find quests without a forum thread ───────────────────────────────
    const [quests] = await conn.execute(
      `SELECT id, title FROM questSuggestions
       WHERE questForumThreadId IS NULL
       ORDER BY id`
    )

    console.log(`Found ${quests.length} quest suggestion(s) without forum threads.`)

    if (quests.length === 0) {
      console.log('Nothing to do.')
      return
    }

    // ── Look up category and author ─────────────────────────────────────
    const [[category]] = await conn.execute(
      "SELECT id FROM forumCategories WHERE slug = 'quests-gameplay' LIMIT 1"
    )
    if (!category) {
      console.error('ERROR: quests-gameplay category not found.')
      return
    }

    const [[teamUser]] = await conn.execute(
      "SELECT id FROM users WHERE email = 'team@regencivics.earth' LIMIT 1"
    )
    if (!teamUser) {
      console.error('ERROR: team@regencivics.earth user not found.')
      return
    }

    console.log(`Category: quests-gameplay (id=${category.id})`)
    console.log(`Author:   team@regencivics.earth (id=${teamUser.id})`)
    console.log(`Mode:     ${dryRun ? 'DRY RUN' : 'EXECUTE'}\n`)

    // ── Process each quest ──────────────────────────────────────────────
    let processed = 0

    for (const quest of quests) {
      const body =
        `This is the discussion thread for ${quest.title}. ` +
        `Complete the quest and share your experience here. ` +
        `Questions, reflections, and completions all welcome.`

      if (dryRun) {
        console.log(`[DRY RUN] Would create thread for quest ${quest.id}: "${quest.title}"`)
      } else {
        const [result] = await conn.execute(
          'INSERT INTO forumPosts (title, content, authorId, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [quest.title, body, teamUser.id, category.id]
        )
        await conn.execute(
          'UPDATE questSuggestions SET questForumThreadId = ? WHERE id = ?',
          [result.insertId, quest.id]
        )
        console.log(`Created post ID ${result.insertId} for quest ${quest.id}: "${quest.title}"`)
      }
      processed++
    }

    console.log(`\n${processed} quest suggestion(s) processed.`)
  } finally {
    await conn.end()
  }

  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
