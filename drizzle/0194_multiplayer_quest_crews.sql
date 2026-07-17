-- 0194: Multiplayer Mode, Phase A crew tables.
-- Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md (improvement 1,
-- MISSION_FOUNDATIONS_15_IMPROVEMENTS_2026-07-16.md decision log).
-- Crews of 3 to 7 players form around a multiplayer quest in a bioregion.
-- Quest definitions are file-based (shared/multiplayerQuests.ts), matching the
-- existing quest system where quest_completions.questId is a varchar key with no
-- quest table. So questId here is that same varchar key and carries no SQL FK.
-- bioregionId references bioregions(id). Ownership and referential integrity are
-- enforced in the procedure layer per repo convention (no FK constraints).

CREATE TABLE IF NOT EXISTS `quest_crews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `questId` varchar(100) NOT NULL,
  `bioregionId` int NOT NULL,
  `crewSize` tinyint NOT NULL,
  `status` enum('forming','ready','active','complete','disbanded') NOT NULL DEFAULT 'forming',
  `forumThreadId` int NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `activatedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `quest_crews_questId_bioregionId_status_idx` (`questId`, `bioregionId`, `status`)
);

CREATE TABLE IF NOT EXISTS `quest_crew_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `crewId` int NOT NULL,
  `userId` int NOT NULL,
  `role` varchar(100) NULL DEFAULT NULL,
  `status` enum('joined','left','completed') NOT NULL DEFAULT 'joined',
  `joinedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `formationEmailSentAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quest_crew_members_crewId_userId_unique` (`crewId`, `userId`),
  KEY `quest_crew_members_userId_idx` (`userId`)
);

CREATE TABLE IF NOT EXISTS `quest_crew_signups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `questId` varchar(100) NOT NULL,
  `bioregionId` int NOT NULL,
  `note` varchar(500) NULL DEFAULT NULL,
  `status` enum('open','crewed','cancelled') NOT NULL DEFAULT 'open',
  `crewId` int NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `quest_crew_signups_questId_bioregionId_status_idx` (`questId`, `bioregionId`, `status`),
  KEY `quest_crew_signups_userId_idx` (`userId`)
);
