CREATE TABLE govPassportQuests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  questSlug VARCHAR(80) NOT NULL,
  questTitle VARCHAR(300) NOT NULL,
  completedAt TIMESTAMP NULL DEFAULT NULL,
  evidenceUrl VARCHAR(500) DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pq (userId, questSlug),
  INDEX idx_user (userId)
);

CREATE TABLE govDelegationHistory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delegatorId INT NOT NULL,
  delegateId INT NOT NULL,
  proposalId INT DEFAULT NULL,
  stance VARCHAR(20) DEFAULT NULL,
  appliedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_delegator (delegatorId),
  INDEX idx_proposal (proposalId)
);
