/**
 * import-applications.ts — Import applications from CSV (361 rows).
 * Usage: npx tsx scripts/import-applications.ts
 */
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import mysql from "mysql2/promise";

const CSV_PATH = path.join(process.cwd(), "scripts/data/applications_20260312_191604.csv");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

function parseDate(val: string | undefined): string | null {
  if (!val || val.trim() === "") return null;
  return val.replace(" ", "T");
}

function parseFloat2(val: string | undefined): number | null {
  if (!val || val.trim() === "") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function parseInt2(val: string | undefined): number | null {
  if (!val || val.trim() === "") return null;
  const n = parseInt(val);
  return isNaN(n) ? null : n;
}

function parseBool(val: string | undefined): number {
  return val === "1" || val?.toLowerCase() === "true" ? 1 : 0;
}

// Parse CSV line respecting quoted fields
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

const VALID_STATUSES = ["draft", "submitted", "under_review", "accepted", "rejected", "waitlisted"];

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL!);
  let inserted = 0;
  let skipped = 0;

  const rl = readline.createInterface({ input: fs.createReadStream(CSV_PATH) });
  let headers: string[] = [];
  let isFirst = true;

  for await (const line of rl) {
    if (isFirst) {
      headers = parseCsvLine(line).map((h) => h.trim());
      isFirst = false;
      continue;
    }
    if (!line.trim()) continue;

    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cols[i] ?? "").trim()));

    const status = VALID_STATUSES.includes(row.status) ? row.status : "submitted";

    try {
      await conn.execute(
        `INSERT IGNORE INTO applications
          (id, userId, status, projectName, projectType, location, vision, landStatus,
           teamSize, teamDescription, regenerativePractices, governanceApproach, communityEngagement,
           timeCommitment, currentFunding, fundingNeeds, websiteUrl, videoUrl, documentsUrl,
           additionalNotes, submittedAt, createdAt, updatedAt, projectSizeHectares,
           currentPeopleCount, currentHouseholdCount, intendedPeopleCount, intendedHouseholdCount,
           mixedUse, latitude, longitude, country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parseInt(row.id),
          parseInt(row.userId),
          status,
          row.projectName || null,
          row.projectType || null,
          row.location || null,
          row.vision || null,
          row.landStatus || null,
          parseInt2(row.teamSize),
          row.teamDescription || null,
          row.regenerativePractices || null,
          row.governanceApproach || null,
          row.communityEngagement || null,
          row.timeCommitment || null,
          row.currentFunding || null,
          row.fundingNeeds || null,
          row.websiteUrl || null,
          row.videoUrl || null,
          row.documentsUrl || null,
          row.additionalNotes || null,
          parseDate(row.submittedAt),
          parseDate(row.createdAt),
          parseDate(row.updatedAt),
          parseFloat2(row.projectSizeHectares),
          parseInt2(row.currentPeopleCount),
          parseInt2(row.currentHouseholdCount),
          parseInt2(row.intendedPeopleCount),
          parseInt2(row.intendedHouseholdCount),
          parseBool(row.mixedUse),
          parseFloat2(row.latitude),
          parseFloat2(row.longitude),
          row.country || null,
        ]
      );
      inserted++;
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        skipped++;
      } else {
        console.error(`Row ${row.id} error:`, err.message);
        skipped++;
      }
    }
  }

  await conn.end();
  console.log(`Applications import complete: ${inserted} inserted, ${skipped} skipped.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
