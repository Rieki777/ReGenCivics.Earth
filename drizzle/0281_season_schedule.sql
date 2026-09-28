-- Season Schedule (shared/seasonSchedule.ts, ADR-64).
-- Numbered 0281 because the funding-engine branches hold 0277 to 0280.
-- Additive and safe to run more than once.

-- The time vote. One row per voter per Season, keyed by a random browser id
-- so a land project member without an account can still raise a hand. Voting
-- again updates the row in place. slots holds a comma list of weekdays
-- ("tue,sat"). projectUrl is the link a project shares with the rest of the
-- cohort, http or https only. The season column lets every Season reuse it.
CREATE TABLE IF NOT EXISTS season_schedule_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  season VARCHAR(50) NOT NULL,
  voterKey VARCHAR(64) NOT NULL,
  slots VARCHAR(64) NOT NULL,
  displayName VARCHAR(80) NULL,
  projectName VARCHAR(120) NULL,
  projectUrl VARCHAR(500) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY season_schedule_votes_voter_idx (season, voterKey),
  KEY season_schedule_votes_season_idx (season)
);

-- Notes for the organizers as the Season runs: what to talk about at the next
-- session, and how the facilitation is landing. Admin-only to read. Tagged
-- with the week of the next upcoming session when it was written. No voter
-- key is stored, so a note left without a name stays anonymous.
CREATE TABLE IF NOT EXISTS season_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  season VARCHAR(50) NOT NULL,
  week INT NULL,
  displayName VARCHAR(80) NULL,
  projectName VARCHAR(120) NULL,
  topic TEXT NULL,
  facilitation TEXT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY season_feedback_season_week_idx (season, week)
);
