-- The Captain's Book: crew roles + the pre-sail checklist log on each booking
-- (SHIP_MAINTAINER_INVENTORY Section 1.5).
--
-- crewRoles: { captain, navigator, quartermaster, bosun, seedKeeper } names.
-- preSailLog: an append-only list of pre-sail checklist runs, [{ at, byName }],
-- one per drive, which also protects the crew and the church on damage questions.

ALTER TABLE `ship_bookings`
  ADD COLUMN `crewRoles` json NULL DEFAULT NULL,
  ADD COLUMN `preSailLog` json NULL DEFAULT NULL;
