-- 0225: Vision Plays.
-- A 'vision' play is a designed economic system submitted through the
-- Design a Play quest (needs-first proposal). 'culture' stays the original
-- 14-section packaged culture from an operating community. Adds the
-- robustness self-test (six dimensions after Olivier Hamant), the declared
-- needs framework, and real-world receipts. Also seeds the quest reward
-- variables, paid on moderation approval of a vision play.

ALTER TABLE plays
  ADD COLUMN kind ENUM('vision','culture') NOT NULL DEFAULT 'culture' AFTER communityType,
  ADD COLUMN needsFramework TEXT NULL AFTER kind,
  ADD COLUMN receipts TEXT NULL AFTER needsFramework,
  ADD COLUMN robustness JSON NULL AFTER receipts,
  ADD COLUMN campaignId INT NULL AFTER robustness;

INSERT IGNORE INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, isActive) VALUES
('Plays', NULL, 'plays.submission_reward_regen', 'Play Submission Reward ($ReGen)', 'ReGen tokens earned when your submitted Play is approved into the library', '2222', 'number', '2222', 1),
('Plays', NULL, 'plays.submission_reward_rgvoice', 'Play Submission Reward (RGVoice)', 'RGVoice earned when your submitted Play is approved into the library', '1', 'number', '1', 1);
