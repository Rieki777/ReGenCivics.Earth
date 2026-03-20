// check-post-links.mjs
// Run with: DATABASE_URL=... node scripts/check-post-links.mjs

import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL)

  const [rows] = await conn.execute(`
    SELECT id, title, categoryId, createdAt
    FROM forumPosts
    WHERE title LIKE '%contribution%'
       OR title LIKE '%seeds%'
       OR title LIKE '%quest%'
    ORDER BY id
  `)

  console.log('Posts matching contribution/seeds/quest:')
  console.log(JSON.stringify(rows, null, 2))

  await conn.end()

  // Grep client/src/ for hardcoded /community/post/[number] links
  const clientSrcDir = path.join(__dirname, '../client/src')
  const hardcodedLinks = []

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDir(fullPath)
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8')
        const matches = [...content.matchAll(/\/community\/post\/(\d+)/g)]
        for (const match of matches) {
          const lineNum = content.substring(0, match.index).split('\n').length
          hardcodedLinks.push({
            file: path.relative(path.join(__dirname, '..'), fullPath),
            line: lineNum,
            url: match[0],
            postId: match[1],
          })
        }
      }
    }
  }

  scanDir(clientSrcDir)

  console.log('\nHardcoded /community/post/[number] links in client/src/:')
  if (hardcodedLinks.length === 0) {
    console.log('  (none found)')
  } else {
    for (const link of hardcodedLinks) {
      console.log(`  ${link.file}:${link.line}  ${link.url}`)
    }
  }
}

main().catch(console.error)
