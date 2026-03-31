/**
 * Seed script: creates Quest 14 forum post + 3 seed comments.
 * Usage:
 *   npx tsx scripts/seed-quest-14-forum.ts [--dry-run]
 *
 * Requires DATABASE_URL env var pointing to your MySQL connection string.
 */
import * as mysql from "mysql2/promise";

const DRY_RUN = process.argv.includes("--dry-run");

const POST = {
  title: "Love to Heal Your Body: Share Your Experience",
  body: `This is the thread for Quest 14: Love to Heal Your Body.

The practice is simple. For one moon cycle, every other day, you spend an hour in direct conversation with your body. You scan from feet to crown, find the places that hold tension or pain, and send love there. Not fix. Not analyze. Love.

Over 15 sessions, patterns emerge that you could never see in a single sitting. The shoulder that always carries something. The jaw that holds words you didn't say. The belly that tightens when you think about certain things. Once you start listening, the body starts talking back.

Share your experience here. What did you notice in the early sessions? What shifted by the end of the cycle? What did your body tell you that your mind had been ignoring?

Post your reflection journal, a video summary, or just write about what happened. Every completion earns 111 $ReGen and 1 RGVoice.`,
};

const SEEDS = [
  {
    author: "Marisol Vega",
    handle: "@marisol_bodywise",
    body: `I'm on session 6 of my first cycle and wanted to share something that surprised me. The first three sessions I mostly just fell asleep. I thought I was doing it wrong. Session 4 I stayed awake the whole time and found this knot in my right hip that I've never noticed before. Not pain exactly, more like a holding pattern. I sent love there and my whole leg started twitching. Involuntary, like a muscle release. Lasted about two minutes.

The really strange part: I've had lower back tightness on that side for years and after that session it felt noticeably different. Still there, but softer. I'm curious what the next 9 sessions will show.`,
  },
  {
    author: "Kwame Asante",
    handle: "@kwame_rootwork",
    body: `Something that helped me: I started keeping a body map drawing. Just a simple outline of a human figure that I print fresh each session. After scanning, I color in the areas where I found tension with different colors for different sensations. Red for pain, yellow for warmth, blue for numbness, green for areas that felt open and alive.

After 15 sessions you can lay all the maps next to each other and see the pattern change over time. Some areas that were red in week one turned green by week three. Some areas I never even noticed in early sessions started showing up later. The visual record catches things the journal misses.`,
  },
  {
    author: "Anya Lindgren",
    handle: "@anya_stillwater",
    body: `Finished my second cycle last week. The first time through I was mostly learning to stay present for an hour without my mind taking over. By the second cycle something different happened. Around session 8, during a scan of my chest area, I started crying. No specific thought triggered it. Just a wave of grief that had apparently been living in my sternum.

I sat with it for the rest of the session. Didn't try to figure out what it was about. By the next session two days later, that area felt completely different. Lighter. More space. My breathing changed. I could take deeper breaths without the subtle catch I'd gotten so used to that I didn't even know it was there.

The body keeps everything. This practice gives it permission to let some of that go.`,
  },
];

async function main() {
  if (DRY_RUN) {
    console.log("=== DRY RUN ===\n");
    console.log(`Post: ${POST.title}\n${POST.body.slice(0, 200)}...\n`);
    for (const s of SEEDS) {
      console.log(`  Seed by ${s.author}: ${s.body.slice(0, 100)}...\n`);
    }
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL env var is required");
  const conn = await mysql.createConnection(dbUrl);

  try {
    // Find quest category
    const [cats] = await conn.execute(
      "SELECT id, slug FROM forumCategories WHERE slug IN ('quests-gameplay', 'rites-quests', 'general') ORDER BY FIELD(slug, 'quests-gameplay', 'rites-quests', 'general') LIMIT 1"
    ) as any;
    const catId = cats[0]?.id;
    if (!catId) throw new Error("No quest forum category found");
    console.log(`Using category: ${cats[0].slug} (id=${catId})`);

    // Get seed user (Rye)
    const [users] = await conn.execute(
      "SELECT id FROM users WHERE email = 'rieki.cordon@gmail.com' LIMIT 1"
    ) as any;
    let authorId = users[0]?.id;
    if (!authorId) {
      // Fallback to team user
      const [team] = await conn.execute(
        "SELECT id FROM users WHERE email = 'team@regencivics.earth' LIMIT 1"
      ) as any;
      authorId = team[0]?.id;
    }
    if (!authorId) throw new Error("No author user found");
    console.log(`Using author id=${authorId}`);

    // Check if post already exists
    const [existing] = await conn.execute(
      "SELECT id FROM forumPosts WHERE title = ? LIMIT 1",
      [POST.title]
    ) as any;

    let postId: number;
    if (existing.length > 0) {
      postId = existing[0].id;
      console.log(`Post already exists: id=${postId}`);
    } else {
      const [res] = await conn.execute(
        "INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned) VALUES (?, ?, ?, ?, 1)",
        [catId, authorId, POST.title, POST.body]
      ) as any;
      postId = res.insertId;
      console.log(`Created post: id=${postId}`);
    }

    // Add seed comments
    let added = 0;
    for (const seed of SEEDS) {
      const commentBody = `**${seed.author}** (${seed.handle})\n\n${seed.body}`;
      const [existingReply] = await conn.execute(
        "SELECT id FROM forumReplies WHERE postId = ? AND content LIKE ? LIMIT 1",
        [postId, `%${seed.author}%`]
      ) as any;
      if (existingReply.length > 0) {
        console.log(`  Skipped (exists): ${seed.author}`);
        continue;
      }
      await conn.execute(
        "INSERT INTO forumReplies (postId, authorId, content) VALUES (?, ?, ?)",
        [postId, authorId, commentBody]
      );
      added++;
      console.log(`  Added seed comment by ${seed.author}`);
    }

    console.log(`\nDone. Post id=${postId}, seed comments added: ${added}`);
    console.log(`Forum URL: /community/post/${postId}`);
    console.log(`\nUpdate questData.ts forumUrl to: "/community/post/${postId}"`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
