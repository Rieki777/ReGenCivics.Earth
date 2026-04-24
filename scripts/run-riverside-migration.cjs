#!/usr/bin/env node
/**
 * One-shot runner for migration 0130.
 *
 * Reads DATABASE_URL from .env and executes the SQL in
 * drizzle/0130_swap_zoom_for_riverside.sql directly against Railway MySQL.
 *
 * Using this instead of scripts/run-migration.ts because the Cowork Linux
 * VM can't load the Windows-only esbuild binaries pnpm installed for this
 * repo, which breaks tsx. This .cjs script goes straight through node +
 * the pnpm-hoisted mysql2 copy, no compile step.
 */
const fs = require("node:fs");
const path = require("node:path");

// Load .env
const envPath = path.resolve(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i);
  if (!m) continue;
  const [, key, rawValue] = m;
  if (process.env[key]) continue;
  let value = rawValue.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not set in .env");
  process.exit(1);
}

// Resolve mysql2 from a dedicated /tmp install (the repo's pnpm store has
// strict deep requires that don't resolve from here).
const mysql = require("/tmp/migrate-tool/node_modules/mysql2/promise.js");

const sqlPath = path.resolve(__dirname, "..", "drizzle", "0130_swap_zoom_for_riverside.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

(async () => {
  const conn = await mysql.createConnection({
    uri: dbUrl,
    multipleStatements: true,
  });

  console.log("Connected. Running preview SELECT…");
  const [preview] = await conn.query(
    "SELECT id, title, status, zoomUrl, riversideRoomUrl FROM events WHERE status IN ('upcoming','live') ORDER BY startTime ASC"
  );
  console.log(`Events in upcoming/live status before migration: ${preview.length}`);
  for (const row of preview.slice(0, 10)) {
    console.log(`  [${row.id}] ${row.title} | zoom=${row.zoomUrl ? "yes" : "no"} | riverside=${row.riversideRoomUrl ? "yes" : "no"}`);
  }
  if (preview.length > 10) console.log(`  … and ${preview.length - 10} more`);

  console.log("\nApplying migration 0130_swap_zoom_for_riverside.sql …");
  const [result] = await conn.query(sql);
  console.log("Result:", JSON.stringify(result, null, 2));

  console.log("\nVerifying post-migration state…");
  const [after] = await conn.query(
    "SELECT COUNT(*) as total, SUM(CASE WHEN zoomUrl IS NOT NULL THEN 1 ELSE 0 END) as still_zoom, SUM(CASE WHEN riversideRoomUrl IS NOT NULL THEN 1 ELSE 0 END) as on_riverside FROM events WHERE status IN ('upcoming','live')"
  );
  console.log(after[0]);

  const [sample] = await conn.query(
    "SELECT id, title, zoomUrl, riversideRoomUrl FROM events WHERE status IN ('upcoming','live') ORDER BY startTime ASC LIMIT 5"
  );
  console.log("\nSample rows post-migration:");
  for (const row of sample) {
    console.log(`  [${row.id}] ${row.title}`);
    console.log(`     zoom: ${row.zoomUrl ?? "null"}`);
    console.log(`     riverside: ${row.riversideRoomUrl ?? "null"}`);
  }

  await conn.end();
  console.log("\nDone.");
})().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
