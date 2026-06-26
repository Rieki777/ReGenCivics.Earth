-- Migration 0148: isOpenQuestion flag on forum replies
-- Lets the author or a moderator mark a reply as an open question so
-- the Sensing summary can surface "questions still open" without LLM.

ALTER TABLE forumReplies
  ADD COLUMN isOpenQuestion TINYINT(1) NOT NULL DEFAULT 0,
  ADD INDEX forumReplies_openQuestion_idx (postId, isOpenQuestion);
