-- 0219: Tag applications with an incubator season number.
--
-- The admin Applications tab used to infer season from submittedAt date
-- ranges, which never matched reality: the Season 1 batch was seeded with
-- submittedAt 2026-03-14 while Season 2 applications arrived Feb-Jul 2026,
-- some EARLIER than the Season 1 dates. Dates cannot separate the seasons,
-- so each application now carries an explicit season tag.
--
-- DEFAULT 2 so rows inserted before the code deploy still land in the
-- current season; server code stamps the season explicitly at submit time
-- (shared/incubatorSeason.ts) from then on.
ALTER TABLE applications ADD COLUMN season INT DEFAULT 2;

-- Everything that existed before this migration is Season 1...
UPDATE applications SET season = 1 WHERE status != 'draft';

-- ...except the four Season 2 applications, identified by id because two of
-- their projectNames carry trailing spaces in the database:
--   930001  Aquarella
--   1230001 Living University Network
--   1231533 BioHarmony Demonstration Center
--   1231534 Monti di Madri comunity
UPDATE applications SET season = 2 WHERE id IN (930001, 1230001, 1231533, 1231534);
