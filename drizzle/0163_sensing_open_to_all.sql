-- Migration 0163: open "Sense the room" to any signed-in member
-- Forum governance evolution Fix 2 (FIXES_TO_MAKE_2026-07-02_forum-governance-evolution.md).
-- Rye's call: anyone signed in can move a thread into Sensing. Revisit if abused.
-- The tRPC layer still requires sign-in (protectedProcedure), so tier 0 means
-- "any account", never anonymous visitors.

UPDATE game_variables
SET value = '0',
    description = 'Minimum citizenship tier required to manually enter Sensing (0=any signed-in member 1=citizen 2=steward 3=guardian)'
WHERE `key` = 'governance.sensing_min_citizen_tier';
