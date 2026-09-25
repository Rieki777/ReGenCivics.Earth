-- Routing share default moves from 90 to 80. Ruled by Rye on 2026-09-24 (R1a):
-- "we can make it 50-90 with 80% as the default". The range stays 50 to 90.
-- Only moves the live value if nobody has changed it from the old default, so a
-- value an admin set by hand is left alone. Nothing reads this for money today
-- (every crowdpool.rails.* switch is off).
UPDATE game_variables
SET value = 80,
    defaultValue = 80,
    description = 'How much of a money contribution the member routes across projects. The remainder goes to the community treasury. Season-scoped, 50 to 90, default 80.'
WHERE `key` = 'crowdpool.routing_share_pct'
  AND value = 90;
