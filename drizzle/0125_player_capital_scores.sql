-- Per-user 9-forms-of-capital scores that feed the Living Tree visualization.
-- Each quest completion contributes to one or more capital columns. The Living
-- Tree component reads this row to render the player current tree state.
CREATE TABLE IF NOT EXISTS player_capital_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  intellectual INT NOT NULL DEFAULT 0,
  social INT NOT NULL DEFAULT 0,
  material INT NOT NULL DEFAULT 0,
  financial INT NOT NULL DEFAULT 0,
  living INT NOT NULL DEFAULT 0,
  cultural INT NOT NULL DEFAULT 0,
  spiritual INT NOT NULL DEFAULT 0,
  experiential INT NOT NULL DEFAULT 0,
  healthVital INT NOT NULL DEFAULT 0,
  totalScore INT NOT NULL DEFAULT 0,
  seasonsCompleted INT NOT NULL DEFAULT 0,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_capital (userId)
);
