-- The ReGen Tools Library fills in from the applications (ADR-73). ADDITIVE ONLY:
-- two new tables and two nullable columns. Old code never reads them.
-- MariaDB and MySQL 8+ compatible.
--
-- alliance_applications.tools holds the draft list of tools an Alliance
-- Partner applicant brings (JSON, up to five). When the application is sent,
-- each one becomes a pending regen_tools row (or links to the library entry
-- that already has its link), recorded in alliance_application_tools; approving
-- the partner approves the tools it created, unless the admin unticks one.
--
-- regen_tool_project_usage records the library tools a land project says it
-- uses (/apply), so a tool can show "used by N land projects".
--
-- regen_tools.toolKind says what sort of tool it is: an app or software, a
-- physical tool, or a service or method. isPhysical stays in step with it.
--
-- Safe to apply before the deploy: old code reads none of it.
--   npx tsx scripts/run-migration.ts drizzle/0299_tool_library_links.sql

ALTER TABLE `alliance_applications`
  ADD COLUMN `tools` TEXT NULL;

ALTER TABLE `regen_tools`
  ADD COLUMN `toolKind` ENUM('software','physical','service') NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS `alliance_application_tools` (
  `allianceApplicationId` INT NOT NULL,
  `toolId` INT NOT NULL,
  `createdByApplication` TINYINT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`allianceApplicationId`, `toolId`),
  KEY `alliance_application_tools_tool_idx` (`toolId`)
);

CREATE TABLE IF NOT EXISTS `regen_tool_project_usage` (
  `applicationId` INT NOT NULL,
  `toolId` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`applicationId`, `toolId`),
  KEY `regen_tool_project_usage_tool_idx` (`toolId`)
);
