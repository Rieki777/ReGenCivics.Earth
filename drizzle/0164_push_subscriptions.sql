-- Web push subscriptions (Phase 1B of the forum upgrade).
-- One row per browser endpoint. endpoint is unique so re-subscribing the
-- same browser upserts instead of duplicating. failureCount drives pruning:
-- 410/404 from the push service deletes the row immediately, repeated other
-- failures prune it after a threshold.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  userAgent VARCHAR(255) NULL,
  failureCount INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lastSeenAt TIMESTAMP NULL,
  UNIQUE KEY push_subscriptions_endpoint_uq (endpoint),
  KEY push_subscriptions_user_idx (userId)
);
