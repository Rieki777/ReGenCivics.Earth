// seed-onboarding-quest-threads.mjs
// Run with: DATABASE_URL=... node scripts/seed-onboarding-quest-threads.mjs [--dry-run|--execute]

import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dryRun = !process.argv.includes('--execute')

// Quest data for quests 1, 3, 5, 6 of Welcome Aboard
// (Read from welcomeAboardQuests.ts to get titles/about text)
// These are the 4 quests that go into onboarding-quests category

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL)

  // Get category ID for onboarding-quests
  const [[category]] = await conn.execute(
    "SELECT id FROM forumCategories WHERE slug = 'onboarding-quests' LIMIT 1"
  )
  if (!category) {
    console.error("onboarding-quests category not found -- run the migration first")
    await conn.end()
    return
  }

  // Get team author ID
  const [[teamUser]] = await conn.execute(
    "SELECT id FROM users WHERE email = 'team@regencivics.earth' LIMIT 1"
  )
  if (!teamUser) {
    console.error("team@regencivics.earth user not found")
    await conn.end()
    return
  }

  // Read welcomeAboardQuests.ts to get quest data
  const questsFilePath = path.join(__dirname, '../client/src/data/welcomeAboardQuests.ts')
  const questsFileContent = fs.readFileSync(questsFilePath, 'utf8')

  // The 4 quests that need onboarding-quests forum threads
  // quest.number values: 1, 3, 5, 6
  const questsToSeed = [
    { number: 1 },
    { number: 3 },
    { number: 5 },
    { number: 6 },
  ]

  const createdPosts = []

  for (const quest of questsToSeed) {
    // Extract the quest block by its number field, then get the title
    // Pattern: number: N, (possibly with whitespace)
    const questBlockRegex = new RegExp(
      `\\{[^{}]*?number:\\s*${quest.number}\\b[^{}]*?\\}`,
      's'
    )
    const blockMatch = questsFileContent.match(questBlockRegex)

    let title = `Welcome Aboard Quest ${quest.number}`
    if (blockMatch) {
      const titleMatch = blockMatch[0].match(/title:\s*["'`]([^"'`]+)["'`]/)
      if (titleMatch) title = titleMatch[1]
    }

    const body = `This is the discussion thread for the "${title}" quest.\n\nComplete the quest and share your experience here. What did you do? How did it feel? Questions, reflections, and completions all welcome.`

    console.log(`${dryRun ? '[DRY RUN] Would create' : 'Creating'}: "${title}" forum thread in onboarding-quests`)

    if (!dryRun) {
      const [result] = await conn.execute(
        'INSERT INTO forumPosts (title, content, authorId, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [title, body, teamUser.id, category.id]
      )
      createdPosts.push({ questNumber: quest.number, postId: result.insertId, title })
      console.log(`  Created post ID ${result.insertId}`)
    } else {
      console.log(`  Would create forum post for quest ${quest.number}: "${title}"`)
    }
  }

  if (!dryRun && createdPosts.length > 0) {
    // Patch welcomeAboardQuests.ts
    let updatedContent = questsFileContent

    for (const post of createdPosts) {
      // Find the quest block for this quest number and update its forumUrl
      // Strategy: locate the quest object by number, then replace forumUrl within it
      const questBlockRegex = new RegExp(
        `(\\{[^{}]*?number:\\s*${post.questNumber}\\b[^{}]*?forumUrl:\\s*)["'\`][^"'\`]*["'\`]`,
        's'
      )

      // Also try reversed order (forumUrl before number)
      const questBlockRegex2 = new RegExp(
        `(\\{[^{}]*?forumUrl:\\s*)["'\`][^"'\`]*["'\`]([^{}]*?number:\\s*${post.questNumber}\\b[^{}]*?\\})`,
        's'
      )

      if (questBlockRegex.test(updatedContent)) {
        updatedContent = updatedContent.replace(
          questBlockRegex,
          `$1"/community/post/${post.postId}"`
        )
        console.log(`Patched quest number ${post.questNumber} forumUrl to /community/post/${post.postId}`)
      } else if (questBlockRegex2.test(updatedContent)) {
        updatedContent = updatedContent.replace(
          questBlockRegex2,
          `$1"/community/post/${post.postId}"$2`
        )
        console.log(`Patched quest number ${post.questNumber} forumUrl to /community/post/${post.postId}`)
      } else {
        // Fallback: find by id field (welcome-aboard-N)
        const idBasedRegex = new RegExp(
          `(id:\\s*["'\`]welcome-aboard-${post.questNumber}["'\`][^}]+?forumUrl:\\s*)["'\`][^"'\`]*["'\`]`,
          's'
        )
        if (idBasedRegex.test(updatedContent)) {
          updatedContent = updatedContent.replace(
            idBasedRegex,
            `$1"/community/post/${post.postId}"`
          )
          console.log(`Patched quest welcome-aboard-${post.questNumber} forumUrl to /community/post/${post.postId}`)
        } else {
          console.log(`Could not find forumUrl for quest number ${post.questNumber} to patch`)
        }
      }
    }

    fs.writeFileSync(questsFilePath, updatedContent, 'utf8')
    console.log('Updated welcomeAboardQuests.ts')
  }

  await conn.end()
  console.log('Done')
}

main().catch(console.error)
