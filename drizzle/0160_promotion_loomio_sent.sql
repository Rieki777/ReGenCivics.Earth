-- Track when a signed promotion request was shipped to Loomio, so the hourly
-- sendSignedPromotionsToLoomio job doesn't re-create a Loomio discussion+poll
-- every hour until the poll_created webhook fires back (which may be slow or
-- misconfigured). Once loomioSentAt is set, the job skips the request.
ALTER TABLE forumPromotionRequests ADD COLUMN loomioSentAt TIMESTAMP NULL;
