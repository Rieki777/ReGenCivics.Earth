/**
 * Seeds individual land project forum threads into the 'active-projects' category (id=11).
 * Each land project gets one top-level thread titled "ProjectName - Land Project Forum".
 *
 * Run AFTER making yourself superadmin:
 *   node scripts/seed-land-project-threads.mjs
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get the admin user id (rieki.cordon@gmail.com) to use as thread author
const [[adminUser]] = await conn.execute(
  "SELECT id FROM users WHERE email = 'rieki.cordon@gmail.com' LIMIT 1"
);
if (!adminUser) { console.error('Admin user not found'); process.exit(1); }
const authorId = adminUser.id;

// Category id for 'Land Project Spaces' (active-projects)
const CATEGORY_ID = 11;

const projects = [
  {
    name: 'Finca Sagrada',
    body: `Welcome to the Finca Sagrada community space. Share updates, questions, and connect with the team behind this land project in Ecuador.`,
  },
  {
    name: 'Liminal Village',
    body: `Welcome to the Liminal Village community space. Share updates, questions, and connect with the team behind this land project in Italy.`,
  },
  {
    name: 'Traditional Dream Factory',
    body: `Welcome to the Traditional Dream Factory community space. Share updates, questions, and connect with the team in Portugal.`,
  },
  {
    name: 'Heartland Collective',
    body: `Welcome to the Heartland Collective community space. Share updates, questions, and connect with the team in the USA.`,
  },
  {
    name: 'StarSeed Village',
    body: `Welcome to the StarSeed Village community space. Share updates, questions, and connect with the team here.`,
  },
  {
    name: 'The Nyx',
    body: `Welcome to The Nyx community space. Share updates, questions, and connect with the team here.`,
  },
  {
    name: 'NeighbourGood',
    body: `Welcome to the NeighbourGood community space. Share updates, questions, and connect with the team in South Africa.`,
  },
  {
    name: 'La Tierra',
    body: `Welcome to the La Tierra community space. Share updates, questions, and connect with the team here.`,
  },
];

let created = 0;
let skipped = 0;

for (const project of projects) {
  const title = `${project.name} - Land Project Forum`;
  // Check if thread already exists
  const [[existing]] = await conn.execute(
    'SELECT id FROM forumPosts WHERE title = ? AND categoryId = ? LIMIT 1',
    [title, CATEGORY_ID]
  );
  if (existing) {
    console.log(`  skip: "${title}" (already exists, id=${existing.id})`);
    skipped++;
    continue;
  }
  await conn.execute(
    `INSERT INTO forumPosts (title, content, categoryId, authorId, isPinned, replyCount, viewCount, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 1, 0, 0, NOW(), NOW())`,
    [title, project.body, CATEGORY_ID, authorId]
  );
  console.log(`  created: "${title}"`);
  created++;
}

console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
await conn.end();
