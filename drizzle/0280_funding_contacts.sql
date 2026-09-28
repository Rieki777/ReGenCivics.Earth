-- Funding engine Phase 4: event capture (FUNDING_ENGINE_PLAN v1.3, sections 4.3,
-- 4.7 and 9). Additive. "Rye logs a conversation on his phone in under a minute
-- at The Gathering, and every due follow-up shows as an Open in Gmail link."
--
-- funding_contacts: people at funders and in the field. A contact may point at
-- its funder row (pipelineId, cleared if that row is removed). warmth runs 0
-- to 3 (cold, met, warm, champion). doNotContact is honored everywhere a
-- follow-up could surface; region and lawfulBasis carry the GDPR, UK and CASL
-- notes (plan 4.8). Tags and notes can attach through the existing contact
-- tables with contactType 'funding_contact'.
--
-- funding_touches: every conversation, on any channel, with an optional next
-- step and follow-up day. The app never sends: a due follow-up is an Open in
-- Gmail link that Rye edits and sends himself (plan 4.5), and nothing here
-- automates LinkedIn (its User Agreement section 8.2 forbids it).

CREATE TABLE IF NOT EXISTS `funding_contacts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(160) NOT NULL,
  `organization` VARCHAR(200) NULL,
  `role` VARCHAR(160) NULL,
  `pipelineId` INT NULL,
  `email` VARCHAR(320) NULL,
  `linkedinUrl` VARCHAR(500) NULL,
  `warmth` TINYINT NOT NULL DEFAULT 1,
  `region` VARCHAR(8) NULL,
  `lawfulBasis` VARCHAR(40) NULL,
  `doNotContact` TINYINT(1) NOT NULL DEFAULT 0,
  `source` VARCHAR(120) NULL,
  `lastTouchAt` TIMESTAMP NULL DEFAULT NULL,
  `notes` TEXT NULL,
  `createdBy` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `funding_contacts_pipeline_idx` (`pipelineId`),
  KEY `funding_contacts_email_idx` (`email`),
  KEY `funding_contacts_last_touch_idx` (`lastTouchAt`),
  CONSTRAINT `funding_contacts_pipeline_fk`
    FOREIGN KEY (`pipelineId`) REFERENCES `funding_pipeline`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `funding_touches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `contactId` INT NOT NULL,
  `pipelineId` INT NULL,
  `channel` ENUM('email','linkedin','call','meeting','form','event') NOT NULL,
  `direction` ENUM('inbound','outbound','both') NOT NULL DEFAULT 'both',
  `summary` TEXT NOT NULL,
  `nextStep` VARCHAR(500) NULL,
  `followUpAt` DATE NULL,
  `followUpDoneAt` TIMESTAMP NULL DEFAULT NULL,
  `occurredAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `funding_touches_contact_idx` (`contactId`, `occurredAt`),
  KEY `funding_touches_follow_up_idx` (`followUpAt`),
  CONSTRAINT `funding_touches_contact_fk`
    FOREIGN KEY (`contactId`) REFERENCES `funding_contacts`(`id`) ON DELETE CASCADE,
  CONSTRAINT `funding_touches_pipeline_fk`
    FOREIGN KEY (`pipelineId`) REFERENCES `funding_pipeline`(`id`) ON DELETE SET NULL
);
