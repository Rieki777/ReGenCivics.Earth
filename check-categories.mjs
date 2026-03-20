import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check what columns forumCategories actually has
const [cols] = await conn.execute('DESCRIBE forumCategories');
console.log('\n--- forumCategories columns ---');
console.table(cols);

// And show all the data in it
const [rows] = await conn.execute('SELECT * FROM forumCategories ORDER BY name');
console.log('\n--- forumCategories data ---');
console.table(rows);

await conn.end();
