-- Migration: Add meetingFrequency and dietaryPatterns to applications table
-- Uses stored procedures for idempotent ALTER TABLE (mysql2 single-statement limitation)

DROP PROCEDURE IF EXISTS add_meeting_frequency;
CREATE PROCEDURE add_meeting_frequency()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'applications'
      AND COLUMN_NAME = 'meetingFrequency'
  ) THEN
    ALTER TABLE `applications`
      ADD COLUMN `meetingFrequency` enum('everyday','2_3x_week','weekly','2_3x_month','monthly','2_3x_year','yearly_plus');
  END IF;
END;
CALL add_meeting_frequency();
DROP PROCEDURE IF EXISTS add_meeting_frequency;

DROP PROCEDURE IF EXISTS add_dietary_patterns;
CREATE PROCEDURE add_dietary_patterns()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'applications'
      AND COLUMN_NAME = 'dietaryPatterns'
  ) THEN
    ALTER TABLE `applications`
      ADD COLUMN `dietaryPatterns` text;
  END IF;
END;
CALL add_dietary_patterns();
DROP PROCEDURE IF EXISTS add_dietary_patterns;
