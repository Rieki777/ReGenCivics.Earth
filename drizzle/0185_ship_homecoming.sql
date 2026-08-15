-- The Homecoming recap page (SHIP_V5_FLYWHEEL Section 2).
--
-- publicSlug: a stable, non-sequential slug for /ship/log/{slug}, minted when a
-- voyage completes. homecomingHidden: the crew can hide the whole recap page.

ALTER TABLE `ship_bookings`
  ADD COLUMN `publicSlug` varchar(80) NULL DEFAULT NULL,
  ADD COLUMN `homecomingHidden` boolean NOT NULL DEFAULT false,
  ADD UNIQUE KEY `ship_bookings_public_slug_uq` (`publicSlug`);
