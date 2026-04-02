/**
 * Seed script: Create the "SEEDS Reunion" pinned forum thread in General.
 *
 * This is the thread where public video introductions from SEEDS claim
 * submissions get posted. It's also a standalone gathering place for
 * former SEEDS community members reconnecting through ReGen Civics.
 *
 * Usage:
 *   npx tsx scripts/seed-seeds-reunion-thread.ts [--dry-run]
 *
 * Requires DATABASE_URL env var.
 */

import "dotenv/config";
import * as mysql from "mysql2/promise";

const DRY_RUN = process.argv.includes("--dry-run");

const THREAD_TITLE = "SEEDS Reunion: Faces Behind the Accounts";

const THREAD_BODY = `A few years ago, a group of people put real money into an idea. The idea was SEEDS: an economic system designed around regeneration instead of extraction. A currency that gained value when people planted trees, restored soil, built community.

The technology didn't survive. The vision did.

If you're here, you probably held SEEDS tokens. You bought them because you believed a different economy was possible, and you were willing to put something behind that belief. Some of you were deeply involved in governance, DHO work, bioregional organizing. Some of you bought tokens at a community event and then life moved on. All of it counts.

ReGen Civics is where that vision lives now. The financial contributions you made to SEEDS are being honored here as $ReGen tokens on Base. You can claim yours at [/claim-seeds](/claim-seeds). Claims are open until the September 2026 equinox.

**This thread is for something more than claiming tokens.**

This is a reunion. A place to see each other's faces, hear each other's names, and remember why we showed up in the first place.

When you submit your claim, you can choose to share your video introduction here with the community. In 30-60 seconds, you say your name, your SEEDS account, and share a memory from your time in SEEDS or what drew you to regenerative economics. Those videos will appear as replies in this thread.

You can also just write here. Drop a memory. Say hello. Tell us what you've been doing since SEEDS. Tell us what you're hoping to build next.

Some of you haven't talked to anyone from this community in years. Some of you have been waiting for exactly this moment. Either way: welcome back. We kept building.

Rieki`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL env var is required");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);

  try {
    // Find the General category
    const [cats] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT id FROM forumCategories WHERE slug = 'general' LIMIT 1`
    );
    if (!cats.length) {
      console.error("General category not found. Run seed-forum-posts.ts first.");
      process.exit(1);
    }
    const categoryId = cats[0].id;

    // Check if thread already exists
    const [existing] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT id FROM forumPosts WHERE title = ? LIMIT 1`,
      [THREAD_TITLE]
    );
    if (existing.length) {
      console.log(`Thread already exists (id=${existing[0].id}). Skipping.`);
      return;
    }

    // Find admin/team user (id=1 or the first superadmin)
    const [admins] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT id FROM users WHERE isSuperAdmin = 1 ORDER BY id ASC LIMIT 1`
    );
    const authorId = admins.length ? admins[0].id : 1;

    if (DRY_RUN) {
      console.log("[DRY RUN] Would create pinned thread:");
      console.log(`  Category: general (id=${categoryId})`);
      console.log(`  Author: user ${authorId}`);
      console.log(`  Title: ${THREAD_TITLE}`);
      console.log(`  Body: ${THREAD_BODY.slice(0, 120)}...`);
      return;
    }

    const [result] = await conn.execute<mysql.ResultSetHeader>(
      `INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned, isSeed, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 1, 1, NOW(), NOW())`,
      [categoryId, authorId, THREAD_TITLE, THREAD_BODY]
    );

    console.log(`Created SEEDS Reunion thread (id=${result.insertId}), pinned in General.`);
    console.log(`Direct link: /community/post/${result.insertId}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
