-- Migration 0122: add quest_completion to hyphaBridges.source enum
--
-- The hyphaBridgeRouter.createFromQuest procedure uses source='quest_completion'
-- but the original enum omitted it, causing DB insert errors for quest-sourced bridges.

ALTER TABLE `hyphaBridges`
  MODIFY COLUMN `source` ENUM(
    'loomio_decision',
    'crowdpool',
    'contribution_claim',
    'fund_grant',
    'expense',
    'exit',
    'redeem_tokens',
    'quest_completion',
    'other'
  ) NOT NULL;
