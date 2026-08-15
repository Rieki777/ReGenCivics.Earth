-- Crew-list nightly trigger: throttle column so a confirmed signup is emailed at
-- most once per fortnight about matching openings (SHIP_V5_FLYWHEEL Section 4).
ALTER TABLE `ship_crew_list_signups`
  ADD COLUMN `lastNotifiedAt` timestamp NULL DEFAULT NULL;
