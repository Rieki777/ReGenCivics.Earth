-- Second-brain command center (TASK_SESSIONS_2026-08-29/BRIEF_SECOND_BRAIN_FABLE_RESPONSE.md §3).
--
-- One work-item table, canonical for STATE. The four sections (Create / Build /
-- To-do / Explore) are filters over `kind`, so Rye can re-cut the sections
-- without a migration. The vault stays canonical for essays and worldview and
-- receives a regenerated mirror of these rows.
--
-- `ready` is a state a human passes an item through: ready_by / ready_at /
-- ready_hash are the receipt, and rows with trust='external' can never
-- self-promote. Additive only: this touches no existing table.

CREATE TABLE brain_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  kind ENUM('unsorted','create','build','todo','ask','decide','material') NOT NULL DEFAULT 'unsorted',
  state ENUM('raw','shaped','ready','in_flight','done_claimed','done','parked') NOT NULL DEFAULT 'raw',
  title VARCHAR(300) NOT NULL,
  body TEXT NOT NULL,
  ask VARCHAR(500) NULL,
  done_when VARCHAR(500) NULL,
  blocked_on VARCHAR(300) NULL,
  due DATE NULL,
  effort ENUM('S','M','L') NULL,
  priority ENUM('now','soon','someday') NOT NULL DEFAULT 'soon',
  repo VARCHAR(64) NULL,
  surface VARCHAR(200) NULL,
  attachments JSON NULL,
  proposed JSON NULL,
  follows_id INT NULL,
  supersedes_id INT NULL,
  source VARCHAR(191) NOT NULL,
  trust ENUM('owner','external') NOT NULL DEFAULT 'owner',
  batch_id INT NULL,
  ready_by INT NULL,
  ready_at TIMESTAMP NULL,
  ready_hash CHAR(64) NULL,
  closed_by VARCHAR(64) NULL,
  evidence TEXT NULL,
  captured_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY brain_items_owner_source_unique (owner_id, source),
  KEY brain_items_owner_state_kind_idx (owner_id, state, kind),
  KEY brain_items_owner_due_idx (owner_id, due),
  KEY brain_items_batch_idx (batch_id),
  KEY brain_items_follows_idx (follows_id)
);

-- Every promotion, state change and edit leaves a row here. `via` records which
-- surface did it, so "the bot closed the wrong item" is answerable.
CREATE TABLE brain_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  item_id INT NOT NULL,
  action VARCHAR(40) NOT NULL,
  detail JSON NULL,
  via ENUM('web','telegram','api','import','webhook') NOT NULL DEFAULT 'web',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY brain_audit_item_idx (item_id, created_at)
);

-- Telegram redelivers on any response it considers slow. Dedupe on update_id
-- BEFORE any side effect, so a retry never files a capture twice.
CREATE TABLE brain_telegram_updates (
  update_id BIGINT PRIMARY KEY,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
