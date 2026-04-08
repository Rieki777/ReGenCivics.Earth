-- Em-dash sweep against the live DB.
-- Run from any MySQL client connected to Railway with read access.
-- For Rye to run; do not pipe through the migration runner (this is
-- read-only and not a schema change).
--
-- Writing Rule 1 says zero em-dashes anywhere user-reachable.
-- The codebase pass is in commit ef3e26d. The DB rows below are the
-- second leg.

-- Forum thread titles
SELECT id, title FROM forumPosts WHERE title LIKE '%—%';

-- Forum reply bodies (snippet for context)
SELECT id, postId, LEFT(content, 200) AS snippet FROM forumReplies WHERE content LIKE '%—%' LIMIT 100;

-- Forum post bodies (snippet for context)
SELECT id, title, LEFT(content, 200) AS snippet FROM forumPosts WHERE content LIKE '%—%' LIMIT 100;

-- Quest titles + descriptions (the table is `quests` if it exists; the
-- main quest data is currently file-based in client/src/data/questData.ts
-- which already passed the codebase sweep, but check for any DB-stored
-- quest rows just in case)
SELECT id, title FROM quests WHERE title LIKE '%—%' OR description LIKE '%—%';

-- Land project / application titles + descriptions
SELECT id, projectName AS title, LEFT(message, 200) AS snippet FROM general_inquiries WHERE projectName LIKE '%—%' OR message LIKE '%—%' LIMIT 100;

-- Blog edits
SELECT id, slug, LEFT(content, 200) AS snippet FROM blogEdits WHERE content LIKE '%—%' LIMIT 100;

-- Player profile bio fields
SELECT id, displayName, LEFT(bio, 200) AS bio_snippet FROM player_profiles WHERE displayName LIKE '%—%' OR bio LIKE '%—%' OR currentlyWorkingOn LIKE '%—%' LIMIT 100;

-- Glossary terms
SELECT id, term, LEFT(definition, 200) AS snippet FROM glossary WHERE term LIKE '%—%' OR definition LIKE '%—%' LIMIT 100;

-- Bioregions
SELECT id, name, LEFT(description, 200) AS snippet FROM bioregions WHERE name LIKE '%—%' OR description LIKE '%—%' LIMIT 100;

-- Forum categories (just in case)
SELECT id, slug, name, description FROM forumCategories WHERE name LIKE '%—%' OR description LIKE '%—%';
