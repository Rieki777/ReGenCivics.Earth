-- Each member's personally designed ReGen Guide (the general companion):
-- name, chosen face, tone, and whether voice is on. One row per user.
-- The Guide's forum/governance behavior (ADR-23) is unrelated and unchanged.
CREATE TABLE IF NOT EXISTS user_guide_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  guideName VARCHAR(60) NOT NULL,
  portraitKey VARCHAR(32) NOT NULL DEFAULT 'guide-archetype-1',
  tone VARCHAR(16) NOT NULL DEFAULT 'gentle',
  voiceEnabled BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_guide_prefs_user (userId)
);
