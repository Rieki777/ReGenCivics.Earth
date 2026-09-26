-- The journey a tool takes to become part of the shared system.
--
-- Three classes, and only one of them needs storing:
--
--   not assessed   no sheet. Came straight into the library through
--                  /tools/submit and has not answered the interoperability
--                  questions. Derived from the absence of a row, so nothing
--                  to keep in sync.
--   pending        a sheet exists. They came in through the interoperability
--                  intake and told us what they speak, but the group has not
--                  confirmed the pieces line up.
--   interoperable  confirmed to work with the shared foundation.
--
-- Only the last transition is a judgement, so only it is stored. Deriving the
-- first two from the data means the library cannot show a badge that
-- contradicts the sheets underneath it.
--
-- 'declined' exists so a sheet that was looked at and did not line up is
-- distinguishable from one nobody has reached yet; without it, declining
-- would mean deleting the sheet and losing why.

ALTER TABLE `interopSheets`
  ADD COLUMN `stage` ENUM('pending', 'interoperable', 'declined') NOT NULL DEFAULT 'pending';

ALTER TABLE `interopSheets`
  ADD COLUMN `stageNote` TEXT NULL;

ALTER TABLE `interopSheets`
  ADD COLUMN `stagedAt` TIMESTAMP NULL;

ALTER TABLE `interopSheets`
  ADD KEY `interop_sheets_stage_idx` (`stage`);
