-- Let an admin edit hold against the catalog sync.
--
-- syncCatalogEvents() runs on every public events.list call and forces a
-- Season 2 episode or Open Access session back to the shared catalog's time.
-- That was written to repair a stale 1:00 PM Eastern stamp, and it does, but
-- it also means an admin who moves an episode in Admin > Events sees the
-- change reverted on the next page load. /schedule itself says "Episode
-- day/time may be adjusted during the 1st Episode based on the 13 selected
-- projects' availability", so this reverting is going to bite in September.
--
-- With this column the ownership is explicit: the catalog seeds and repairs
-- rows nobody has touched, and an admin edit pins the row. The events.update
-- procedure sets it; nothing else does.
ALTER TABLE `events`
  ADD COLUMN `manualOverride` TINYINT NOT NULL DEFAULT 0;
