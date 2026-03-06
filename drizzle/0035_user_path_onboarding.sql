ALTER TABLE `userProfiles`
  ADD COLUMN `path` enum('investor','land_project','ally','player'),
  ADD COLUMN `onboardingComplete` tinyint NOT NULL DEFAULT 0,
  ADD COLUMN `investmentRange` varchar(255),
  ADD COLUMN `projectName` varchar(255),
  ADD COLUMN `projectUrl` varchar(500),
  ADD COLUMN `organizationName` varchar(255),
  ADD COLUMN `questInterests` text,
  ADD COLUMN `displayName` varchar(255),
  ADD COLUMN `avatarUrl` varchar(500);
