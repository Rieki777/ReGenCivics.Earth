/**
 * Utility: print forumUrl mappings for all quest forum posts.
 * Run this AFTER seeding rites-of-passage and food-foresting threads.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/get-forum-post-ids.ts
 *
 * Output: a list of forumSlug -> /community/post/{id} mappings
 * that you can paste into questData.ts forumUrl fields.
 */

import * as mysql from "mysql2/promise";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL env var is required");

  const conn = await mysql.createConnection(dbUrl);

  try {
    // Get all rites-of-passage and food-foresting forum posts
    const [rows] = (await conn.execute(
      `SELECT fp.id, fp.title, fc.slug as categorySlug
       FROM forumPosts fp
       JOIN forumCategories fc ON fp.categoryId = fc.id
       WHERE fc.slug IN ('rites-of-passage', 'land-projects', 'welcome-aboard-quests')
       ORDER BY fc.slug, fp.id`
    )) as any;

    console.log("=== Forum Post ID Mappings ===\n");
    console.log("Copy these forumUrl values into questData.ts and welcomeAboardQuests.ts:\n");

    for (const row of rows) {
      console.log(`  forumUrl:  "/community/post/${row.id}"`);
      console.log(`  title:     ${row.title}`);
      console.log(`  category:  ${row.categorySlug}`);
      console.log("");
    }

    console.log(`Total: ${rows.length} posts`);
  } finally {
    await conn.end();
  }
}

main().catch(console.error);
