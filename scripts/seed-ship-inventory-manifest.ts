/**
 * seed-ship-inventory-manifest.ts
 *
 * Idempotent seed for the `ship_inventory` table — the PHYSICAL manifest of
 * everything aboard the 2006 Fleetwood Revolution LE, transcribed from the RV
 * walkthrough videos. This is distinct from scripts/seed-ship-inventory.ts,
 * which seeds the gamified `ship_inventory_items` "bag".
 *
 * Reads data/rv_inventory.json and upserts each item on its `id` primary key,
 * so re-running never duplicates rows.
 *
 * Usage:
 *   npx tsx scripts/seed-ship-inventory-manifest.ts             # upsert all
 *   npx tsx scripts/seed-ship-inventory-manifest.ts --dry-run   # no writes
 *   npx tsx scripts/seed-ship-inventory-manifest.ts --reset     # delete all rows first
 *
 * Requires DATABASE_URL in the environment (.env). For local runs against
 * Railway use the public proxy URL, not mysql.railway.internal.
 */
import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set (check your .env file).");
  process.exit(1);
}

const isDryRun = process.argv.includes("--dry-run");
const isReset = process.argv.includes("--reset");

interface Item {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  zone: string;
  location: string | null;
  condition: string | null;
  notes: string | null;
  source_video: string | null;
  timestamp: string | null;
  confidence: string;
}

async function main() {
  const dataPath = path.resolve(process.cwd(), "data", "rv_inventory.json");
  const items: Item[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`Loaded ${items.length} items from ${dataPath}`);

  if (isDryRun) {
    console.log("DRY RUN — no writes will occur.");
    console.log(`Would upsert ${items.length} rows into ship_inventory.`);
    process.exit(0);
  }

  const conn = await mysql.createConnection(DATABASE_URL!);
  try {
    if (isReset) {
      await conn.execute("DELETE FROM ship_inventory");
      console.log("Reset: cleared ship_inventory.");
    }

    let n = 0;
    for (const it of items) {
      await conn.execute(
        `INSERT INTO ship_inventory
           (id, name, quantity, unit, category, zone, location,
            itemCondition, notes, sourceVideo, sourceTimestamp, confidence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           quantity = VALUES(quantity),
           unit = VALUES(unit),
           category = VALUES(category),
           zone = VALUES(zone),
           location = VALUES(location),
           itemCondition = VALUES(itemCondition),
           notes = VALUES(notes),
           sourceVideo = VALUES(sourceVideo),
           sourceTimestamp = VALUES(sourceTimestamp),
           confidence = VALUES(confidence)`,
        [
          it.id,
          it.name,
          it.quantity ?? 1,
          it.unit || null,
          it.category,
          it.zone,
          it.location || null,
          it.condition || null,
          it.notes || null,
          it.source_video || null,
          it.timestamp || null,
          it.confidence || "medium",
        ]
      );
      n++;
    }
    console.log(`Upserted ${n} rows into ship_inventory.`);

    const [rows] = (await conn.execute(
      "SELECT COUNT(*) AS c FROM ship_inventory"
    )) as any;
    console.log(`ship_inventory now has ${rows[0].c} rows.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
