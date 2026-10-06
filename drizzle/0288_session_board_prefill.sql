-- Marks which presenter-card fields were filled from an application
-- and have not been edited yet. Nullable, so existing rows stay as they are.
ALTER TABLE `session_board_projects`
  ADD COLUMN `prefillFields` varchar(80) NULL;
