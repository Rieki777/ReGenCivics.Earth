/**
 * scripts/migrate-csv.ts
 * Migrates users and applications from CSV backup files into the live database.
 * Run with: npx tsx scripts/migrate-csv.ts
 * Prerequisites: DATABASE_URL set in .env
 */

import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { config } from "dotenv";
import mysql from "mysql2/promise";

config(); // load .env

const db = await mysql.createConnection(process.env.DATABASE_URL!);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nullIfEmpty(v: string | undefined): string | null {
  return v === "" || v === undefined ? null : v;
}

function intOrNull(v: string | undefined): number | null {
  if (v === "" || v === undefined) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function floatOrNull(v: string | undefined): number | null {
  if (v === "" || v === undefined) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function dateOrNull(v: string | undefined): string | null {
  if (v === "" || v === undefined) return null;
  return v; // MySQL accepts ISO strings directly
}

// ─── Migrate Users ────────────────────────────────────────────────────────────

const usersPath = path.resolve("data/migration/users_20260304_010214.csv");
const usersRaw = fs.readFileSync(usersPath, "utf-8");
// `columns: true` yields one object per row, keyed by header. csv-parse types
// that as `any`, which strict mode then treats as unknown at every use site.
const users = parse(usersRaw, { columns: true, skip_empty_lines: true }) as Record<string, string>[];

console.log(`\nMigrating ${users.length} users...`);

for (const u of users) {
  try {
    await db.execute(
      `INSERT IGNORE INTO users (id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parseInt(u.id),
        u.openId,
        nullIfEmpty(u.name),
        nullIfEmpty(u.email),
        nullIfEmpty(u.loginMethod),
        u.role || "user",
        dateOrNull(u.createdAt),
        dateOrNull(u.updatedAt),
        dateOrNull(u.lastSignedIn),
      ]
    );
    console.log(`  ✅ User ${u.id} (${u.email}) — inserted or already exists`);
  } catch (err: any) {
    console.error(`  ❌ User ${u.id} — error: ${err.message}`);
  }
}

// ─── Migrate Applications ─────────────────────────────────────────────────────

const appsPath = path.resolve("data/migration/applications_20260304_010227.csv");
const appsRaw = fs.readFileSync(appsPath, "utf-8");
const apps = parse(appsRaw, { columns: true, skip_empty_lines: true, relax_quotes: true }) as Record<string, string>[];

console.log(`\nMigrating ${apps.length} applications...`);

for (const a of apps) {
  try {
    await db.execute(
      `INSERT IGNORE INTO applications
         (id, userId, status, projectName, projectType, location, vision, landStatus,
          teamSize, teamDescription, regenerativePractices, governanceApproach, communityEngagement,
          timeCommitment, currentFunding, fundingNeeds, websiteUrl, videoUrl, documentsUrl,
          additionalNotes, submittedAt, createdAt, updatedAt,
          projectSizeHectares, currentPeopleCount, currentHouseholdCount,
          intendedPeopleCount, intendedHouseholdCount, mixedUse,
          latitude, longitude, country)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        parseInt(a.id),
        parseInt(a.userId),
        a.status || "submitted",
        a.projectName,
        a.projectType || "early_stage",
        a.location,
        a.vision,
        a.landStatus || "seeking",
        intOrNull(a.teamSize) ?? 1,
        a.teamDescription ?? "",
        a.regenerativePractices ?? "",
        a.governanceApproach ?? "",
        a.communityEngagement ?? "",
        a.timeCommitment ?? "",
        nullIfEmpty(a.currentFunding),
        a.fundingNeeds ?? "",
        nullIfEmpty(a.websiteUrl),
        nullIfEmpty(a.videoUrl),
        nullIfEmpty(a.documentsUrl),
        nullIfEmpty(a.additionalNotes),
        dateOrNull(a.submittedAt),
        dateOrNull(a.createdAt),
        dateOrNull(a.updatedAt),
        intOrNull(a.projectSizeHectares),
        intOrNull(a.currentPeopleCount),
        intOrNull(a.currentHouseholdCount),
        intOrNull(a.intendedPeopleCount),
        intOrNull(a.intendedHouseholdCount),
        nullIfEmpty(a.mixedUse),
        floatOrNull(a.latitude),
        floatOrNull(a.longitude),
        nullIfEmpty(a.country),
      ]
    );
    console.log(`  ✅ Application ${a.id} (${a.projectName}) — inserted or already exists`);
  } catch (err: any) {
    console.error(`  ❌ Application ${a.id} — error: ${err.message}`);
  }
}

await db.end();
console.log("\nMigration complete.");
