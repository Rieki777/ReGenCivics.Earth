/**
 * import-tripetto-inquiries.ts — Import legacy Tripetto form submissions into general_inquiries.
 * Source: two Tripetto CSV exports from 2022-2025, reformatted into the standard schema.
 * Usage: npx tsx scripts/import-tripetto-inquiries.ts
 */
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import mysql from "mysql2/promise";

const CSV_PATH = path.join(process.cwd(), "scripts/data/tripetto_inquiries.csv");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

/** Parse a single CSV line, handling quoted fields (including commas and escaped quotes inside them). */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseDate(val: string | undefined): string | null {
  if (!val || val.trim() === "") return null;
  return val.replace(" ", "T");
}

function parseBool(val: string | undefined): number {
  return val === "1" || val === "true" ? 1 : 0;
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL!);
  let inserted = 0;
  let skipped = 0;

  const rl = readline.createInterface({ input: fs.createReadStream(CSV_PATH) });
  let headers: string[] = [];
  let isFirst = true;

  for await (const line of rl) {
    if (isFirst) {
      headers = parseCsvLine(line);
      isFirst = false;
      continue;
    }
    if (!line.trim()) continue;

    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h.trim()] = (cols[i] ?? "").trim()));

    try {
      await conn.execute(
        `INSERT IGNORE INTO general_inquiries (id, userId, status, pathType, email, fullName, projectUrl,
          projectInspiration, projectProgress, allianceOrganizations, otherOrganization, organizationUrl,
          partnershipDescription, landProjects, otherProject, roleArchetypes, roleInterest, uniqueContribution,
          additionalNotes, referralSource, newsletterOptIn, createdAt, updatedAt, whyIdeal, seasonDeliverables,
          cvWebsite, capitalTypes, allianceSupportCategories, otherAllianceSupport, allianceSupportDescription,
          valueContribution, whyIdealFit, organizationalCapital, organizationRole, organizationScope,
          organizationLatitude, organizationLongitude, organizationCountry)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parseInt(row.id),
          row.userId ? parseInt(row.userId) : null,
          row.status || "new",
          row.pathType || null,
          row.email || null,
          row.fullName || null,
          row.projectUrl || null,
          row.projectInspiration || null,
          row.projectProgress || null,
          row.allianceOrganizations || null,
          row.otherOrganization || null,
          row.organizationUrl || null,
          row.partnershipDescription || null,
          row.landProjects || null,
          row.otherProject || null,
          row.roleArchetypes || null,
          row.roleInterest || null,
          row.uniqueContribution || null,
          row.additionalNotes || null,
          row.referralSource || null,
          parseBool(row.newsletterOptIn),
          parseDate(row.createdAt),
          parseDate(row.updatedAt),
          row.whyIdeal || null,
          row.seasonDeliverables || null,
          row.cvWebsite || null,
          row.capitalTypes || null,
          row.allianceSupportCategories || null,
          row.otherAllianceSupport || null,
          row.allianceSupportDescription || null,
          row.valueContribution || null,
          row.whyIdealFit || null,
          row.organizationalCapital || null,
          row.organizationRole || null,
          row.organizationScope || null,
          row.organizationLatitude ? parseFloat(row.organizationLatitude) : null,
          row.organizationLongitude ? parseFloat(row.organizationLongitude) : null,
          row.organizationCountry || null,
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
  console.log(`Tripetto inquiries import complete: ${inserted} inserted, ${skipped} skipped.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
