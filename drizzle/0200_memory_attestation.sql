-- 0200: Consent-based player memory + peer attestation, Phase D (improvements 13, 14).
-- Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
--
-- player_companion_memory: small game-journey facts the Guide remembers about a
-- player, opt-in per player (default OFF), fully visible, deletable, and
-- exportable on the settings surface (the surface ships before any write).
-- Schema-level exclusions per the AI-automation PII line: facts are game-journey
-- facts (quest completions, crew memberships, gratitude moments), written
-- deterministically from events, never LLM-extracted, never health, conflict,
-- or finance. sourceRef is the idempotency key per surface.
--
-- quest_completion_attestations: rung 2 of the verification ladder (ADR-42).
-- One attestation per member per quest; the attester must be a co-crew member;
-- both sides logged. Attested completions earn the rung-2 multiplier as
-- internal private credit (source tag quest_attested_bonus). Real public
-- tokens stay gated by Hypha voting, never by this table.

CREATE TABLE IF NOT EXISTS `player_companion_memory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `surface` varchar(50) NOT NULL,
  `fact` text NOT NULL,
  `sourceRef` varchar(120) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `supersededAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_companion_memory_userId_sourceRef_unique` (`userId`, `sourceRef`),
  KEY `player_companion_memory_userId_idx` (`userId`)
);

ALTER TABLE `player_profiles` ADD COLUMN `companionMemoryOptIn` tinyint NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS `quest_completion_attestations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `questId` varchar(100) NOT NULL,
  `crewId` int NOT NULL,
  `memberUserId` int NOT NULL,
  `attesterUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quest_completion_attestations_questId_memberUserId_unique` (`questId`, `memberUserId`),
  KEY `quest_completion_attestations_attesterUserId_idx` (`attesterUserId`)
);
