-- Cleanup of Zapier test webhook payloads that accidentally seeded the
-- recordings table and created forum posts. Happens when Zapier's "Build your
-- first Zap" test event fires at a webhook endpoint during setup.
--
-- Rows targeted:
--   recordings.id 1 and 2 (title "Build your first Zap with Zapier",
--     riversideId prefixed "webhook-", youtubeUrl points at cdn.zapier.com)
--   forumPosts.id 604 and 605 (auto-created from those recordings)
--
-- No forumReplies reference 604 or 605; no events reference recordings 1 or 2.
-- Safe to hard-delete.

DELETE FROM forumReplies WHERE postId IN (604, 605);
DELETE FROM forumPosts WHERE id IN (604, 605);
DELETE FROM recordings WHERE id IN (1, 2);
