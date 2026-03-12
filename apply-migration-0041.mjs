import mysql from 'mysql2/promise';

const conn = await mysql.createConnection('mysql://root:RAILWAY_PASSWORD_REDACTED@nozomi.proxy.rlwy.net:46413/railway');

console.log('Applying 0041: generatedImageUrl columns...');

await conn.query('DROP PROCEDURE IF EXISTS add_forum_image_url');
await conn.query(`CREATE PROCEDURE add_forum_image_url()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='forumPosts' AND COLUMN_NAME='generatedImageUrl') THEN
    ALTER TABLE forumPosts ADD COLUMN generatedImageUrl varchar(512) NULL AFTER lastReplyBy;
  END IF;
END`);
await conn.query('CALL add_forum_image_url()');
await conn.query('DROP PROCEDURE IF EXISTS add_forum_image_url');

await conn.query('DROP PROCEDURE IF EXISTS add_campaign_image_url');
await conn.query(`CREATE PROCEDURE add_campaign_image_url()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='campaigns' AND COLUMN_NAME='generatedImageUrl') THEN
    ALTER TABLE campaigns ADD COLUMN generatedImageUrl varchar(512) NULL AFTER reviewedAt;
  END IF;
END`);
await conn.query('CALL add_campaign_image_url()');
await conn.query('DROP PROCEDURE IF EXISTS add_campaign_image_url');

const [f] = await conn.query("SHOW COLUMNS FROM forumPosts LIKE 'generatedImageUrl'");
const [c] = await conn.query("SHOW COLUMNS FROM campaigns LIKE 'generatedImageUrl'");
console.log('forumPosts.generatedImageUrl:', f.length ? 'EXISTS ✓' : 'MISSING ✗');
console.log('campaigns.generatedImageUrl:', c.length ? 'EXISTS ✓' : 'MISSING ✗');

await conn.end();
console.log('Done.');
