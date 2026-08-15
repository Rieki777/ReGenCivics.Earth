-- Item 16: the Free Passage Quest verification redesign.
--
-- Each quest action now carries an explicit verification type (auto vs crew) and
-- a submission cap. Auto quests award points the moment the player posts in the
-- quest's forum thread; crew quests award on approval by the reviewer account.
-- The cap lets a quest be completed more than once (item 14b: refer an event or
-- workshop partner, 25 each up to 2; item 11: Loving Service, up to 2 and up to 5).
--
-- Dropping the single-completion-per-action unique is what allows the capped
-- multi-submission quests to record more than one verified completion per user.
-- This is backward compatible: existing award logic checks for an existing row
-- before inserting, so it still records one completion for single-submit quests.

ALTER TABLE ship_quest_actions
  ADD COLUMN verificationType ENUM('auto', 'crew') NOT NULL DEFAULT 'crew';

ALTER TABLE ship_quest_actions
  ADD COLUMN maxSubmissions INT NOT NULL DEFAULT 1;

ALTER TABLE ship_quest_completions
  DROP INDEX ship_quest_completion_uq;

-- Keep a non-unique index on (userId, actionId) so per-user, per-action lookups
-- (counting a player's submissions against the cap) stay fast.
CREATE INDEX ship_quest_completion_user_action_idx
  ON ship_quest_completions (userId, actionId);
