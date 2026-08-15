-- Ship bookings: family capacity + the orientation gate.
--
-- `children` records how many of the crew are children. Capacity is four aboard,
-- or five when at least three are children (SHIP_V4_LOVE, supersession ledger).
--
-- `orientationCompletedAt` / `orientationKeeperId` are the Keeper-run orientation
-- gate: a booking cannot move to `active` until the 2-hour walkthrough and first
-- pre-sail checklist are done together (SHIP_V5_FLYWHEEL Section 5).

ALTER TABLE `ship_bookings`
  ADD COLUMN `children` int NOT NULL DEFAULT 0 AFTER `guests`,
  ADD COLUMN `orientationCompletedAt` timestamp NULL DEFAULT NULL,
  ADD COLUMN `orientationKeeperId` int NULL DEFAULT NULL;
