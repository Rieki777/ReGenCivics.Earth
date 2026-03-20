import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const categories = [
  { name: 'General Discussion', slug: 'general', description: 'Open conversations about regenerative living, systems thinking, and the movement.', icon: 'MessageCircle', color: '#4a7c59', sortOrder: 1 },
  { name: 'Land Projects', slug: 'land-projects', description: 'Share updates, ask questions, and discuss regenerative land projects.', icon: 'Trees', color: '#7dd87d', sortOrder: 2 },
  { name: 'Investment & Finance', slug: 'investment-finance', description: 'Discuss regenerative finance, impact investing, and fund structures.', icon: 'TrendingUp', color: '#d4a574', sortOrder: 3 },
  { name: 'Governance & DAO', slug: 'governance-dao', description: 'Explore governance models, Hypha DAO, and decision-making frameworks.', icon: 'Vote', color: '#e8b86d', sortOrder: 4 },
  { name: 'Quests & Gameplay', slug: 'quests-gameplay', description: 'Discuss quests, seasons, achievements, and the infinite game mechanics.', icon: 'Gamepad2', color: '#c77dba', sortOrder: 5 },
  { name: 'Alliance Partners', slug: 'alliance-partners', description: 'Connect with and discuss alliance partnerships and collaborations.', icon: 'Handshake', color: '#5b9bd5', sortOrder: 6 },
  { name: 'Introductions', slug: 'introductions', description: 'Introduce yourself to the community! Share your background and what brought you here.', icon: 'UserPlus', color: '#f0a35e', sortOrder: 8 },
  { name: 'Resources & Learning', slug: 'resources-learning', description: 'Share articles, books, courses, and other educational resources.', icon: 'BookOpen', color: '#6b8e7b', sortOrder: 9 },
  { name: 'Welcome Aboard Quests', slug: 'onboarding-quests', description: 'Discussion threads for the 10 Welcome Aboard quests. Share your completions, reflections, and social posts here.', icon: 'Compass', color: '#f0a35e', sortOrder: 7 },
];

for (const cat of categories) {
  await conn.execute(
    'INSERT INTO forumCategories (name, slug, description, icon, color, sortOrder) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
    [cat.name, cat.slug, cat.description, cat.icon, cat.color, cat.sortOrder]
  );
}

console.log('Forum categories seeded successfully');
await conn.end();
