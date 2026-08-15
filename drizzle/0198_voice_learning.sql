-- 0196: the Harvest Phase 3 learning loop (CREATION_STATION_PLAN.md v2 s6).
--
-- voice_edits: one row per saved edit of a draft, the (ai_version,
-- edited_version) pair plus Rye's one-tap style/content call. Bodies are
-- PURGED (nulled) after rule extraction so the table never becomes an archive
-- of the private things Rye chose to cut.
-- voice_rules: derived style rules with weight and recurrence timestamps.
-- Rules are taxonomy-constrained; hard publishing rules are never stored here
-- (they live in the Worldview Pack and STEERING, supreme and immovable).

CREATE TABLE IF NOT EXISTS `voice_edits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `item_id` int NOT NULL,
  `channel` varchar(32) NOT NULL,
  `edit_kind` enum('style','content') NOT NULL DEFAULT 'content',
  `ai_version` mediumtext,
  `edited_version` mediumtext,
  `extracted_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `voice_edits_owner_kind_idx` (`owner_id`,`edit_kind`,`extracted_at`)
);

CREATE TABLE IF NOT EXISTS `voice_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `category` enum('word_swap','sentence_length','opener','closer','punctuation','formatting','aside') NOT NULL,
  `rule` varchar(500) NOT NULL,
  `weight` double NOT NULL DEFAULT 1,
  `first_seen` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `voice_rules_owner_weight_idx` (`owner_id`,`weight`)
);
