-- A week's board as a self-paced course.
-- One row per season week for the two video ids, one row per stage for the
-- clip times, and one row per signed-in person per stage they finished.
--
-- Week 2's edited times are the chapters checked on 2026-10-07. They are
-- marked adminEdited so a later auto-map can fill the empty live side and
-- cannot replace these edited times. Live times are null: captions for the
-- livestream were not available when this was written. Drop-in has no chapter.
--
-- Apply before the feature is used. Deploys do not run migrations.
--   npx tsx scripts/run-migration.ts drizzle/0289_session_course.sql
-- Do not apply this file to production from the agent that added it.
--
-- Unmerged drafts also add a drizzle/0289_*.sql. If this file lands first,
-- those drafts need the next free number.

CREATE TABLE IF NOT EXISTS `session_course_maps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `season` varchar(50) NOT NULL,
  `week` int NOT NULL,
  `liveVideoId` varchar(16) NULL,
  `editedVideoId` varchar(16) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_course_maps_week_idx` (`season`, `week`)
);

CREATE TABLE IF NOT EXISTS `session_course_spans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `season` varchar(50) NOT NULL,
  `week` int NOT NULL,
  `stageIndex` int NOT NULL,
  `liveStart` int NULL,
  `liveEnd` int NULL,
  `editedStart` int NULL,
  `editedEnd` int NULL,
  `liveConfidence` varchar(8) NULL,
  `editedConfidence` varchar(8) NULL,
  `confidence` varchar(8) NOT NULL DEFAULT 'low',
  `evidence` varchar(500) NOT NULL DEFAULT '',
  `adminEdited` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_course_spans_stage_idx` (`season`, `week`, `stageIndex`)
);

CREATE TABLE IF NOT EXISTS `session_course_progress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `season` varchar(50) NOT NULL,
  `week` int NOT NULL,
  `stageIndex` int NOT NULL,
  `watchedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_course_progress_stage_idx` (`userId`, `season`, `week`, `stageIndex`)
);

INSERT INTO `session_course_maps` (`season`, `week`, `liveVideoId`, `editedVideoId`)
VALUES ('Season 2', 2, '23cRivDtorQ', 'JS8YoJE1PUI')
ON DUPLICATE KEY UPDATE `liveVideoId` = VALUES(`liveVideoId`), `editedVideoId` = VALUES(`editedVideoId`);

INSERT INTO `session_course_spans`
  (`season`, `week`, `stageIndex`, `liveStart`, `liveEnd`, `editedStart`, `editedEnd`, `liveConfidence`, `editedConfidence`, `confidence`, `evidence`, `adminEdited`)
VALUES
  ('Season 2', 2, 0, NULL, NULL, 0, 59, NULL, 'high', 'high', 'Welcome: the open incubator model', 1),
  ('Season 2', 2, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'low', 'No chapter names a breath or a drop-in.', 0),
  ('Season 2', 2, 2, NULL, NULL, 59, 448, NULL, 'high', 'high', 'Crowd pooling, shared equity, and collective fundraising', 1),
  ('Season 2', 2, 3, NULL, NULL, 448, 1447, NULL, 'high', 'high', 'Introducing Village OS', 1),
  ('Season 2', 2, 4, NULL, NULL, 1447, 1559, NULL, 'high', 'high', 'Coaching opportunities for regenerative communities', 1),
  ('Season 2', 2, 5, NULL, NULL, 1559, 2485, NULL, 'high', 'high', 'Project roundtable: surfacing community needs', 1),
  ('Season 2', 2, 6, NULL, NULL, 2485, 2672, NULL, 'high', 'high', 'Shared opportunities and priorities for the season', 1),
  ('Season 2', 2, 7, NULL, NULL, 2672, 3161, NULL, 'high', 'high', 'Defining what success looks like', 1),
  ('Season 2', 2, 8, NULL, NULL, 3161, 3840, NULL, 'high', 'high', 'Choosing the sessions that best support each project', 1),
  ('Season 2', 2, 9, NULL, NULL, 4300, NULL, NULL, 'high', 'high', 'Closing', 1),
  ('Season 2', 2, 10, NULL, NULL, 3840, 4300, NULL, 'high', 'high', 'Community tools, project profiles, and getting involved', 1)
ON DUPLICATE KEY UPDATE
  `editedStart` = IF(`adminEdited` = 1, `editedStart`, VALUES(`editedStart`)),
  `editedEnd` = IF(`adminEdited` = 1, `editedEnd`, VALUES(`editedEnd`)),
  `editedConfidence` = IF(`adminEdited` = 1, `editedConfidence`, VALUES(`editedConfidence`)),
  `confidence` = IF(`adminEdited` = 1, `confidence`, VALUES(`confidence`)),
  `evidence` = IF(`adminEdited` = 1, `evidence`, VALUES(`evidence`)),
  `adminEdited` = IF(`adminEdited` = 1, `adminEdited`, VALUES(`adminEdited`));
