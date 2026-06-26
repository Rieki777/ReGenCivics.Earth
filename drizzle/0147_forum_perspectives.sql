-- Migration 0147: forumPerspectives table — governance stance signal
-- One row per (threadId, userId): a member's current perspective on a thread.
-- Single-choice; changing updates in-place (upsert). weight = reputation at set time.

CREATE TABLE forumPerspectives (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  threadId    INT NOT NULL,
  userId      INT NOT NULL,
  perspective ENUM(
    'support',
    'can_live_with',
    'see_differently',
    'need_to_understand',
    'serious_concern'
  ) NOT NULL,
  weight      DOUBLE NOT NULL DEFAULT 1.0,
  createdAt   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY forumPerspectives_thread_user (threadId, userId),
  INDEX forumPerspectives_threadId_idx (threadId),
  INDEX forumPerspectives_userId_idx (userId)
);
