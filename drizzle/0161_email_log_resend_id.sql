-- Store the Resend message id on each email log so the Resend delivery webhook
-- can update the exact row instead of guessing by recipient. Nullable and
-- indexed for the webhook lookup. Older rows stay null and fall back to the
-- recipient match.
ALTER TABLE email_logs ADD COLUMN resendEmailId VARCHAR(255) NULL;
CREATE INDEX email_logs_resendEmailId_idx ON email_logs (resendEmailId);
