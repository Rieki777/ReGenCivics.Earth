DROP PROCEDURE IF EXISTS `_rc_migrate_0037_alters`;
--> statement-breakpoint
CREATE PROCEDURE `_rc_migrate_0037_alters`()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='player_profiles' AND COLUMN_NAME='emailDigestFrequency') THEN
    ALTER TABLE `player_profiles` ADD `emailDigestFrequency` enum('never','weekly','monthly','seasonal') DEFAULT 'monthly' NOT NULL;
  END IF;
END
--> statement-breakpoint
CALL `_rc_migrate_0037_alters`();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `_rc_migrate_0037_alters`;
