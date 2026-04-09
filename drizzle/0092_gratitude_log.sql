CREATE TABLE IF NOT EXISTS gratitudeLog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  senderId INT NOT NULL,
  recipientId INT NOT NULL,
  message VARCHAR(500) NOT NULL,
  sourceType VARCHAR(32) DEFAULT NULL,
  sourceId INT DEFAULT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX grat_sender (senderId, createdAt),
  INDEX grat_recipient (recipientId, createdAt)
);
