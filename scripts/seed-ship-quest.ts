/**
 * Seed the Free Passage Quest checklist and its verification model (item 16).
 *
 * Each action carries:
 *   - verificationType: "auto" (points on a forum post, for writing quests, or on
 *     a system event) or "crew" (points when the reviewer approves).
 *   - maxSubmissions: how many times one player can complete it (item 14b, item 11).
 *   - thread: whether the action gets its own forum thread. Thread actions post
 *     proof into that thread; system actions (refer-land-project, food-foresting,
 *     the Galley pair) verify from events and have no thread.
 *
 * Idempotent by slug. Forum threads are created once (category "Quests & Gameplay")
 * and linked via ship_quest_actions.forumPostId, authored by the non-personal
 * "CORE + ReGen Ship" system account (item 17), never a person's account.
 *
 * Also retires the actions superseded by items 11 and 14: moon-of-honey (replaced
 * by Loving Service) and add-map-location (folded into Loving Service). Rye's call
 * was to CLEAR the points on their existing completions, so those completion rows
 * are deleted along with the action rows.
 *
 * Usage:
 *   npx tsx scripts/seed-ship-quest.ts --dry-run
 *   npx tsx scripts/seed-ship-quest.ts
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config({ quiet: true } as never);

const DRY_RUN = process.argv.includes("--dry-run");

const QUEST_CATEGORY_ID = 5; // "Quests & Gameplay"
// Free Passage Quest threads are authored by the non-personal CORE + ReGen Ship
// identity (item 17), not a person's account. Created idempotently in main().
const SHIP_FORUM_AUTHOR_OPENID = "system:core-regen-ship";
const SHIP_FORUM_AUTHOR_NAME = "CORE + ReGen Ship";
const SHIP_FORUM_AUTHOR_HANDLE = "core-regen-ship";
const RETIRED_SLUGS = ["moon-of-honey", "add-map-location"];

type Verification = "auto" | "crew";

type Action = {
  slug: string;
  title: string;
  description: string;
  points: number;
  proofType: string;
  verificationType: Verification;
  maxSubmissions: number;
  linkedQuestId?: string | null;
  sortOrder: number;
  // When set, the action gets a forum thread with this title + body, and players
  // post their proof there. Omit for system-verified actions (no thread).
  thread?: { title: string; body: string };
};

const ACTIONS: Action[] = [
  {
    slug: "share-announcement", title: "Share the ReGen Ship announcement",
    description: "Share the announcement on a social channel, then post the link in this thread. A crew member confirms it.",
    points: 25, proofType: "forum", verificationType: "crew", maxSubmissions: 1, sortOrder: 1,
    thread: { title: "Free Passage Quest: Share the ReGen Ship announcement", body: "Shared the ship with your people? Drop the link to your post here and a crew member will confirm it. Tell us where you shared it and what you said." },
  },
  {
    slug: "origin-story", title: "Write your regenerative origin story",
    description: "Post your regenerative origin story in this thread. Points are awarded the moment you post.",
    points: 25, proofType: "forum", verificationType: "auto", maxSubmissions: 1, sortOrder: 2,
    thread: { title: "Free Passage Quest: Your regenerative origin story", body: "What brought you to this work? Tell the story of how you found your way toward regeneration. Post it here and your points are yours." },
  },
  {
    slug: "refer-land-project", title: "Refer a land project that gets shortlisted",
    description: "Use the Share button to send a land project your referral link. This verifies when their application is shortlisted for Season 2.",
    points: 100, proofType: "referral_shortlisted", verificationType: "auto", maxSubmissions: 1, sortOrder: 3,
  },
  {
    slug: "refer-event-partner", title: "Refer an event or workshop partner",
    description: "Introduce an event or workshop partner for the treasure map, then post who they are here. A crew member confirms each one. You can do this twice.",
    points: 25, proofType: "forum", verificationType: "crew", maxSubmissions: 2, sortOrder: 4,
    thread: { title: "Free Passage Quest: Refer an event or workshop partner", body: "Know an event or workshop partner who belongs on the treasure map? Introduce them and post the details here. A crew member confirms each referral. Worth 25 points each, up to two." },
  },
  {
    slug: "food-foresting", title: "Complete the Food Foresting quest",
    description: "Complete the existing Food Foresting quest once. This verifies automatically from your quest history.",
    points: 40, proofType: "game_quest", verificationType: "auto", maxSubmissions: 1, linkedQuestId: "quest-14", sortOrder: 5,
  },
  {
    slug: "attend-partner-event", title: "Attend or host a partner event",
    description: "Attend or host a partner event or land project workshop, then post a photo or the story here. A crew member confirms it.",
    points: 50, proofType: "forum", verificationType: "crew", maxSubmissions: 1, sortOrder: 7,
    thread: { title: "Free Passage Quest: Attend or host a partner event", body: "Show up for a partner event or a land project workshop, then post a photo and a few words here. A crew member confirms it." },
  },
  {
    slug: "love-letter-to-a-landscape", title: "Write a love letter to a landscape",
    description: "Write a love letter to the place that made you, and post it in this thread. Points are awarded the moment you post.",
    points: 25, proofType: "forum", verificationType: "auto", maxSubmissions: 1, sortOrder: 8,
    thread: { title: "Love letters to a landscape", body: "Write a love letter to a place that made you: the land you grew up on, a forest you return to, a river you miss. Post it here and your points are yours. Read the others while you are here." },
  },
  {
    slug: "cook-for-your-beloved", title: "Cook a local meal for someone you love",
    description: "One meal, sourced as close to your home ground as you can get it. Post the photo and the story here. A crew member confirms it.",
    points: 25, proofType: "forum", verificationType: "crew", maxSubmissions: 1, sortOrder: 10,
    thread: { title: "Free Passage Quest: Cook a local meal for someone you love", body: "Cook one meal, sourced as close to home as you can, for someone you love. Post the photo and the story here. A crew member confirms it." },
  },
  {
    slug: "plant-together", title: "Plant something with another person",
    description: "Two pairs of hands, one hole. Post a photo of both of you planting here. A crew member confirms it.",
    points: 50, proofType: "forum", verificationType: "crew", maxSubmissions: 1, sortOrder: 11,
    thread: { title: "Free Passage Quest: Plant something with another person", body: "Two pairs of hands, one hole. Plant something with another person and post a photo of you both here. A crew member confirms it." },
  },
  {
    slug: "give-a-day-to-the-land", title: "Give a day to a land project near you",
    description: "A full day of whatever they need doing at a land project near you. Post what you did and a photo here. A crew member confirms it.",
    points: 50, proofType: "forum", verificationType: "crew", maxSubmissions: 1, sortOrder: 12,
    thread: { title: "Free Passage Quest: Give a day to a land project", body: "Give a full day to a land project near you, whatever they need doing. Post what you did and a photo here. A crew member confirms it." },
  },
  {
    slug: "bring-a-couple-aboard", title: "Bring a couple onto the crew list",
    description: "Send the honeymoon story to a couple who needs their next honeymoon and get them onto the crew list. Post their names or the link here. A crew member confirms it.",
    points: 50, proofType: "forum", verificationType: "crew", maxSubmissions: 1, sortOrder: 13,
    thread: { title: "Free Passage Quest: Bring a couple onto the crew list", body: "Know a couple who needs their next honeymoon? Send them the story and get them onto the crew list. Post their names or the link here. A crew member confirms it." },
  },

  // ── Loving Service (item 11, replaces moon-of-honey): two crew-verified paths ──
  {
    slug: "loving-service-land-project", title: "Loving Service: add a land project ready to visit",
    description: "Add a land project you have contacted and who has confirmed the ship can visit. Post their name and what you arranged here. A crew member confirms each one. Worth 25 points each, up to two.",
    points: 25, proofType: "forum", verificationType: "crew", maxSubmissions: 2, sortOrder: 14,
    thread: { title: "Free Passage Quest: Loving Service, land projects to visit", body: "Reach out to a land project, confirm the ship is welcome to visit, and add them here with what you arranged. A crew member confirms each one. 25 points each, up to two." },
  },
  {
    slug: "loving-service-food-forest-spring", title: "Loving Service: add a food forest or verified spring",
    description: "Add a food forest site or a verified spring to the treasure map. Post the location and how you know it here. A crew member confirms each one. Worth 10 points each, up to five.",
    points: 10, proofType: "forum", verificationType: "crew", maxSubmissions: 5, sortOrder: 15,
    thread: { title: "Free Passage Quest: Loving Service, food forests and springs", body: "Add a food forest site or a verified spring to the treasure map. Post the location and how you know it is real here. A crew member confirms each one. 10 points each, up to five." },
  },

  // ── The Galley (auto-verified from Galley activity, no thread) ──
  {
    slug: "galley-log-haul", title: "Log a market haul in the Galley",
    description: "Log what you gathered in the Galley remixer. This verifies automatically the first time you log a haul.",
    points: 25, proofType: "link", verificationType: "auto", maxSubmissions: 1, sortOrder: 20,
  },
  {
    slug: "galley-deeper-reset", title: "Try the Deeper Reset",
    description: "Remix or cook a Deeper Reset dish (fully raw) in the Galley. This verifies automatically the first time you try it.",
    points: 25, proofType: "link", verificationType: "auto", maxSubmissions: 1, sortOrder: 21,
  },
];

/**
 * The non-personal identity that authors the quest forum threads (item 17).
 * Idempotent on the synthetic openId, so re-seeding never posts these anchor
 * threads under a person's account. Mirrors migration 0214.
 */
async function getOrCreateShipForumAuthorId(conn: mysql.Connection): Promise<number> {
  await conn.execute(
    `INSERT IGNORE INTO users (openId, name, handle, loginMethod, role)
     VALUES (?, ?, ?, 'system', 'user')`,
    [SHIP_FORUM_AUTHOR_OPENID, SHIP_FORUM_AUTHOR_NAME, SHIP_FORUM_AUTHOR_HANDLE],
  );
  const [rows] = await conn.execute("SELECT id FROM users WHERE openId = ? LIMIT 1", [SHIP_FORUM_AUTHOR_OPENID]);
  const id = Array.isArray(rows) && rows.length ? (rows[0] as { id: number }).id : null;
  if (id == null) throw new Error("could not create or find the CORE + ReGen Ship forum author");
  return id;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL not set. Check your .env.");
    process.exit(1);
  }
  console.log(`Seeding ${ACTIONS.length} quest actions${DRY_RUN ? " (dry run)" : ""}...`);
  if (DRY_RUN) {
    for (const a of ACTIONS) {
      console.log(`  ${a.slug}: ${a.points}pts x${a.maxSubmissions} ${a.verificationType}${a.thread ? " [thread]" : ""}`);
    }
    console.log(`  retire: ${RETIRED_SLUGS.join(", ")} (delete rows + clear their completions)`);
    return;
  }
  const conn = await mysql.createConnection(url);
  let inserted = 0, updated = 0, threads = 0;
  try {
    const authorId = await getOrCreateShipForumAuthorId(conn);

    // 1. Retire superseded actions and clear their completions (Rye: CLEAR points).
    for (const slug of RETIRED_SLUGS) {
      const [rows] = await conn.execute("SELECT id FROM ship_quest_actions WHERE slug = ? LIMIT 1", [slug]);
      const id = Array.isArray(rows) && rows.length ? (rows[0] as { id: number }).id : null;
      if (id != null) {
        const [del] = await conn.execute("DELETE FROM ship_quest_completions WHERE actionId = ?", [id]);
        await conn.execute("DELETE FROM ship_quest_actions WHERE id = ?", [id]);
        console.log(`  retired ${slug} (cleared ${(del as { affectedRows?: number }).affectedRows ?? 0} completions)`);
      }
    }

    // 2. Upsert actions.
    for (const a of ACTIONS) {
      const [existing] = await conn.execute("SELECT id, forumPostId FROM ship_quest_actions WHERE slug = ? LIMIT 1", [a.slug]);
      const row = Array.isArray(existing) && existing.length ? (existing[0] as { id: number; forumPostId: number | null }) : null;
      let actionId: number;
      if (row) {
        await conn.execute(
          `UPDATE ship_quest_actions SET title=?, description=?, points=?, proofType=?, verificationType=?, maxSubmissions=?, linkedQuestId=?, isRequired=1, sortOrder=? WHERE slug=?`,
          [a.title, a.description, a.points, a.proofType, a.verificationType, a.maxSubmissions, a.linkedQuestId ?? null, a.sortOrder, a.slug],
        );
        actionId = row.id;
        updated++;
      } else {
        const [res] = await conn.execute(
          `INSERT INTO ship_quest_actions (slug, title, description, points, isRequired, proofType, verificationType, maxSubmissions, linkedQuestId, sortOrder, createdAt)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, NOW())`,
          [a.slug, a.title, a.description, a.points, a.proofType, a.verificationType, a.maxSubmissions, a.linkedQuestId ?? null, a.sortOrder],
        );
        actionId = (res as { insertId: number }).insertId;
        inserted++;
      }

      // 3. Create the forum thread once, link it via forumPostId.
      if (a.thread) {
        const alreadyLinked = row?.forumPostId ?? null;
        if (!alreadyLinked) {
          const [pres] = await conn.execute(
            `INSERT INTO forumPosts (categoryId, authorId, title, content, isSeed, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
            [QUEST_CATEGORY_ID, authorId, a.thread.title, a.thread.body],
          );
          const postId = (pres as { insertId: number }).insertId;
          await conn.execute("UPDATE ship_quest_actions SET forumPostId = ? WHERE id = ?", [postId, actionId]);
          threads++;
        }
      }
    }
    console.log(`Done. Inserted: ${inserted}, Updated: ${updated}, Threads created: ${threads}`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
