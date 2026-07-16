const mysql = require('mysql2/promise');
(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL first');
    process.exit(1);
  }

  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.query("SELECT category, COUNT(1) as cnt FROM game_variables WHERE category IN ('citizenship','gratitude','trust','harvest','referral','proposals','organisations','projects') GROUP BY category ORDER BY category");
  console.table(rows);
  const [qt] = await conn.query('SELECT COUNT(1) as cnt FROM quest_unlock_tiers');
  const [lc] = await conn.query('SELECT COUNT(1) as cnt FROM lunar_cycles');
  console.log('quest_unlock_tiers:', qt[0].cnt, '| lunar_cycles:', lc[0].cnt);
  await conn.end();
})();
