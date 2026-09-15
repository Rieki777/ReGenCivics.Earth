-- Community / newsletter email preference center.
-- Investor mail stays on investor_inquiries and is not a topic here.
-- recordings stays on notifyRecordings: existing values are kept, new rows default ON.

ALTER TABLE `newsletter_subscribers`
  ADD COLUMN `prefSeasonal` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN `prefOpenAccess` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN `prefSeason2` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN `prefEvents` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN `marketingPausedUntil` TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE `newsletter_subscribers`
  MODIFY COLUMN `notifyRecordings` TINYINT(1) NOT NULL DEFAULT 1;
