-- 0220: Governance fork relay (ADR-46).
--
-- The hub runs ONE Alchemy listener on Base for every fork of the village
-- platform (game-amora and its descendants). A fork's mechanics proposal
-- carries a [gm:<id>] marker in its Hypha proposal title; when the on-chain
-- ProposalExecuted lands here, the outcome is relayed to every registered
-- fork's callback URL, signed with that fork's shared secret
-- (x-governance-hub-secret). Forks discard markers that are not theirs and
-- their receivers are idempotent, so delivery is broadcast, at-least-once,
-- retried with backoff until acknowledged.

CREATE TABLE IF NOT EXISTS `governanceForkRelays` (
  `id` int AUTO_INCREMENT NOT NULL,
  `instanceId` varchar(80),
  `name` varchar(120) NOT NULL,
  `callbackUrl` varchar(500) NOT NULL,
  `secret` varchar(200) NOT NULL,
  `active` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `lastRelayAt` timestamp NULL,
  `lastStatus` varchar(200),
  CONSTRAINT `governanceForkRelays_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `governanceRelayDeliveries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `forkId` int NOT NULL,
  `marker` varchar(80) NOT NULL,
  `outcome` enum('passed','failed') NOT NULL,
  `txHash` varchar(80),
  `hyphaProposalId` varchar(80),
  `basescanUrl` varchar(200),
  `attempts` int NOT NULL DEFAULT 0,
  `lastAttemptAt` timestamp NULL,
  `lastError` varchar(300),
  `deliveredAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `governanceRelayDeliveries_id` PRIMARY KEY(`id`),
  CONSTRAINT `gov_relay_once_idx` UNIQUE(`forkId`,`marker`,`outcome`)
);

CREATE INDEX `gov_relay_pending_idx` ON `governanceRelayDeliveries` (`deliveredAt`,`lastAttemptAt`);
