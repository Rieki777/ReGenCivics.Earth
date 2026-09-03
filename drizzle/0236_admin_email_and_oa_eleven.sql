-- Promote the founder's Google login to admin, and move any leftover
-- Open Access rows still stamped at 1:00 PM Eastern (17:00Z) to 11:00
-- Pacific (18:00Z during PDT). Hour guard keeps a second run still.

UPDATE `users`
SET `role` = 'admin'
WHERE `email` = 'rieki.cordon@gmail.com'
  AND `role` = 'user';

UPDATE `events`
SET `startTime` = DATE_ADD(`startTime`, INTERVAL 1 HOUR),
    `endTime` = IF(`endTime` IS NULL, NULL, DATE_ADD(`endTime`, INTERVAL 1 HOUR)),
    `timezone` = 'PDT'
WHERE `type` = 'open'
  AND `title` LIKE '%Open Access%'
  AND HOUR(`startTime`) = 17;
