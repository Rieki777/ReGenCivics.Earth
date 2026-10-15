-- Week 4's cards need room (Season 2, "Game & Organisation Co-Creation
-- Part 2"). A seat in a circle is one answer row whose text is a small JSON
-- object of six fields (its name, what it works toward, the human need it
-- meets, what it answers for, who holds it, what it asks), plus its circle.
-- shared/boardCards.ts caps each field and the whole card at 1000 characters.
--
-- WIDENING ONLY: VARCHAR(400) to VARCHAR(1000), the same column type, so old
-- code reads exactly what it read before, and every existing row fits. Both
-- lengths store a two-byte length prefix under utf8mb4, so MySQL and MariaDB
-- widen it in place. Safe to apply before the deploy. No COLLATE on purpose:
-- production's column uses the table's own (utf8mb4_0900_ai_ci, checked
-- 2026-10-15), which MODIFY keeps, and MariaDB scratch copies keep theirs.
--   npx tsx scripts/run-migration.ts drizzle/0300_board_item_text.sql

ALTER TABLE `session_board_items`
  MODIFY COLUMN `text` VARCHAR(1000) NOT NULL;
