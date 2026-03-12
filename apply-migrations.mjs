import mysql from 'mysql2/promise';

const DB_URL = 'mysql://root:RAILWAY_PASSWORD_REDACTED@nozomi.proxy.rlwy.net:46413/railway';

const conn = await mysql.createConnection(DB_URL);

// 0038: player_contributions table
console.log('Applying 0038: player_contributions...');
await conn.query(`CREATE TABLE IF NOT EXISTS player_contributions (
  id int NOT NULL AUTO_INCREMENT,
  profileId int NOT NULL,
  userId int NOT NULL,
  capitalType enum('financial','social','cultural','living','intellectual','experiential','material','spiritual') NOT NULL,
  title varchar(255) NOT NULL,
  description text,
  estimatedValue int,
  projectName varchar(255),
  evidenceUrl varchar(512),
  status enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  verifiedAt timestamp NULL,
  createdAt timestamp NOT NULL DEFAULT (now()),
  updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_player_contributions_profileId (profileId),
  KEY idx_player_contributions_userId (userId)
)`);
console.log('  player_contributions: OK');

// 0037: emailDigestFrequency
console.log('Applying 0037: emailDigestFrequency...');
await conn.query('DROP PROCEDURE IF EXISTS _rc_migrate_0037_alters');
await conn.query(`CREATE PROCEDURE _rc_migrate_0037_alters()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='player_profiles' AND COLUMN_NAME='emailDigestFrequency') THEN
    ALTER TABLE player_profiles ADD emailDigestFrequency enum('never','weekly','monthly','seasonal') DEFAULT 'monthly' NOT NULL;
  END IF;
END`);
await conn.query('CALL _rc_migrate_0037_alters()');
await conn.query('DROP PROCEDURE IF EXISTS _rc_migrate_0037_alters');
console.log('  emailDigestFrequency: OK');

// 0039: meetingFrequency + dietaryPatterns
console.log('Applying 0039: meetingFrequency + dietaryPatterns...');
await conn.query('DROP PROCEDURE IF EXISTS add_meeting_frequency');
await conn.query(`CREATE PROCEDURE add_meeting_frequency()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='applications' AND COLUMN_NAME='meetingFrequency') THEN
    ALTER TABLE applications ADD COLUMN meetingFrequency enum('everyday','2_3x_week','weekly','2_3x_month','monthly','2_3x_year','yearly_plus');
  END IF;
END`);
await conn.query('CALL add_meeting_frequency()');
await conn.query('DROP PROCEDURE IF EXISTS add_meeting_frequency');

await conn.query('DROP PROCEDURE IF EXISTS add_dietary_patterns');
await conn.query(`CREATE PROCEDURE add_dietary_patterns()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='applications' AND COLUMN_NAME='dietaryPatterns') THEN
    ALTER TABLE applications ADD COLUMN dietaryPatterns text;
  END IF;
END`);
await conn.query('CALL add_dietary_patterns()');
await conn.query('DROP PROCEDURE IF EXISTS add_dietary_patterns');
console.log('  meetingFrequency + dietaryPatterns: OK');

// Verify
const [c1] = await conn.query("SHOW COLUMNS FROM player_profiles LIKE 'emailDigestFrequency'");
const [c2] = await conn.query("SHOW TABLES LIKE 'player_contributions'");
const [c3] = await conn.query("SHOW COLUMNS FROM applications LIKE 'meetingFrequency'");
console.log('\nVERIFICATION:');
console.log('  emailDigestFrequency:', c1.length ? 'EXISTS ✓' : 'MISSING ✗');
console.log('  player_contributions:', c2.length ? 'EXISTS ✓' : 'MISSING ✗');
console.log('  meetingFrequency:', c3.length ? 'EXISTS ✓' : 'MISSING ✗');

await conn.end();
console.log('\nDone.');
