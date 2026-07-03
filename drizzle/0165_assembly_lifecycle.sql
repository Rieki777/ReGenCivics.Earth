-- Migration 0165: Assembly proposal lifecycle (ASSEMBLY_PAGE_SPEC.md sections 2, 9)
-- Aim line, lanes (full / minor lazy-consent), last call, resting, the launch
-- bridge key, and an append-only objection log kept on the proposal row.
-- Lifecycle states last call and resting are derived from timestamps, never
-- new status enum values. Ready-to-launch reuses status threshold_reached.

ALTER TABLE proposals
  ADD COLUMN aim VARCHAR(300) NULL,
  ADD COLUMN lane ENUM('full','minor') NOT NULL DEFAULT 'full',
  ADD COLUMN lastCallStartedAt TIMESTAMP NULL,
  ADD COLUMN restingSince TIMESTAMP NULL,
  ADD COLUMN readyToLaunchAt TIMESTAMP NULL,
  ADD COLUMN hyphaBridgeKey VARCHAR(32) NULL,
  ADD COLUMN executionPayload JSON NULL,
  ADD COLUMN objectionLog JSON NULL;

INSERT INTO game_variables (category, subcategory, `key`, displayName, description, value, valueType, defaultValue, `minValue`, `maxValue`) VALUES
('governance', 'assembly', 'governance.minor_lane_quiet_days', 'Minor lane quiet window', 'Days a minor-lane proposal sits open before it passes by lazy consent. Any member objection bumps it to the full lane', 7, 'integer', 7, 1, 30),
('governance', 'assembly', 'governance.last_call_hours', 'Last call window', 'Hours a proposal pauses in last call before it is ready to launch the binding vote. One final chance for a late objection', 48, 'integer', 48, 0, 168),
('governance', 'assembly', 'governance.resting_after_days', 'Resting after', 'Days without new signals or replies before a forming proposal folds into the resting strip. One click revives it', 30, 'integer', 30, 7, 120)
ON DUPLICATE KEY UPDATE `key` = `key`;
