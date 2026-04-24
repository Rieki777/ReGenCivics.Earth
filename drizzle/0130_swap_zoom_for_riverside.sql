-- 0130_swap_zoom_for_riverside.sql
--
-- 2026-04-23 — every upcoming or live event on ReGen Civics should route
-- attendees to the canonical Riverside studio, not the old Zoom room.
-- Rye's Riverside room URL:
--   https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b
--
-- This migration:
--   1) Sets riversideRoomUrl to the canonical URL for every event that is
--      still upcoming or live and doesn't already point at it.
--   2) Clears zoomUrl for those same events so "Join on Zoom" buttons and
--      Add-to-Calendar exports stop mentioning Zoom.
--
-- Past (completed / cancelled) events are left alone so historical records
-- keep whatever Zoom link was used at the time.

UPDATE events
SET
  riversideRoomUrl = 'https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b',
  zoomUrl = NULL
WHERE status IN ('upcoming', 'live');
