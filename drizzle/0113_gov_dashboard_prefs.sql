CREATE TABLE govDashboardPrefs (
  userId INT PRIMARY KEY,
  primaryBioregionId INT DEFAULT NULL,
  dashboardLayout ENUM('compact', 'full') DEFAULT 'compact',
  notificationPrefs JSON DEFAULT NULL,
  hasSeenWelcome TINYINT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
