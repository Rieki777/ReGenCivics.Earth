SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'player_profiles' AND COLUMN_NAME = 'emailDigestFrequency');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `player_profiles` ADD `emailDigestFrequency` enum(''never'',''weekly'',''monthly'',''seasonal'') DEFAULT ''monthly'' NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
