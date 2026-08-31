/**
 * Ad-hoc: list the distinct project names on applications.
 *
 *   npx tsx scripts/one-shots/tmp-check.ts
 *
 * A one-shot kept because it is occasionally useful, not because anything
 * depends on it. Nothing imports it and no npm script runs it.
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL?.replace(/^﻿/, "").trim();
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. It lives in .env at the repo root, behind a UTF-8 BOM.");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);
const [rows] = await conn.execute<mysql.RowDataPacket[]>(
  "SELECT DISTINCT projectName FROM applications WHERE projectName IS NOT NULL LIMIT 30",
);
for (const r of rows) console.log(r.projectName);
await conn.end();
