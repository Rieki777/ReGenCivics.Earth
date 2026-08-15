-- 0222: Marker links for the governance fork relay (ADR-46 production path).
--
-- Real decoded Hypha governance logs carry only the numeric on-chain
-- proposalId - never the proposal title - so the [gm:<id>] title matching
-- proven in the E2E drill cannot match production events. A fork registers
-- the mapping instead: its founder pastes the Hypha proposal URL into the
-- proposal page, the fork calls POST /api/webhooks/governance-fork-link
-- (authenticated with its relay secret), and this table remembers
-- "fork F's marker M is proposal N". Terminal events then deliver to
-- exactly the fork(s) that linked the id.

CREATE TABLE IF NOT EXISTS `governanceForkMarkerLinks` (
  `id` int AUTO_INCREMENT NOT NULL,
  `forkId` int NOT NULL,
  `marker` varchar(80) NOT NULL,
  `hyphaProposalId` varchar(80) NOT NULL,
  `proposalUrl` varchar(500),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `governanceForkMarkerLinks_id` PRIMARY KEY(`id`),
  CONSTRAINT `gov_marker_link_once_idx` UNIQUE(`forkId`,`marker`)
);

CREATE INDEX `gov_marker_link_pid_idx` ON `governanceForkMarkerLinks` (`hyphaProposalId`);
