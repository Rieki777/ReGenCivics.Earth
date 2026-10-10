-- A way back for a campaign the review team sends back (P2). ADDITIVE ONLY:
-- two nullable columns. Old code never reads them, and every public read is an
-- allowlist (PUBLIC_CAMPAIGN_FIELDS), so neither ever leaves the hub publicly.
-- stewardReviewNote is the note the send-back notice already carries, kept in
-- its own column so adminNotes stays admin-only. sentBackAt is when the review
-- team last sent the campaign back. MariaDB and MySQL 8+ compatible.
--
-- Safe to apply before the deploy: old code writes and reads neither column.
-- Deploys do not run migrations.
--   npx tsx scripts/run-migration.ts drizzle/0296_campaign_send_back.sql

ALTER TABLE `campaigns`
  ADD COLUMN `stewardReviewNote` TEXT NULL DEFAULT NULL,
  ADD COLUMN `sentBackAt` TIMESTAMP NULL DEFAULT NULL;
