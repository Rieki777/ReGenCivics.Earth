/**
 * Seed script: creates 14 Rites of Passage quest forum posts + 1 Food Foresting post.
 * Usage:
 *   npx tsx scripts/seed-rites-forum-posts.ts [--dry-run]
 *
 *   --dry-run  Show what would happen without writing to the DB.
 *
 * Requires DATABASE_URL env var pointing to your MySQL connection string.
 *
 * Categories required (must exist before running):
 *   - rites-of-passage   (for the 14 Rites of Passage threads)
 *   - land-projects       (for the Food Foresting thread)
 */

import * as mysql from "mysql2/promise";
import {
  RITES_OF_PASSAGE_FORUM_POSTS,
  FOOD_FORESTING_FORUM_POST,
} from "./data/rites-of-passage-forum-posts";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const allPosts = [
    ...RITES_OF_PASSAGE_FORUM_POSTS.map((p) => ({
      ...p,
      categorySlug: "rites-of-passage",
    })),
    {
      ...FOOD_FORESTING_FORUM_POST,
      categorySlug: "land-projects",
    },
  ];

  if (DRY_RUN) {
    console.log("=== DRY RUN: no changes will be written ===\n");
    for (const post of allPosts) {
      console.log(`--- ${post.title} ---`);
      console.log(`Category: ${post.categorySlug}`);
      console.log(`Slug: /community/${post.slug}`);
      console.log(`Body:\n${post.body}\n`);
      for (const seed of post.seeds) {
        console.log(`  Seed comment by ${seed.author} (${seed.handle}):`);
        console.log(`  ${seed.body.slice(0, 120)}...\n`);
      }
    }
    console.log(`Total posts: ${allPosts.length}`);
    console.log(
      `Total seed comments: ${allPosts.reduce((s, p) => s + p.seeds.length, 0)}`
    );
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL env var is required");

  const conn = await mysql.createConnection(dbUrl);

  try {
    // Look up category IDs
    const [cats] = (await conn.execute(
      "SELECT id, slug FROM forumCategories WHERE slug IN ('rites-of-passage', 'land-projects')"
    )) as any;
    const categoryMap: Record<string, number> = {};
    for (const c of cats) {
      categoryMap[c.slug] = c.id;
    }

    if (!categoryMap["rites-of-passage"]) {
      throw new Error(
        "Category 'rites-of-passage' not found. Run migration 0071 first."
      );
    }
    if (!categoryMap["land-projects"]) {
      console.warn(
        "Warning: 'land-projects' category not found. Food Foresting post will be skipped."
      );
    }

    // Ensure team author exists (or use Rye's account)
    const [existingTeamUsers] = (await conn.execute(
      "SELECT id FROM users WHERE email = 'team@regencivics.earth' LIMIT 1"
    )) as any;

    let TEAM_USER_ID: number;
    if (existingTeamUsers.length > 0) {
      TEAM_USER_ID = existingTeamUsers[0].id;
      console.log(`Using existing team user (id=${TEAM_USER_ID})`);
    } else {
      // Fallback to Rye's account
      const [ryeUser] = (await conn.execute(
        "SELECT id FROM users WHERE email = 'rieki.cordon@gmail.com' LIMIT 1"
      )) as any;
      if (ryeUser.length === 0)
        throw new Error("No team user or Rye user found.");
      TEAM_USER_ID = ryeUser[0].id;
      console.log(`Using Rye's account as seed author (id=${TEAM_USER_ID})`);
    }

    // Look up seed commenter accounts (or create placeholder users)
    const seedAuthors = new Set<string>();
    for (const post of allPosts) {
      for (const seed of post.seeds) {
        seedAuthors.add(seed.author);
      }
    }

    // Map author names to user IDs (create temp users if needed)
    const authorUserIds: Record<string, number> = {};
    for (const authorName of seedAuthors) {
      const safeEmail = `${authorName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@seed.regencivics.earth`;
      const [existing] = (await conn.execute(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [safeEmail]
      )) as any;

      if (existing.length > 0) {
        authorUserIds[authorName] = existing[0].id;
      } else {
        // Create a placeholder user for the seed commenter
        const [result] = (await conn.execute(
          `INSERT INTO users (email, name, openId, loginMethod)
           VALUES (?, ?, ?, 'seed')`,
          [safeEmail, authorName, `seed-${authorName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`]
        )) as any;
        authorUserIds[authorName] = result.insertId;
        console.log(
          `Created seed user: ${authorName} (id=${result.insertId})`
        );
      }
    }

    // Insert posts and seed comments
    let postsCreated = 0;
    let commentsCreated = 0;

    for (const post of allPosts) {
      const catId = categoryMap[post.categorySlug];
      if (!catId) {
        console.log(
          `Skipping "${post.title}" - category '${post.categorySlug}' not found`
        );
        continue;
      }

      // Check if post already exists by title (no slug column)
      const [existingPost] = (await conn.execute(
        "SELECT id FROM forumPosts WHERE title = ? AND categoryId = ? LIMIT 1",
        [post.title, catId]
      )) as any;

      if (existingPost.length > 0) {
        console.log(
          `Post already exists: "${post.title}" (id=${existingPost[0].id}) - skipping`
        );
        continue;
      }

      const [postResult] = (await conn.execute(
        `INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned)
         VALUES (?, ?, ?, ?, 1)`,
        [catId, TEAM_USER_ID, post.title, post.body]
      )) as any;

      const postId = postResult.insertId;
      postsCreated++;
      console.log(`Created post: "${post.title}" (id=${postId})`);

      // Insert seed comments
      for (const seed of post.seeds) {
        const seedUserId = authorUserIds[seed.author] || TEAM_USER_ID;
        await conn.execute(
          `INSERT INTO forumReplies (postId, authorId, content)
           VALUES (?, ?, ?)`,
          [postId, seedUserId, seed.body]
        );
        commentsCreated++;
      }

      // Update reply count
      await conn.execute(
        "UPDATE forumPosts SET replyCount = ? WHERE id = ?",
        [post.seeds.length, postId]
      );
    }

    console.log(
      `\nDone! Created ${postsCreated} posts and ${commentsCreated} seed comments.`
    );
  } finally {
    await conn.end();
  }
}

main().catch(console.error);
