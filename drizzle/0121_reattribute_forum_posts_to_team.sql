-- Re-attribute all current forum posts to the ReGen Civics Team user.
-- The team user is identified by email = 'team@regencivics.earth'.
-- Posts currently authored by Rieki Cordon (or anyone else) on forumPosts
-- get repointed at the team user so the Live Community feed attributes
-- every "anchor" post to the team, not to an individual.
--
-- lastReplyBy is intentionally NOT touched — replies can still show the
-- replier's real name.

UPDATE forumPosts fp
JOIN users team ON team.email = 'team@regencivics.earth'
SET fp.authorId = team.id
WHERE fp.authorId <> team.id;
