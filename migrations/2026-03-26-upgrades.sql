-- =============================================================================
-- regen-civics database migrations: 2026-03-26
-- Run this via Railway's MySQL console or CLI.
-- These migrations add player profile fields, forum seed tracking,
-- notifications, quest journaling, alliances, vouches, and seasonal intentions.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Player profile: lunar streak tracking
-- ---------------------------------------------------------------------------
ALTER TABLE player_profiles
  ADD COLUMN lunarStreak INT NOT NULL DEFAULT 0,
  ADD COLUMN lastQuestCompletedAt DATETIME NULL,
  ADD COLUMN currentLunarCycleStart DATE NULL;


-- ---------------------------------------------------------------------------
-- 2. Player profile: "currently working on" status
-- ---------------------------------------------------------------------------
ALTER TABLE player_profiles
  ADD COLUMN currentlyWorkingOn VARCHAR(200) NULL;


-- ---------------------------------------------------------------------------
-- 3. Forum posts: flag for seed content
-- ---------------------------------------------------------------------------
ALTER TABLE forumPosts
  ADD COLUMN isSeed BOOLEAN NOT NULL DEFAULT FALSE;


-- ---------------------------------------------------------------------------
-- 4. Notifications table
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playerId INT NOT NULL,
  type ENUM('forum_reply', 'quest_complete', 'fund_update', 'vouch', 'mention') NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  link VARCHAR(500),
  isRead BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_player_unread (playerId, isRead, createdAt)
);


-- ---------------------------------------------------------------------------
-- 5. Quest journal: per-player completion log with optional reflection
-- ---------------------------------------------------------------------------
CREATE TABLE quest_journal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playerId INT NOT NULL,
  questId INT NOT NULL,
  completedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reflection TEXT NULL,
  forumPostId INT NULL,
  INDEX idx_player_date (playerId, completedAt DESC)
);


-- ---------------------------------------------------------------------------
-- 6. Player alliances: links between players and land projects / investors
-- ---------------------------------------------------------------------------
CREATE TABLE player_alliances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playerId INT NOT NULL,
  allianceType ENUM('land_project', 'investor', 'partner') NOT NULL,
  allianceName VARCHAR(200) NOT NULL,
  allianceId INT NULL,
  role VARCHAR(100) NULL,
  joinedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_player (playerId)
);


-- ---------------------------------------------------------------------------
-- 7. Vouches: one player vouches for another (unique pair)
-- ---------------------------------------------------------------------------
CREATE TABLE vouches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  voucherId INT NOT NULL,
  vouchedForId INT NOT NULL,
  vouchedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note VARCHAR(200) NULL,
  UNIQUE KEY unique_vouch (voucherId, vouchedForId),
  INDEX idx_vouched_for (vouchedForId)
);


-- ---------------------------------------------------------------------------
-- 8. Seasonal intentions: one intention per player per season
-- ---------------------------------------------------------------------------
CREATE TABLE seasonal_intentions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playerId INT NOT NULL,
  season VARCHAR(20) NOT NULL,
  year INT NOT NULL,
  intention VARCHAR(300) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_season (playerId, season, year),
  INDEX idx_season (season, year)
);
