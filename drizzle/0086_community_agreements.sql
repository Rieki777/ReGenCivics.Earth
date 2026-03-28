-- Community Agreements: propose-and-vote system for community norms
CREATE TABLE communityAgreements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  authorId INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  status ENUM('open', 'ratified', 'in_review', 'declined') NOT NULL DEFAULT 'open',
  voteCount INT NOT NULL DEFAULT 0,
  forumThreadId INT DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE communityAgreementVotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agreementId INT NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_vote (agreementId, userId)
);
