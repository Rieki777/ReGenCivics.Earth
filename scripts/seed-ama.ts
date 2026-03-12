/**
 * Seed the first upcoming AMA: Amora Costa Rica, April 26 2026 11:00 AM EST
 * Usage: npx tsx scripts/seed-ama.ts [--dry-run]
 */
import mysql from "mysql2/promise";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const ama = {
    projectName: "Amora Costa Rica",
    hostName: "La Tierra team",
    date: "2026-04-26",
    time: "11:00 AM EST",
    timezone: "America/New_York",
    forumThreadUrl: null as string | null,
    isActive: 1,
  };

  console.log("Seeding AMA:");
  console.log(JSON.stringify(ama, null, 2));

  if (DRY_RUN) {
    console.log("\n--dry-run: no changes made.");
    return;
  }

  const conn = await mysql.createConnection(url);
  try {
    const [existing] = await conn.execute(
      "SELECT id FROM upcoming_amas WHERE projectName = ? AND date = ? LIMIT 1",
      [ama.projectName, ama.date]
    );
    if (Array.isArray(existing) && existing.length > 0) {
      console.log("AMA already exists, skipping.");
    } else {
      await conn.execute(
        `INSERT INTO upcoming_amas (projectName, hostName, date, time, timezone, forumThreadUrl, isActive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [ama.projectName, ama.hostName, ama.date, ama.time, ama.timezone, ama.forumThreadUrl, ama.isActive]
      );
      console.log("AMA seeded successfully.");
    }
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
