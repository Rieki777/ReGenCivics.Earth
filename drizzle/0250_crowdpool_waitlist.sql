-- 'Tell me when crowdpooling opens' signups, per Game season. Mailed only by
-- admin Outbound. Every letter carries this row's token unsubscribe link.
CREATE TABLE IF NOT EXISTS `crowdpool_waitlist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `seasonNumber` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `name` varchar(255) NULL DEFAULT NULL,
  `unsubscribeToken` varchar(32) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `crowdpool_waitlist_season_email_uq` (`seasonNumber`, `email`),
  KEY `crowdpool_waitlist_token_idx` (`unsubscribeToken`)
);

-- Token lookups for the unsubscribe link on campaign follower letters.
CREATE INDEX `campaign_followers_token_idx` ON `campaign_followers` (`unsubscribeToken`);
