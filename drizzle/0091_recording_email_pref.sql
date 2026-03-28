-- Add recording email preference to newsletter subscribers
ALTER TABLE newsletter_subscribers ADD COLUMN notifyRecordings TINYINT(1) NOT NULL DEFAULT 0;
