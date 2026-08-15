-- 0206: call_insights, the community-call intelligence layer (Stage 7,
-- decided with Rye 2026-07-17: suggestions-first, never auto-tasks).
--
-- One extraction pass per recording (cached on recording_id, never
-- reprocessed) emits typed insights. wisdom/idea rows flow to the vault
-- ("10 Community Calls") and can ripen into the Harvest feed; decision/
-- commitment/role_change/strategic_move rows surface in /admin/calls as
-- SUGGESTIONS with accept/dismiss. speaker keeps attribution (community
-- words are not Rye's words; the voice loop never trains on these).

CREATE TABLE IF NOT EXISTS `call_insights` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recording_id` int NOT NULL,
  `kind` enum('wisdom','idea','decision','commitment','role_change','strategic_move') NOT NULL,
  `content` varchar(1000) NOT NULL,
  `speaker` varchar(120),
  `timestamp_secs` int,
  `status` enum('suggested','accepted','dismissed') NOT NULL DEFAULT 'suggested',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `call_insights_recording_idx` (`recording_id`,`kind`),
  KEY `call_insights_status_idx` (`status`,`kind`,`created_at`)
);
