-- 0193: quick_notes, the Harvest Phase 1 capture inbox
-- (CLAUDE_CODE_PROMPT_2026-06-26_HARVEST_PHASE1.md, build item 1).
--
-- One row per idea Rye captures by voice or text from the admin FAB. `id` is
-- the bridge's sync cursor (BIGINT, strictly increasing); `capture_id` is the
-- stable UUID the local second brain dedupes and marks-processed by. `audio_key`
-- points at the PRIVATE R2 prefix (harvest/voice/...), never a public URL.
-- No FK constraint on owner_id, matching the rest of the schema; the owner
-- gate lives in ownerProcedure and every query filters on owner_id.

CREATE TABLE IF NOT EXISTS `quick_notes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `capture_id` char(36) NOT NULL,
  `owner_id` int NOT NULL,
  `body` text NOT NULL,
  `source` enum('text','voice') NOT NULL DEFAULT 'text',
  `audio_key` varchar(512),
  `themes` json,
  `status` enum('inbox','processed') NOT NULL DEFAULT 'inbox',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` timestamp NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quick_notes_capture_id_unique` (`capture_id`),
  KEY `quick_notes_owner_status_id_idx` (`owner_id`,`status`,`id`)
);
