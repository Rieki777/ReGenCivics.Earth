-- 0176: ship_quest_actions.linkedQuestId references quest_completions.questId,
-- which is a varchar slug (e.g. quest-3), not a numeric id. Widen the column so
-- the Food Foresting quest auto-verification can match by slug. The table is
-- empty at this point, so no data migration is needed.

ALTER TABLE `ship_quest_actions` MODIFY COLUMN `linkedQuestId` VARCHAR(100) NULL;
