-- Which unit a need's wanted/claimed/delivered counters use. 'count' is
-- people or things (every need until now). 'hours_per_week' is used only by
-- role needs, where the counters are hours a week needed, accepted and
-- delivered. New role needs are created as 'hours_per_week'.
-- drizzle/after-deploy/0251 converts the old ones, after the deploy.
ALTER TABLE `campaign_items`
  ADD COLUMN `capacityUnit` enum('count','hours_per_week') NOT NULL DEFAULT 'count';
