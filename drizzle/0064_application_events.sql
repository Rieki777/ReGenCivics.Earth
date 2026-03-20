CREATE TABLE IF NOT EXISTS applicationEvents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicationId INT NOT NULL,
  eventType ENUM('status_change','email_sent','note_added','admin_action') NOT NULL,
  description TEXT NOT NULL,
  adminUserId INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (applicationId) REFERENCES applications(id) ON DELETE CASCADE
);
