// seed-onboarding-quest-threads.mjs  (Fix 140 Part C)
// Run with: DATABASE_URL=... node scripts/seed-onboarding-quest-threads.mjs [--dry-run|--execute]
//
// Creates forum posts for Welcome Aboard quests 1, 3, 5, 6 in the
// onboarding-quests category, then patches forumUrl in welcomeAboardQuests.ts.

import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dryRun = !process.argv.includes('--execute')

// Which Welcome Aboard quest numbers get onboarding-quests threads
const QUEST_NUMBERS = [1, 3, 5, 6]

// ---------------------------------------------------------------------------
// Helpers to extract quest data from the TS source
// ---------------------------------------------------------------------------

function extractQuestBlocks(fileContent) {
  // Each quest object starts with "  {" and ends with "  }," or "  }]"
  // We split by the top-level array entries.
  const quests = []
  const objRegex = /\{\s*\n\s*id:\s*"welcome-aboard-(\d+)"[\s\S]*?\n\s*\}/g
  let m
  while ((m = objRegex.exec(fileContent)) !== null) {
    const block = m[0]
    const number = parseInt(m[1], 10)

    const titleMatch = block.match(/title:\s*"([^"]+)"/)
    const title = titleMatch ? titleMatch[1] : `Welcome Aboard Quest ${number}`

    // Extract the about field (multi-line template literal or string)
    let about = ''
    const aboutMatch = block.match(/about:\s*\n?\s*"([\s\S]*?)"(?:,|\n)/)
    if (aboutMatch) {
      about = aboutMatch[1].replace(/\\n/g, '\n')
    }

    // Extract steps array
    const steps = []
    const stepsSection = block.match(/steps:\s*\[\s*([\s\S]*?)\s*\]/)
    if (stepsSection) {
      const stepRegex = /"([\s\S]*?)"/g
      let s
      while ((s = stepRegex.exec(stepsSection[1])) !== null) {
        steps.push(s[1].replace(/\\n/g, '\n'))
      }
    }

    quests.push({ number, title, about, steps })
  }
  return quests
}

function buildBody(quest) {
  let body = quest.about + '\n\n'
  body += '## Steps\n\n'
  quest.steps.forEach((step, i) => {
    body += `${i + 1}. ${step}\n`
  })
  body += '\nComplete the quest and reply to this thread with your experience!'
  return body
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set.')
    process.exit(1)
  }

  const questsFilePath = path.join(__dirname, '../client/src/data/welcomeAboardQuests.ts')
  const questsFileContent = fs.readFileSync(questsFilePath, 'utf8')
  const allQuests = extractQuestBlocks(questsFileContent)

  const targetQuests = allQuests.filter(q => QUEST_NUMBERS.includes(q.number))
  if (targetQuests.length !== QUEST_NUMBERS.length) {
    console.error(`Expected ${QUEST_NUMBERS.length} quests but found ${targetQuests.length} in the TS file.`)
    process.exit(1)
  }

  const conn = await mysql.createConnection(process.env.DATABASE_URL)

  try {
    // Get category ID for onboarding-quests
    const [[category]] = await conn.execute(
      "SELECT id FROM forumCategories WHERE slug = 'onboarding-quests' LIMIT 1"
    )
    if (!category) {
      console.error('ERROR: onboarding-quests category not found. Run the migration first.')
      return
    }

    // Get team author ID
    const [[teamUser]] = await conn.execute(
      "SELECT id FROM users WHERE email = 'team@regencivics.earth' LIMIT 1"
    )
    if (!teamUser) {
      console.error('ERROR: team@regencivics.earth user not found.')
      return
    }

    console.log(`Category: onboarding-quests (id=${category.id})`)
    console.log(`Author:   team@regencivics.earth (id=${teamUser.id})`)
    console.log(`Mode:     ${dryRun ? 'DRY RUN' : 'EXECUTE'}\n`)

    const createdPosts = []

    for (const quest of targetQuests) {
      const body = buildBody(quest)

      if (dryRun) {
        console.log(`[DRY RUN] Would create forum post:`)
        console.log(`  Quest #${quest.number}: "${quest.title}"`)
        console.log(`  Body preview: ${body.substring(0, 120)}...`)
        console.log(`  Would update forumUrl in welcomeAboardQuests.ts\n`)
      } else {
        const [result] = await conn.execute(
          'INSERT INTO forumPosts (title, content, authorId, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [quest.title, body, teamUser.id, category.id]
        )
        const postId = result.insertId
        createdPosts.push({ questNumber: quest.number, postId, title: quest.title })
        console.log(`Created post ID ${postId} for quest #${quest.number}: "${quest.title}"`)
      }
    }

    // Patch welcomeAboardQuests.ts with new forumUrl values
    if (!dryRun && createdPosts.length > 0) {
      let updatedContent = questsFileContent

      for (const post of createdPosts) {
        // Match the quest block by its id field, then replace its forumUrl
        const idStr = `welcome-aboard-${post.questNumber}`
        const regex = new RegExp(
          `(id:\\s*"${idStr}"[\\s\\S]*?forumUrl:\\s*)"[^"]*"`,
        )
        if (regex.test(updatedContent)) {
          updatedContent = updatedContent.replace(
            regex,
            `$1"/community/post/${post.postId}"`
          )
          console.log(`Patched forumUrl for ${idStr} -> /community/post/${post.postId}`)
        } else {
          console.warn(`WARNING: Could not find forumUrl for ${idStr} to patch.`)
        }
      }

      fs.writeFileSync(questsFilePath, updatedContent, 'utf8')
      console.log('\nUpdated welcomeAboardQuests.ts')
    }
  } finally {
    await conn.end()
  }

  console.log('\nDone.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
