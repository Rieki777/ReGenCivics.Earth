-- 0192: custom_game_applications, the intake pipeline for the Custom Games
-- product line (CUSTOM_GAMES_MASTER_PLAN.md, Workstream C).
--
-- One row per application from /custom-games/apply. blueprintDraft holds the
-- progressive blueprint.json v0.3 (shared/customGameBlueprint.ts, draft shape);
-- transcript holds the full Sylva conversation so the generation session can
-- write content in the applicant's own voice. MEDIUMTEXT because a 60-turn
-- conversation can pass the 64KB TEXT limit. score is the auto-qualification
-- score computed at submit (land status + budget + team hours + timeline).
-- Provider names only ever land in blueprintDraft.integrations; keys never do.

CREATE TABLE IF NOT EXISTS `custom_game_applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `applicant_name` varchar(255) NOT NULL,
  `applicant_email` varchar(255) NOT NULL,
  `applicant_role` varchar(50) NOT NULL,
  `project_name` varchar(255) NOT NULL,
  `status` enum('draft','submitted','reviewing','in_conversation','accepted','declined') NOT NULL DEFAULT 'submitted',
  `blueprint_draft` json,
  `transcript` mediumtext,
  `score` int NOT NULL DEFAULT 0,
  `internal_notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `custom_game_applications_status_idx` (`status`),
  KEY `custom_game_applications_email_idx` (`applicant_email`)
);
