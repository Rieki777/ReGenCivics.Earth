import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  'SELECT fc.name, fc.slug, COUNT(fp.id) as posts FROM forumCategories fc LEFT JOIN forumPosts fp ON fp.categoryId = fc.id GROUP BY fc.id ORDER BY fc.name'
);
console.table(rows);
await conn.end();
