-- Shift Season 2 weekly episodes from 8:00 AM Pacific (15:00Z / 16:00Z)
-- to 11:00 AM Pacific (18:00Z during PDT, 19:00Z during PST).
-- Hour guards keep a second run from shifting already-corrected rows.

UPDATE events
SET startTime = DATE_ADD(startTime, INTERVAL 3 HOUR),
    endTime = IF(endTime IS NULL, NULL, DATE_ADD(endTime, INTERVAL 3 HOUR)),
    timezone = 'PDT'
WHERE season = 'Season 2'
  AND type = 'episode'
  AND episodeNumber BETWEEN 1 AND 6
  AND HOUR(startTime) = 15;

UPDATE events
SET startTime = DATE_ADD(startTime, INTERVAL 3 HOUR),
    endTime = IF(endTime IS NULL, NULL, DATE_ADD(endTime, INTERVAL 3 HOUR)),
    timezone = 'PST'
WHERE season = 'Season 2'
  AND type = 'episode'
  AND episodeNumber BETWEEN 7 AND 13
  AND HOUR(startTime) = 16;

-- Open Access sessions stored at 1:00 PM Eastern move one hour later
-- to 11:00 AM Pacific / 2:00 PM Eastern.
UPDATE events
SET startTime = DATE_ADD(startTime, INTERVAL 1 HOUR),
    endTime = IF(endTime IS NULL, NULL, DATE_ADD(endTime, INTERVAL 1 HOUR)),
    timezone = 'PDT'
WHERE type = 'open'
  AND title LIKE '%Open Access%'
  AND startTime < '2026-11-01'
  AND HOUR(startTime) = 17;

UPDATE events
SET startTime = DATE_ADD(startTime, INTERVAL 1 HOUR),
    endTime = IF(endTime IS NULL, NULL, DATE_ADD(endTime, INTERVAL 1 HOUR)),
    timezone = 'PST'
WHERE type = 'open'
  AND title LIKE '%Open Access%'
  AND startTime >= '2026-11-01'
  AND HOUR(startTime) = 18;
