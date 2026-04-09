CREATE TABLE decisionLineage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  childDecisionId INT NOT NULL,
  parentDecisionId INT NOT NULL,
  relationship ENUM('builds_on','supersedes','references') NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dl (childDecisionId, parentDecisionId),
  INDEX idx_dl_child (childDecisionId),
  INDEX idx_dl_parent (parentDecisionId)
);

CREATE TABLE governanceBackField (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenantId INT NOT NULL,
  forumPostId INT DEFAULT NULL,
  proposerId INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  summary TEXT NOT NULL,
  reason VARCHAR(500) DEFAULT NULL,
  status ENUM('parked','reviewing','promoted','retired') NOT NULL DEFAULT 'parked',
  reviewedAt TIMESTAMP NULL DEFAULT NULL,
  reviewedBy INT DEFAULT NULL,
  promotedToDecisionId INT DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gbf_tenant_status (tenantId, status),
  INDEX idx_gbf_proposer (proposerId)
);

CREATE TABLE decisionStorytellerNarratives (
  id INT AUTO_INCREMENT PRIMARY KEY,
  forumPostDecisionId INT NOT NULL,
  storytellerId INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  narrativeBody MEDIUMTEXT NOT NULL,
  wordCount INT NOT NULL DEFAULT 0,
  publishedAt TIMESTAMP NULL DEFAULT NULL,
  status ENUM('drafting','submitted','published') NOT NULL DEFAULT 'drafting',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dsn_decision (forumPostDecisionId),
  INDEX idx_dsn_storyteller (storytellerId, status)
);

CREATE TABLE forumStrawPolls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  forumPostId INT NOT NULL,
  forumReplyId INT DEFAULT NULL,
  creatorId INT NOT NULL,
  question VARCHAR(300) NOT NULL,
  options JSON NOT NULL,
  closesAt TIMESTAMP NOT NULL,
  closedAt TIMESTAMP NULL DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fsp_post (forumPostId),
  INDEX idx_fsp_close (closesAt, closedAt)
);

CREATE TABLE forumStrawPollVotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  strawPollId INT NOT NULL,
  userId INT NOT NULL,
  choice VARCHAR(80) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fspv (strawPollId, userId)
);

CREATE TABLE governanceDelegations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delegatorId INT NOT NULL,
  delegateId INT NOT NULL,
  topicTags JSON NOT NULL,
  tenantId INT DEFAULT NULL,
  revokedAt TIMESTAMP NULL DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_gd_delegator (delegatorId, revokedAt),
  INDEX idx_gd_delegate (delegateId, revokedAt)
);

CREATE TABLE governancePreMortemConcerns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  forumPostDecisionId INT NOT NULL,
  authorId INT NOT NULL,
  concernText VARCHAR(800) NOT NULL,
  agreeCount INT NOT NULL DEFAULT 0,
  proposerResponse TEXT DEFAULT NULL,
  proposerRespondedAt TIMESTAMP NULL DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_gpmc_decision (forumPostDecisionId, agreeCount)
);
