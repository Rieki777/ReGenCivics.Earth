-- Feature suggestions: community-driven propose-and-vote for site features
CREATE TABLE featureSuggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  authorId INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  status ENUM('open', 'planned', 'building', 'shipped', 'declined') NOT NULL DEFAULT 'open',
  voteCount INT NOT NULL DEFAULT 0,
  forumThreadId INT DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE featureSuggestionVotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  suggestionId INT NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_vote (suggestionId, userId)
);
