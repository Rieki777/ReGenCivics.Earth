-- Item 13: Free Passage Quest crew pooling.
--
-- Qualified players (150+ verified points) can pool into a crew, raise the crew's
-- odds together, and voyage together if drawn. A crew is capped at 4 adults, or 5
-- for a family of five. Each player marks the voyage weeks that will not work for
-- them; matching only pools players whose still-open weeks overlap. Open weeks are
-- derived live from the voyage grid (enumerateVoyageWeeks), so a week that fills
-- with a booking drops out of the pool automatically.

CREATE TABLE ship_quest_crews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  createdByUserId INT NOT NULL,
  isFamily TINYINT NOT NULL DEFAULT 0,
  status ENUM('forming', 'matched', 'drawn') NOT NULL DEFAULT 'forming',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ship_quest_crews_creator_idx (createdByUserId)
);

-- A player belongs to at most one crew (unique on userId).
CREATE TABLE ship_quest_crew_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  crewId INT NOT NULL,
  userId INT NOT NULL,
  joinedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ship_quest_crew_member_user_uq (userId),
  KEY ship_quest_crew_member_crew_idx (crewId)
);

-- One row per player: the weeks they cannot sail (blockedWeeks, JSON array of
-- Monday YYYY-MM-DD strings) and whether they want to be matched into a crew.
CREATE TABLE ship_quest_availability (
  userId INT NOT NULL PRIMARY KEY,
  blockedWeeks JSON,
  seekingCrew TINYINT NOT NULL DEFAULT 0,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
