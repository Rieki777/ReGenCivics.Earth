/**
 * One-shot: complete migration 0225 by hand.
 *
 * The ALTER TABLE half of 0225 applied on the first run; the game_variables
 * INSERT failed on wrong column names, so the runner never recorded the file.
 * This runs the corrected INSERT and records 0225 in _migrations_applied so
 * `--status` stays honest. Idempotent: safe to re-run.
 *
 * Usage: npx tsx scripts/complete-0225.ts   (DATABASE_URL must be set)
 */
import mysql from "mysql2/promise";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const conn = await mysql.createConnection(url);

  // 1. Confirm the columns from the ALTER half are present.
  const [cols] = await conn.query("SHOW COLUMNS FROM plays LIKE 'kind'");
  console.log("plays.kind present:", (cols as any[]).length > 0);

  // 2. The corrected variables insert (matches game_variables real columns).
  await conn.query(
    `INSERT IGNORE INTO game_variables (category, subcategory, \`key\`, displayName, description, value, valueType, defaultValue, isActive) VALUES
     ('Plays', NULL, 'plays.submission_reward_regen', 'Play Submission Reward ($ReGen)', 'ReGen tokens earned when your submitted Play is approved into the library', '2222', 'number', '2222', 1),
     ('Plays', NULL, 'plays.submission_reward_rgvoice', 'Play Submission Reward (RGVoice)', 'RGVoice earned when your submitted Play is approved into the library', '1', 'number', '1', 1)`,
  );
  const [vars] = await conn.query(
    "SELECT `key`, value FROM game_variables WHERE `key` IN ('plays.submission_reward_regen','plays.submission_reward_rgvoice')",
  );
  console.log("variables:", JSON.stringify(vars));

  // 3. Record 0225 as applied, matching the runner's tracking table shape.
  const [trackCols] = await conn.query("SHOW COLUMNS FROM _migrations_applied");
  const names = (trackCols as any[]).map((c) => c.Field as string);
  console.log("_migrations_applied columns:", names.join(", "));
  const nameCol = names.find((n) => ["filename", "file", "name", "migration"].includes(n));
  if (!nameCol) {
    console.error("Could not find the filename column; record 0225 by hand.");
  } else {
    const [existing] = await conn.query(
      `SELECT 1 FROM _migrations_applied WHERE \`${nameCol}\` = ? LIMIT 1`,
      ["0225_vision_plays.sql"],
    );
    if ((existing as any[]).length > 0) {
      console.log("0225 already recorded.");
    } else {
      await conn.query(
        `INSERT INTO _migrations_applied (\`${nameCol}\`) VALUES (?)`,
        ["0225_vision_plays.sql"],
      );
      console.log("recorded 0225_vision_plays.sql as applied.");
    }
  }

  await conn.end();
  console.log("COMPLETE_0225_OK");
}

main().catch((err) => {
  console.error("COMPLETE_0225_ERR", err.message);
  process.exit(1);
});
