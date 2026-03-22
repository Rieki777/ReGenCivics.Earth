// Fix 133 — Check forum post IDs for contribution/seeds/quest posts
// Usage: DATABASE_URL=mysql://... node scripts/check-post-links.mjs

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  console.error('Run with: DATABASE_URL=mysql://user:pass@host:port/dbname node scripts/check-post-links.mjs');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

try {
  const [rows] = await connection.execute(
    `SELECT id, title FROM forumPosts
     WHERE title LIKE '%contribution%'
        OR title LIKE '%seeds%'
        OR title LIKE '%quest%'
     ORDER BY id`
  );

  if (rows.length === 0) {
    console.log('No matching forum posts found.');
  } else {
    console.log(`Found ${rows.length} matching post(s):\n`);
    console.table(rows);
  }

  // Grep client/src/ for hardcoded /community/post/[number] links
  const clientSrcDir = path.join(__dirname, '../client/src');
  const hardcodedLinks = [];

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = [...content.matchAll(/\/community\/post\/(\d+)/g)];
        for (const match of matches) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          hardcodedLinks.push({
            file: path.relative(path.join(__dirname, '..'), fullPath),
            line: lineNum,
            url: match[0],
            postId: match[1],
          });
        }
      }
    }
  }

  scanDir(clientSrcDir);

  console.log('\nHardcoded /community/post/[number] links in client/src/:');
  if (hardcodedLinks.length === 0) {
    console.log('  (none found)');
  } else {
    console.table(hardcodedLinks);
  }
} finally {
  await connection.end();
}
