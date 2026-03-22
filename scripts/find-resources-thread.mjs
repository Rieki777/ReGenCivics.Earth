// Fix 140 — Find resource/book/learning threads in the general category
// Usage: DATABASE_URL=mysql://... node scripts/find-resources-thread.mjs

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  console.error('Run with: DATABASE_URL=mysql://user:pass@host:port/dbname node scripts/find-resources-thread.mjs');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

try {
  const [rows] = await connection.execute(
    `SELECT id, title, createdAt FROM forumPosts
     WHERE categoryId = (SELECT id FROM forumCategories WHERE slug = 'general')
       AND (title LIKE '%resource%'
         OR title LIKE '%book%'
         OR title LIKE '%learn%'
         OR title LIKE '%read%')
     ORDER BY createdAt DESC
     LIMIT 10`
  );

  if (rows.length === 0) {
    console.log('No matching resource threads found in the general category.');
  } else {
    console.log(`Found ${rows.length} matching thread(s):\n`);
    console.table(rows);
  }
} finally {
  await connection.end();
}
