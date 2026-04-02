/**
 * Seed script: Import SEEDS transaction CSV into seeds_contributions table.
 *
 * This script reads a CSV file with SEEDS transaction data and imports it into
 * the seeds_contributions database table. The CSV should have columns:
 * transactionId, date, recipientAccount, multipliedUsdValue
 *
 * Example CSV row:
 *   f2066f6c,"28 Mar 23 18:40:24",lucidpatrick,55210
 *
 * Usage:
 *   npx tsx scripts/seed-seeds-contributions.ts [csvPath] [--dry-run] [--reset]
 *
 *   csvPath       Path to CSV file (optional, defaults to tlosto_seeds_transactions.csv in project root)
 *   --dry-run     Show what would happen without writing to the DB
 *   --reset       Delete all seeds_contributions records, then re-seed from CSV
 *
 * Requires DATABASE_URL env var pointing to your MySQL connection string.
 */

import * as fs from "fs";
import * as path from "path";
import * as mysql from "mysql2/promise";
import "dotenv/config";

const DRY_RUN = process.argv.includes("--dry-run");
const RESET = process.argv.includes("--reset");

// Get CSV path from args or use default
function getCsvPath(): string {
  // Skip first two args (node binary and script path), look for a path arg
  const userArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  if (userArgs.length > 0) {
    return userArgs[0];
  }
  // Default to project root
  return path.join(process.cwd(), "tlosto_seeds_transactions.csv");
}

// Parse dates like "28 Mar 23 18:40:24" into MySQL timestamp "2023-03-28 18:40:24"
function parseDate(dateStr: string): string {
  const months: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };

  // Format: "28 Mar 23 18:40:24"
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length < 4) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  const day = parts[0].padStart(2, "0");
  const monthStr = parts[1].toLowerCase();
  const month = months[monthStr];
  if (!month) {
    throw new Error(`Invalid month: ${parts[1]}`);
  }

  const year = parts[2];
  // Convert 2-digit year to 4-digit
  const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;

  const time = parts[3]; // HH:MM:SS

  return `${fullYear}-${month}-${day} ${time}`;
}

// Parse CSV with simple handling of quoted fields
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Batch insert helper
async function batchInsert(
  conn: mysql.Connection,
  rows: any[],
  batchSize: number = 100
): Promise<number> {
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const placeholders = batch.map(() => "(?, ?, ?, ?, ?)").join(", ");
    const values: any[] = [];

    for (const row of batch) {
      values.push(
        row.transactionId,
        row.date,
        row.recipientAccount,
        row.usdValueRaw,
        row.usdValue
      );
    }

    await conn.execute(
      `INSERT INTO seeds_contributions (transactionId, date, recipientAccount, usdValueRaw, usdValue)
       VALUES ${placeholders}`,
      values
    );

    inserted += batch.length;
  }

  return inserted;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = getCsvPath();

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("CSV file is empty or has only header row");
  }

  // Parse header
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine);
  console.log(`Headers: ${headers.join(", ")}`);

  if (!headers.includes("transactionId")) {
    throw new Error("CSV missing required column: transactionId");
  }
  if (!headers.includes("date")) {
    throw new Error("CSV missing required column: date");
  }
  if (!headers.includes("recipientAccount")) {
    throw new Error("CSV missing required column: recipientAccount");
  }
  if (!headers.includes("multipliedUsdValue")) {
    throw new Error("CSV missing required column: multipliedUsdValue");
  }

  // Parse data rows
  const rows: any[] = [];
  const uniqueAccounts = new Set<string>();
  let totalUsdValue = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseCsvLine(line);

    if (values.length !== headers.length) {
      console.warn(`Skipped malformed row ${i + 1}: ${line}`);
      continue;
    }

    const transactionId = values[0];
    const dateStr = values[1];
    const recipientAccount = values[2];
    const usdValueRaw = parseInt(values[3]);

    if (isNaN(usdValueRaw)) {
      console.warn(
        `Skipped row ${i + 1}: invalid USD value: ${values[3]}`
      );
      continue;
    }

    try {
      const parsedDate = parseDate(dateStr);
      const usdValue = usdValueRaw / 10000;

      rows.push({
        transactionId,
        date: parsedDate,
        recipientAccount,
        usdValueRaw,
        usdValue,
      });

      uniqueAccounts.add(recipientAccount);
      totalUsdValue += usdValue;
    } catch (err) {
      console.warn(
        `Skipped row ${i + 1}: failed to parse date: ${dateStr} (${(err as Error).message})`
      );
    }
  }

  console.log(`\nParsed ${rows.length} valid rows from CSV`);
  console.log(`Unique accounts: ${uniqueAccounts.size}`);
  console.log(
    `Total USD value: $${totalUsdValue.toFixed(2)} (${(totalUsdValue * 10000).toFixed(0)} raw)`
  );

  if (DRY_RUN) {
    console.log("\n=== DRY RUN: no changes will be written ===\n");
    console.log("Sample rows that would be imported:");
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      console.log(
        `  ${row.transactionId} | ${row.date} | ${row.recipientAccount} | $${row.usdValue.toFixed(2)}`
      );
    }
    if (rows.length > 5) {
      console.log(`  ... and ${rows.length - 5} more rows`);
    }
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL env var is required");

  const conn = await mysql.createConnection(dbUrl);

  try {
    // Optionally reset the table
    if (RESET) {
      console.log("\nClearing existing seeds_contributions data...");
      await conn.execute("DELETE FROM seeds_contributions");
      console.log("Table cleared.");
    }

    // Check for duplicates
    console.log("\nChecking for existing transactions...");
    const [existing] = await conn.execute(
      `SELECT COUNT(*) as count FROM seeds_contributions WHERE transactionId IN (${rows.map(() => "?").join(", ")})`,
      rows.map((r) => r.transactionId)
    ) as any;

    const existingCount = existing[0].count;
    if (existingCount > 0 && !RESET) {
      console.warn(
        `Found ${existingCount} existing transactions. Use --reset to replace all data.`
      );
      await conn.end();
      return;
    }

    // Batch insert
    console.log(`\nInserting ${rows.length} rows (batch size 100)...`);
    const inserted = await batchInsert(conn, rows, 100);
    console.log(`Inserted: ${inserted} rows`);

    // Print summary
    const [summary] = await conn.execute(
      `SELECT
        COUNT(*) as totalRows,
        COUNT(DISTINCT recipientAccount) as uniqueAccounts,
        SUM(usdValue) as totalUsdValue
       FROM seeds_contributions`
    ) as any;

    const stats = summary[0];
    console.log("\n=== Import Summary ===");
    console.log(`Total rows in DB: ${stats.totalRows}`);
    console.log(`Unique accounts: ${stats.uniqueAccounts}`);
    console.log(
      `Total USD value: $${parseFloat(stats.totalUsdValue).toFixed(2)}`
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
