-- 0204: Crowdpooling updates journal + financial partner links.
-- Spec: CROWDPOOLING_PLATFORM_SPEC.md Part B Migration C (decisions 2, 7).
-- campaign_updates is the numbered public journal, updateNumber increments
-- per campaign in the procedure layer. campaign_partner_links holds the
-- Ma Earth / GoSteward / grant CTAs with nightly-hydrated cached numbers.
-- Money never touches us, the cached columns are read-only display state.
-- No FK constraints per repo convention, integrity lives in the procedure layer.

CREATE TABLE IF NOT EXISTS `campaign_updates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaignId` int NOT NULL,
  `authorId` int NOT NULL,
  `updateNumber` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `imageUrls` json NULL,
  `publishedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `campaign_updates_campaign_idx` (`campaignId`)
);

CREATE TABLE IF NOT EXISTS `campaign_partner_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaignId` int NOT NULL,
  `partner` enum('maearth','gosteward','grant','other') NOT NULL,
  `label` varchar(255) NULL DEFAULT NULL,
  `url` varchar(512) NOT NULL,
  `cachedRaised` int NULL DEFAULT NULL,
  `cachedContributorCount` int NULL DEFAULT NULL,
  `cachedPercent` int NULL DEFAULT NULL,
  `lastFetchedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `campaign_partner_links_campaign_idx` (`campaignId`)
);
