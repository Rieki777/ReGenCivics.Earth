-- 0195: the Harvest Phase 2 feed (CLAUDE_CODE_PROMPT_2026-06-26_HARVEST_PHASE2.md,
-- Stage 3 of BUILD_SEQUENCE_MASTER.md; data model per CREATION_STATION_PLAN.md v2 s7).
--
-- harvest_ideas: the ripe-ideas tier. The vault computes the deterministic
-- ripeness components locally (brain layer); the bridge pushes curated idea
-- text + components up; the worker composes the score and detects 0.6
-- transitions. idea_ref is the vault note ref or capture UUID.
-- creation_items: drafted copy per (owner, idea, channel). ai_body keeps the
-- untouched AI draft so an edit forms the (ai_body, body) pair Phase 3 learns
-- from. Write-once from the worker after status leaves 'ready'.
-- source_index: the addressable provenance store (raw message/capture rows).
-- harvest_runs: append-only run stats for the status line.

CREATE TABLE IF NOT EXISTS `harvest_ideas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `idea_ref` varchar(191) NOT NULL,
  `title` varchar(300) NOT NULL,
  `summary` text,
  `themes` json,
  `ripeness` double NOT NULL DEFAULT 0,
  `score_components` json,
  `why_now` varchar(500),
  `source_refs` json,
  `status` enum('ripe','snoozed','suppressed','developed') NOT NULL DEFAULT 'ripe',
  `snoozed_until` timestamp NULL,
  `steer` text,
  `crossed_at` timestamp NULL,
  `drafted_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `harvest_ideas_owner_ref_unique` (`owner_id`,`idea_ref`),
  KEY `harvest_ideas_owner_status_ripeness_idx` (`owner_id`,`status`,`ripeness`)
);

CREATE TABLE IF NOT EXISTS `creation_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `idea_id` int,
  `capture_id` varchar(191) NOT NULL,
  `channel` varchar(32) NOT NULL,
  `ripeness` double NOT NULL DEFAULT 0,
  `angle` varchar(200),
  `ai_body` mediumtext,
  `body` mediumtext,
  `source_refs` json,
  `status` enum('ready','edited','shipped') NOT NULL DEFAULT 'ready',
  `posted_text` mediumtext,
  `posted_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `creation_items_owner_capture_channel_unique` (`owner_id`,`capture_id`,`channel`),
  KEY `creation_items_owner_status_idx` (`owner_id`,`status`)
);

CREATE TABLE IF NOT EXISTS `source_index` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `ref_id` varchar(64) NOT NULL,
  `date` datetime NULL,
  `text` mediumtext,
  `links` json,
  `forwarded_from` varchar(300),
  `media` varchar(64),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `source_index_owner_ref_unique` (`owner_id`,`ref_id`)
);

CREATE TABLE IF NOT EXISTS `harvest_runs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kind` enum('bridge','generation','seed') NOT NULL,
  `ran_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `stats` json,
  PRIMARY KEY (`id`),
  KEY `harvest_runs_kind_ran_idx` (`kind`,`ran_at`)
);
