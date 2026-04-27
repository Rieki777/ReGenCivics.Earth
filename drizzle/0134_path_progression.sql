-- 0134_path_progression.sql
--
-- 2026-04-26: path-based citizenship tier progression.
--
-- Implements the model in QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md:
--   * Each player can walk multiple paths in parallel (Investor, Land
--     Project, Alliance Partner, ReGen Player).
--   * Co-Creator and Steward tiers are earned per-path against concrete
--     milestones (LOI signed, application approved, 14 Rites complete,
--     33 quests + 144 votes, etc.). Sage stays cross-path percentile.
--   * Tier earn pays a one-shot RGVoice bonus to private ledger
--     (77 / 144 / 233). Player claims it on Hypha via the existing
--     redeem-tokens flow.
--   * tier_events is the audit log used for idempotency and timeline.
--
-- Backfill: forward-only. Existing players who already meet criteria
-- on migration day do NOT auto-earn. Detector starts fresh from the
-- moment this ships.
--
-- The existing player_profiles.path enum field stays in place but
-- becomes deprecated. Read from player_paths going forward.

-- Per-user-per-path state. One row per (user, path). Created when the
-- player first declares the path (auto on relevant action, or via
-- explicit Add a Path button in Profile).
CREATE TABLE IF NOT EXISTS player_paths (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  path ENUM('investor', 'land_project', 'ally', 'player') NOT NULL,
  declaredAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  coCreatorEarnedAt TIMESTAMP NULL,
  stewardEarnedAt TIMESTAMP NULL,
  coCreatorBonusClaimedAt TIMESTAMP NULL,
  stewardBonusClaimedAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY player_paths_user_path_uniq (userId, path),
  INDEX player_paths_userId_idx (userId),
  INDEX player_paths_path_idx (path)
);

-- Audit log of tier-progression events. Used for:
--   * Detector idempotency: detector checks for existing rows of the
--     matching (userId, eventType, path) before crediting bonuses.
--   * Profile timeline: render "Co-Creator earned on Investor path
--     on Apr 26 2026" entries.
--   * Reconciliation: the bonus_claimed event references the original
--     earned event via details.originalEventId.
CREATE TABLE IF NOT EXISTS tier_events (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  eventType ENUM(
    'co_creator_earned',
    'steward_earned',
    'sage_earned',
    'bonus_claimed'
  ) NOT NULL,
  path ENUM('investor', 'land_project', 'ally', 'player') NULL,
  amountCredited INT NULL,                          -- 77, 144, or 233 RGVoice
  occurredAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details JSON NULL,                                -- free-form context (e.g. originalEventId)
  INDEX tier_events_userId_idx (userId),
  INDEX tier_events_eventType_idx (eventType),
  INDEX tier_events_path_idx (path),
  INDEX tier_events_occurredAt_idx (occurredAt)
);
