/**
 * Seed forum post: "Heal the Land, Heal Ourselves" announcement.
 * REQUIRES: Set AUTHOR_USER_ID env var to Rye's DB user ID before running.
 * Run: source .env && AUTHOR_USER_ID=YOUR_ID node scripts/seed-heal-forum-post.mjs
 */
import mysql from "mysql2/promise";

const AUTHOR_ID = parseInt(process.env.AUTHOR_USER_ID || "0");
if (!AUTHOR_ID) {
  console.error("Set AUTHOR_USER_ID env var to your DB user ID");
  process.exit(1);
}

const title = "Heal the Land, Heal Ourselves: We're Looking for Land Project Partners";
const content = `The Church of the Regenerative Earth has designed a three-stage community healing ministry called **Heal the Land, Heal Ourselves**.

It starts with free food outreach. Grows into community gardening days on partner land project sites. And for those called to go deeper, offers land residency alongside projects being restored.

**We need land project partners.**

If you are stewarding a regenerative farm, food forest, permaculture property, or ecological restoration site, we want to talk. In exchange for hosting the program, the Church designs and builds a custom civic coordination game for your local food system at no cost. Custom quests, token rewards, governance tools, community onboarding.

You bring the land. We bring the game. Together we build something better.

**Learn more:** [regencivics.earth/heal-the-land](/heal-the-land)
**Apply:** [regencivics.earth/land](/land#heal-program)

The land is waiting. The people are waiting. We just need somewhere to meet.`;

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Find the Land Projects category
  const [cats] = await conn.execute("SELECT id FROM forumCategories WHERE slug = 'land-projects' OR slug = 'active-projects' LIMIT 1");
  const categoryId = cats[0]?.id;
  if (!categoryId) {
    console.error("Could not find land-projects forum category");
    await conn.end();
    return;
  }

  // Check if already posted
  const [existing] = await conn.execute("SELECT id FROM forumPosts WHERE title = ? LIMIT 1", [title]);
  if (existing.length > 0) {
    console.log("Forum post already exists, skipping");
    await conn.end();
    return;
  }

  await conn.execute(
    "INSERT INTO forumPosts (authorId, categoryId, title, content, isPinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, NOW(), NOW())",
    [AUTHOR_ID, categoryId, title, content]
  );
  console.log("Forum post seeded and pinned in Land Projects category");
  await conn.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
