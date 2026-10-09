-- Soft-hide for forum posts and replies.
-- Public lists skip isHidden = 1. Rows stay in the table so an admin can unhide them.
ALTER TABLE `forumPosts`
  ADD COLUMN `isHidden` boolean NOT NULL DEFAULT false;

ALTER TABLE `forumReplies`
  ADD COLUMN `isHidden` boolean NOT NULL DEFAULT false;
