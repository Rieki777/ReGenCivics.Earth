CREATE TABLE govProposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenantId INT NOT NULL,
  authorId INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  status ENUM('draft','discussion','polling','staged','sent_to_hypha','ratified','declined','withdrawn') DEFAULT 'draft',
  decisionMethod ENUM('consent','advice','consensus','mandate') DEFAULT 'consent',
  track ENUM('fund','game','operational') DEFAULT 'game',
  urgentTag TINYINT DEFAULT 0,
  bioregionId INT DEFAULT NULL,
  seasonId INT DEFAULT NULL,
  sourceForumThreadId INT DEFAULT NULL,
  minDiscussionDays INT DEFAULT 3,
  pollingDurationDays INT DEFAULT 5,
  discussionOpenedAt TIMESTAMP NULL,
  pollingOpenedAt TIMESTAMP NULL,
  pollingClosesAt TIMESTAMP NULL,
  outcomeText TEXT,
  outcomeAuthorId INT DEFAULT NULL,
  hyphaProposalId VARCHAR(255) DEFAULT NULL,
  hyphaBridgeKey VARCHAR(255) DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_tenant_status (tenantId, status),
  INDEX idx_author (authorId),
  INDEX idx_bioregion (bioregionId)
);

CREATE TABLE govComments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  authorId INT NOT NULL,
  parentId INT DEFAULT NULL,
  body TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_proposal (proposalId),
  INDEX idx_parent (parentId)
);

CREATE TABLE govVotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  voterId INT NOT NULL,
  stance ENUM('agree','disagree','abstain','block') NOT NULL,
  reason TEXT,
  delegatedFromId INT DEFAULT NULL,
  weight INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vote (proposalId, voterId),
  INDEX idx_proposal (proposalId),
  INDEX idx_voter (voterId)
);
