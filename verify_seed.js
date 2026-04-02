const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection('mysql://root:RAILWAY_PASSWORD_REDACTED@nozomi.proxy.rlwy.net:46413/railway');
  const [rows] = await conn.query("SELECT category, COUNT(1) as cnt FROM game_variables WHERE category IN ('citizenship','gratitude','trust','harvest','referral','proposals','organisations','projects') GROUP BY category ORDER BY category");
  console.table(rows);
  const [qt] = await conn.query('SELECT COUNT(1) as cnt FROM quest_unlock_tiers');
  const [lc] = await conn.query('SELECT COUNT(1) as cnt FROM lunar_cycles');
  console.log('quest_unlock_tiers:', qt[0].cnt, '| lunar_cycles:', lc[0].cnt);
  await conn.end();
})();
