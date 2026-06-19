-- 0136_analytics_events: first-party analytics event sink.
--
-- Stores events posted by client/src/lib/analytics.ts via the public
-- /api/analytics/collect ingest route. No third-party tracker, no
-- cookies. IP is hashed before storage so we keep a per-IP rate-limit
-- counter without storing raw addresses.
--
-- Indices target the three admin queries: volume over time (createdAt),
-- top events (event, createdAt), and the cta_click funnel (path,
-- createdAt). Session id index supports per-session funnels later.

CREATE TABLE IF NOT EXISTS analytics_events (
  id             BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event          VARCHAR(64)  NOT NULL,
  props          JSON         NULL,
  path           VARCHAR(255) NULL,
  ref            VARCHAR(512) NULL,
  sid            VARCHAR(64)  NULL,
  userId         INT          NULL,
  ipHash         VARCHAR(64)  NULL,
  ua             VARCHAR(512) NULL,
  createdAt      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_analytics_created (createdAt),
  INDEX idx_analytics_event_created (event, createdAt),
  INDEX idx_analytics_path_created (path, createdAt),
  INDEX idx_analytics_sid_created (sid, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
