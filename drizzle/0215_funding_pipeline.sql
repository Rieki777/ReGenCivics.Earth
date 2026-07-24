-- Funding pipeline portal + application engine.
--
-- funding_pipeline holds the 117-row funder pipeline researched and
-- source-verified on 2026-07-24 (data/funding-pipeline-seed.json, seeded by
-- scripts/seed-funding-pipeline.ts). The research columns (category through
-- notes) are the compiled record and are re-upserted by the seed on `name`;
-- the tracking columns (priority through sortOrder) are what Rye works in the
-- portal, so the seed only sets them on first insert and never overwrites a
-- later edit. priority is the one crossover: it ships with the research and
-- stays editable in the portal.
--
-- appStatus is the funnel: not_started -> researching -> preparing ->
-- cultivating (for invitation-only funders that need a relationship first) ->
-- submitted -> in_review -> awarded / declined. parked is the off-ramp for a
-- row that is real but not now (closed round, wrong entity, geography we have
-- not landed in yet).
--
-- Column naming is camelCase to match every other table in this schema. Table
-- names stay snake_case, same as the rest.

CREATE TABLE IF NOT EXISTS funding_pipeline (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(120) NOT NULL,
  capitalType VARCHAR(255),
  whatItFunds TEXT,
  typicalSize VARCHAR(160),
  geography VARCHAR(160),
  eligibility TEXT,
  accessStatus VARCHAR(255),
  deadline VARCHAR(160),
  fit VARCHAR(120),
  regenEntity VARCHAR(255),
  link VARCHAR(500),
  notes TEXT,
  priority ENUM('P1', 'P2', 'P3', 'ADV', 'ALLY') NOT NULL DEFAULT 'P2',
  appStatus ENUM(
    'not_started',
    'researching',
    'preparing',
    'cultivating',
    'submitted',
    'in_review',
    'awarded',
    'declined',
    'parked'
  ) NOT NULL DEFAULT 'not_started',
  owner VARCHAR(120),
  nextAction VARCHAR(500),
  nextActionDate DATE NULL DEFAULT NULL,
  lastTouch TIMESTAMP NULL DEFAULT NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY funding_pipeline_name_uq (name),
  KEY funding_pipeline_priority_idx (priority),
  KEY funding_pipeline_status_idx (appStatus),
  KEY funding_pipeline_category_idx (category),
  KEY funding_pipeline_next_action_date_idx (nextActionDate)
);

-- One row per positioning run. Regenerating keeps the old rows: the history is
-- how Rye compares a re-run against what the kernel said last time, and a
-- generation that reads off is evidence for tuning the kernel rather than
-- something to throw away.
--
-- flags carries eligibility conflicts, deadline urgency, and anything the
-- pipeline row marks unverified. When the model returns something that fails
-- schema validation twice, the raw text is stored in positioningSummary and
-- flags carries "generation_unvalidated" so nothing is lost silently.
CREATE TABLE IF NOT EXISTS funding_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pipelineId INT NOT NULL,
  positioningSummary TEXT,
  keyPoints JSON,
  entityToUse VARCHAR(255),
  flags JSON,
  coworkPrompt MEDIUMTEXT,
  modelUsed VARCHAR(120),
  generatedBy INT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY funding_applications_pipeline_idx (pipelineId),
  CONSTRAINT funding_applications_pipeline_fk
    FOREIGN KEY (pipelineId) REFERENCES funding_pipeline(id) ON DELETE CASCADE
);
