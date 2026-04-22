-- Add lookingForParty column to active_quest_signals for Party Up social feature.
-- Players can mark their active quest as open to party matching. Other players
-- with the same questId and lookingForParty = 1 are surfaced as candidates.
ALTER TABLE active_quest_signals
  ADD COLUMN lookingForParty TINYINT NOT NULL DEFAULT 0;
