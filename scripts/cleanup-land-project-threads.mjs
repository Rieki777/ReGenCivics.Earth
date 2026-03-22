#!/usr/bin/env node
/**
 * Cleanup forum posts seeded by the team account into the active-projects category.
 *
 * Without --execute: prints matching posts (dry run).
 * With    --execute: deletes those posts.
 *
 * Run: DATABASE_URL=... node scripts/cleanup-land-project-threads.mjs [--execute]
 */
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const execute = process.argv.includes('--execute');

let conn;
try {
  conn = await mysql.createConnection(DATABASE_URL);

  // Find forum posts authored by the team account in the active-projects category
  const [posts] = await conn.execute(`
    SELECT fp.id, fp.title, fp.createdAt
    FROM forumPosts fp
    WHERE fp.authorId = (SELECT id FROM users WHERE email = 'team@regencivics.earth' LIMIT 1)
      AND fp.categoryId = (SELECT id FROM forumCategories WHERE slug = 'active-projects' LIMIT 1)
    ORDER BY fp.createdAt
  `);

  if (posts.length === 0) {
    console.log('No matching forum posts found. Nothing to do.');
  } else {
    console.log(`Found ${posts.length} team-seeded post(s) in active-projects:\n`);
    for (const p of posts) {
      console.log(`  [${p.id}] ${p.title}  (created: ${p.createdAt})`);
    }

    if (execute) {
      const ids = posts.map(p => p.id);
      // Delete replies first to avoid FK issues, then the posts
      await conn.execute(
        `DELETE FROM forumReplies WHERE postId IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      await conn.execute(
        `DELETE FROM forumPosts WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      console.log(`\nDeleted ${ids.length} post(s) and their replies.`);
    } else {
      console.log('\nDry run. Pass --execute to actually delete these posts.');
    }
  }
} catch (err) {
  console.error('Failed:', err.message);
  process.exit(1);
} finally {
  if (conn) await conn.end();
}
