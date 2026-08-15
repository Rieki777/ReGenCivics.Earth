-- 0201: the Harvest Phase 5, Compose to Publish
-- (CREATION_STATION_PLAN.md v2 s5b + s7; Stage 6 of BUILD_SEQUENCE_MASTER.md).
--
-- publications groups everything born from one composed idea. publication_targets
-- holds per-surface state so publishing is staged and idempotent: nothing public
-- ever fires from a raw or unapproved draft. images stores generated options per
-- slot with REQUIRED alt text (accessibility is a project rule); keys point at
-- the private R2 prefix. published_articles is the runtime blog surface: the
-- static blogPosts.ts remains for existing posts, composed articles publish
-- here (hidden preview first, then public).

CREATE TABLE IF NOT EXISTS `publications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `idea_id` int,
  `title` varchar(300) NOT NULL,
  `source_refs` json,
  `status` enum('draft','partially_published','published') NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `publications_owner_idx` (`owner_id`,`created_at`)
);

CREATE TABLE IF NOT EXISTS `publication_targets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `publication_id` int NOT NULL,
  `surface` enum('site','linkedin','facebook','instagram','threads_x','email') NOT NULL,
  `item_id` int,
  `status` enum('draft','approved','scheduled','published','failed') NOT NULL DEFAULT 'draft',
  `scheduled_for` timestamp NULL,
  `external_url` varchar(600),
  `published_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `publication_targets_pub_surface_unique` (`publication_id`,`surface`)
);

CREATE TABLE IF NOT EXISTS `images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `publication_id` int NOT NULL,
  `slot` enum('hero','inline') NOT NULL,
  `r2_key` varchar(512) NOT NULL,
  `url` varchar(600) NOT NULL,
  `alt_text` varchar(500) NOT NULL,
  `prompt` text,
  `chosen` tinyint NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `images_publication_slot_idx` (`publication_id`,`slot`)
);

CREATE TABLE IF NOT EXISTS `published_articles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `publication_id` int,
  `slug` varchar(200) NOT NULL,
  `title` varchar(300) NOT NULL,
  `excerpt` varchar(600),
  `content` mediumtext NOT NULL,
  `author` varchar(120) NOT NULL DEFAULT 'Rieki Cordon',
  `hero_image_url` varchar(600),
  `hero_image_alt` varchar(500),
  `tags` json,
  `preview_token` char(36) NOT NULL,
  `status` enum('preview','public','unpublished') NOT NULL DEFAULT 'preview',
  `published_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `published_articles_slug_unique` (`slug`)
);
