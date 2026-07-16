/**
 * seed-forum-posts.mjs
 *
 * Seeds starter posts into the forum.
 * - One pinned welcome thread per category
 * - One discussion thread per quest in the quests-gameplay category
 *
 * Column names verified against drizzle/schema.ts:
 *   forumPosts: categoryId, authorId, title, content, isPinned
 *
 * Usage:
 *   DATABASE_URL=<railway-mysql-url> ADMIN_USER_ID=1 node seed-forum-posts.mjs
 *
 * Find your admin user ID first:
 *   SELECT id FROM users LIMIT 5;
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

// Set this to the numeric id of the admin user in the `users` table
const ADMIN_USER_ID = process.env.ADMIN_USER_ID ? Number(process.env.ADMIN_USER_ID) : 1;

const conn = await mysql.createConnection(DATABASE_URL);

// Fetch all categories by slug
const [cats] = await conn.execute('SELECT id, slug, name FROM forumCategories ORDER BY sortOrder');
console.log(`Found ${cats.length} forum categories:`);
cats.forEach(c => console.log(`  ${c.slug} (id=${c.id})`));

if (cats.length === 0) {
  console.error('\nERROR: No categories found. Run seed-forum.mjs first to seed categories.');
  await conn.end();
  process.exit(1);
}

const catMap = Object.fromEntries(cats.map(c => [c.slug, c.id]));

// ─── Pinned welcome threads (one per category) ──────────────────────────────
const welcomePosts = [
  {
    categorySlug: 'general',
    title: 'Welcome to General Discussion',
    content: 'This is the space for open conversations about regenerative living, systems thinking, and the movement. Introduce a topic, share a thought, or start a debate.',
  },
  {
    categorySlug: 'land-projects',
    title: 'Share Your Land Project',
    content: "Post updates on your regenerative land project here — what you're building, where you are, what you've learned. Connect with others on similar paths.",
  },
  {
    categorySlug: 'investment-finance',
    title: 'Regenerative Finance — Start Here',
    content: 'Welcome to the investment & finance category. Discuss impact investing, fund structures, and how capital can serve regeneration rather than extraction.',
  },
  {
    categorySlug: 'governance-dao',
    title: 'Governance Models & Hypha DAO',
    content: 'Explore governance frameworks, Hypha DAO tooling, and decision-making approaches for regenerative organisations. Share what works and what does not.',
  },
  {
    categorySlug: 'quests-gameplay',
    title: 'Welcome to Quests & Gameplay',
    content: 'This category hosts discussion threads for each quest in the ReGen Civics infinite game. Start a quest thread, share your progress, ask for help, and celebrate completions.',
  },
  {
    categorySlug: 'alliance-partners',
    title: 'Alliance Partners — Introductions',
    content: "Alliance partners: introduce your organisation here. Tell us what you're building and how you collaborate with the regenerative network.",
  },
  {
    categorySlug: 'introductions',
    title: 'Introduce Yourself!',
    content: "New here? Post a short introduction — who you are, where you're from, and what brought you to the regenerative civics movement. We'd love to meet you.",
  },
  {
    categorySlug: 'resources-learning',
    title: 'Recommended Resources',
    content: 'Share books, articles, courses, podcasts, and tools that have shaped your thinking on regeneration, governance, and land stewardship.',
  },
];

console.log('\nSeeding welcome posts...');
let welcomeCount = 0;
for (const post of welcomePosts) {
  const catId = catMap[post.categorySlug];
  if (!catId) {
    console.warn(`  SKIP: category slug "${post.categorySlug}" not found`);
    continue;
  }
  await conn.execute(
    'INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned) VALUES (?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE isPinned=1',
    [catId, ADMIN_USER_ID, post.title, post.content]
  );
  console.log(`  Pinned: "${post.title}" → ${post.categorySlug}`);
  welcomeCount++;
}

// ─── Quest discussion threads (in quests-gameplay) ──────────────────────────
const questsCatId = catMap['quests-gameplay'];
if (!questsCatId) {
  console.warn('\nSKIP: quests-gameplay category not found — skipping quest threads');
} else {
  const quests = [
    { title: 'Quest 0 — Welcome to the Infinite Game',    content: 'Discussion thread for Quest 0. Share your experience stepping into the game for the first time, ask questions, and connect with others just beginning their journey.' },
    { title: 'Quest 1 — Discover Your Biome',             content: 'Discussion thread for Quest 1. Share your biome discoveries, the ecosystems around you, and what you are learning about the living world where you are.' },
    { title: 'Quest 2 — Saving Seeds',                    content: 'Discussion thread for Quest 2. Share your seed saving experiences, varieties you are preserving, and tips for other players working with seeds.' },
    { title: 'Quest 3 — Water Wisdom',                    content: 'Discussion thread for Quest 3. Share your water stewardship practices, observations about water in your landscape, and what you are learning.' },
    { title: 'Quest 4 — Soil Stewardship',                content: 'Discussion thread for Quest 4. Share your soil observations, composting experiments, and what you are discovering about the underground world.' },
    { title: 'Quest 5 — Food Forest Fundamentals',        content: 'Discussion thread for Quest 5. Share your food forest designs, plant guilds, and progress establishing perennial food systems.' },
    { title: 'Quest 6 — Community Weaving',               content: 'Discussion thread for Quest 6. Share how you are building community connections and weaving regenerative culture in your local context.' },
    { title: 'Quest 7 — Regenerative Finance Basics',     content: 'Discussion thread for Quest 7. Share what you are learning about regenerative economics, mutual credit, and alternative financial systems.' },
    { title: 'Quest 8 — Governance & Decision Making',    content: 'Discussion thread for Quest 8. Share your experiences with consent-based governance, sociocracy, and participatory decision making.' },
    { title: 'Quest 9 — Land Stewardship',                content: 'Discussion thread for Quest 9. Share your land stewardship practices, observations, and the relationship you are cultivating with your land.' },
    { title: 'Quest 10 — Alliance Building',              content: 'Discussion thread for Quest 10. Share how you are building alliances, connecting projects, and weaving the regenerative network.' },
    { title: 'Quest 11 — The Living Lab',                 content: 'Discussion thread for Quest 11. Share your experiments, observations, and insights from turning your land or community into a living laboratory.' },
    { title: 'Quest 12 — Season Completion',              content: 'Discussion thread for Quest 12. Celebrate completing a full season, reflect on your journey, and share what you are taking forward.' },
    { title: 'Food Foresting — Practitioner Discussion',  content: 'A space for practitioners actively engaged in food forest design and establishment. Share detailed experiences, species combinations, and lessons learned.' },
  ];

  console.log('\nSeeding quest discussion threads...');
  let questCount = 0;
  for (const q of quests) {
    await conn.execute(
      'INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned) VALUES (?, ?, ?, ?, 0) ON DUPLICATE KEY UPDATE title=VALUES(title)',
      [questsCatId, ADMIN_USER_ID, q.title, q.content]
    );
    console.log(`  Thread: "${q.title}"`);
    questCount++;
  }
  console.log(`\nQuest threads seeded: ${questCount}`);
}

console.log(`\nDone. Welcome posts seeded: ${welcomeCount}`);
console.log('\nVerify with:');
console.log('  SELECT categoryId, COUNT(*) as posts, SUM(isPinned) as pinned FROM forumPosts GROUP BY categoryId;');

await conn.end();
