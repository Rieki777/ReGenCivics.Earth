-- A-7: remember which side of a needs/offers intro Resend accepted.
-- A row stamped before this column existed keeps emailSentAt and both ids null.
-- Those rows are not retried. Apply this file before the matcher reads the columns.

ALTER TABLE needs_offers_matches
  ADD COLUMN needResendId VARCHAR(64) NULL,
  ADD COLUMN offerResendId VARCHAR(64) NULL;
