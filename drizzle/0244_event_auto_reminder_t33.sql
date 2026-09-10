-- Add the 33-minute pre-call offset to Open Access and Season 2 events that
-- already have auto-reminders enabled. New enables get this from
-- defaultOffsetsForEvent. Admins can still uncheck it after this backfill.

UPDATE event_auto_reminders ear
INNER JOIN events e ON e.id = ear.eventId
SET ear.offsetsJson = JSON_ARRAY_APPEND(ear.offsetsJson, '$', 33)
WHERE ear.enabled = 1
  AND JSON_TYPE(ear.offsetsJson) = 'ARRAY'
  AND JSON_CONTAINS(ear.offsetsJson, '33', '$') = 0
  AND (e.type = 'open' OR e.type = 'episode' OR e.season = 'Season 2');
