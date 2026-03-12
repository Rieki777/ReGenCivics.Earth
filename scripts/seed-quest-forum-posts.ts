/**
 * Seed script: creates 10 quest forum posts with 3 seed comments each.
 * Usage:
 *   npx ts-node scripts/seed-quest-forum-posts.ts [--dry-run]
 *
 * Requires DATABASE_URL env var pointing to your MySQL connection string.
 */

import * as mysql from "mysql2/promise";
import { QUEST_FORUM_POSTS } from "./data/quest-forum-posts";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  if (DRY_RUN) {
    console.log("=== DRY RUN: no changes will be written ===\n");
    for (const post of QUEST_FORUM_POSTS) {
      console.log(`--- ${post.title} ---`);
      console.log(`Slug: /community/${post.slug}`);
      console.log(`Body:\n${post.body}\n`);
      for (const seed of post.seeds) {
        console.log(`  Seed comment by ${seed.author} (${seed.handle}):`);
        console.log(`  ${seed.body.slice(0, 120)}...\n`);
      }
    }
    console.log(`Total posts: ${QUEST_FORUM_POSTS.length}`);
    console.log(`Total seed comments: ${QUEST_FORUM_POSTS.reduce((s, p) => s + p.seeds.length, 0)}`);
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL env var is required");

  const conn = await mysql.createConnection(dbUrl);

  // Look up the "quests-gameplay" category (or any suitable default category)
  const [cats] = await conn.execute(
    "SELECT id, slug FROM forumCategories WHERE slug IN ('quests-gameplay', 'general') ORDER BY slug DESC LIMIT 1"
  ) as any;
  const catId: number = cats[0]?.id;
  if (!catId) throw new Error("No suitable forum category found. Run seed-forum.mjs first.");

  // Look up admin user
  const [admins] = await conn.execute(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  ) as any;
  const adminId: number = admins[0]?.id ?? 1;

  let postsCreated = 0;
  let commentsCreated = 0;

  for (const post of QUEST_FORUM_POSTS) {
    // Check if post with this title already exists
    const [existing] = await conn.execute(
      "SELECT id FROM forumPosts WHERE title = ? LIMIT 1",
      [post.title]
    ) as any;

    let postId: number;

    if (existing.length > 0) {
      postId = existing[0].id;
      console.log(`Skipped (exists): ${post.title}`);
    } else {
      const [res] = await conn.execute(
        "INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned) VALUES (?, ?, ?, ?, 1)",
        [catId, adminId, post.title, post.body]
      ) as any;
      postId = res.insertId;
      postsCreated++;
      console.log(`Created post #${postId}: ${post.title}`);
    }

    // Add seed comments (skip if already seeded)
    for (const seed of post.seeds) {
      const commentBody = `**${seed.author}** (${seed.handle})\n\n${seed.body}`;
      const [existingReply] = await conn.execute(
        "SELECT id FROM forumReplies WHERE postId = ? AND content LIKE ? LIMIT 1",
        [postId, `%${seed.author}%`]
      ) as any;

      if (existingReply.length > 0) {
        continue;
      }

      await conn.execute(
        "INSERT INTO forumReplies (postId, authorId, content) VALUES (?, ?, ?)",
        [postId, adminId, commentBody]
      );
      commentsCreated++;
    }
  }

  await conn.end();
  console.log(`\nDone. Posts created: ${postsCreated}, seed comments added: ${commentsCreated}`);
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
