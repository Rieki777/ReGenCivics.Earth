-- Open Access 2026-10-10 sat on Season 2 Week 3. Move that OA row to Sunday
-- 2026-10-11, 11:00 AM Pacific (18:00Z). Season 2 episode dates stay put.

UPDATE events
SET startTime = '2026-10-11 18:00:00',
    endTime = '2026-10-11 20:00:00',
    timezone = 'PDT'
WHERE type = 'open'
  AND title LIKE '%Open Access%'
  AND (
    DATE(startTime) = '2026-10-10'
    OR startTime = '2026-10-10 18:00:00'
    OR startTime = '2026-10-10 17:00:00'
  );
