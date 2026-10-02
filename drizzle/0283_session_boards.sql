-- Session boards (shared/sessionBoard.ts, ADR-68).
-- One live board per weekly Season episode, kept as the Season's memory.
-- Numbered 0283: the funding-engine branches hold 0277 to 0280, and 0281 and
-- 0282 are the Season Schedule. Additive and safe to run more than once.

-- The board itself. state is the facilitator's part as JSON text: the stage
-- the room is on, the clocks, the shared breath and the share timer. version
-- goes up on every write to the board or anything on it, so a page can poll
-- one small number and fetch the rest only when it moves.
CREATE TABLE IF NOT EXISTS session_boards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  season VARCHAR(50) NOT NULL,
  week INT NOT NULL,
  state TEXT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  version INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY session_boards_week_idx (season, week)
);

-- A land project in the circle. Added by the project itself (a signed-in
-- player or a guest browser key, authorKey) or by the facilitator.
-- applicationId links it to the project's incubator application once a
-- facilitator confirms the match. ready is a comma list of readiness keys.
CREATE TABLE IF NOT EXISTS session_board_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  boardId INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  place VARCHAR(120) NULL,
  url VARCHAR(500) NULL,
  phase VARCHAR(16) NULL,
  whereNow TEXT NULL,
  ready VARCHAR(200) NULL,
  nextMove VARCHAR(300) NULL,
  shared TINYINT NOT NULL DEFAULT 0,
  applicationId INT NULL,
  authorKey VARCHAR(80) NULL,
  displayName VARCHAR(80) NULL,
  hidden TINYINT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY session_board_projects_board_idx (boardId)
);

-- Everything typed onto a board: arrival and closing words, pain points,
-- growth opportunities and game canvas notes. projectId ties a pain point or
-- an opportunity to a project. theme, chosen and roomVotes are the
-- facilitator's curation. fromItemId marks a quest made from an opportunity.
CREATE TABLE IF NOT EXISTS session_board_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  boardId INT NOT NULL,
  kind VARCHAR(16) NOT NULL,
  text VARCHAR(400) NOT NULL,
  projectId INT NULL,
  block VARCHAR(16) NULL,
  theme VARCHAR(16) NULL,
  chosen TINYINT NOT NULL DEFAULT 0,
  roomVotes INT NOT NULL DEFAULT 0,
  fromItemId INT NULL,
  authorKey VARCHAR(80) NULL,
  displayName VARCHAR(80) NULL,
  hidden TINYINT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY session_board_items_board_idx (boardId)
);

-- One row per person per thing they back: a vote on an opportunity
-- (target "item:<id>", three per person per board) or a hand raised for a
-- coming week (target "week:<n>"). The unique key makes a second tap a no-op.
CREATE TABLE IF NOT EXISTS session_board_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  boardId INT NOT NULL,
  target VARCHAR(32) NOT NULL,
  voterKey VARCHAR(80) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY session_board_votes_once_idx (boardId, target, voterKey),
  KEY session_board_votes_voter_idx (boardId, voterKey)
);
