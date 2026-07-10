/**
 * Seed the Maiden Voyage Quest checklist (7 required actions).
 *
 * Idempotent by slug. The Food Foresting action links to the existing quest
 * completion "quest-14" (Food Foresting) for auto-verification. The map action
 * uses slug "add-map-location" (the router auto-verifies it when a location the
 * user added gets verified). The referral action uses proofType
 * referral_shortlisted (auto-verifies when a referred Season 2 application is
 * shortlisted).
 *
 * Usage:
 *   npx tsx scripts/seed-ship-quest.ts --dry-run
 *   npx tsx scripts/seed-ship-quest.ts
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");

type Action = {
  slug: string;
  title: string;
  description: string;
  points: number;
  proofType: string;
  linkedQuestId?: string | null;
  sortOrder: number;
};

const ACTIONS: Action[] = [
  { slug: "share-announcement", title: "Share the ReGen Ship announcement", description: "Share the announcement on a social channel, then paste the link. A crew member verifies it.", points: 25, proofType: "link", sortOrder: 1 },
  { slug: "origin-story", title: "Write your regenerative origin story", description: "Post your origin story on the quest forum thread, then paste the link.", points: 25, proofType: "forum", sortOrder: 2 },
  { slug: "refer-land-project", title: "Refer a land project that gets shortlisted", description: "Send a land project to apply with your referral link (/apply?ref=your-handle). This verifies when their application is shortlisted for Season 2.", points: 100, proofType: "referral_shortlisted", sortOrder: 3 },
  { slug: "refer-event-partner", title: "Refer an event or workshop partner", description: "Introduce an event or workshop partner for the treasure map. A crew member confirms the conversation.", points: 50, proofType: "link", sortOrder: 4 },
  { slug: "food-foresting", title: "Complete the Food Foresting quest", description: "Complete the existing Food Foresting quest once. This verifies automatically from your quest history.", points: 50, proofType: "game_quest", linkedQuestId: "quest-14", sortOrder: 5 },
  { slug: "add-map-location", title: "Add a location to the treasure map", description: "Suggest a location on the treasure map. This verifies when a crew member verifies your location.", points: 50, proofType: "link", sortOrder: 6 },
  { slug: "attend-partner-event", title: "Attend or host a partner event", description: "Attend or host a partner event or land project workshop, then share a photo or link. A crew member verifies it.", points: 50, proofType: "photo", sortOrder: 7 },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL not set. Check your .env.");
    process.exit(1);
  }
  console.log(`Seeding ${ACTIONS.length} quest actions${DRY_RUN ? " (dry run)" : ""}...`);
  if (DRY_RUN) {
    for (const a of ACTIONS) console.log(`  would upsert: ${a.slug} (${a.points} pts, ${a.proofType})`);
    return;
  }
  const conn = await mysql.createConnection(url);
  let inserted = 0;
  let updated = 0;
  try {
    for (const a of ACTIONS) {
      const [existing] = await conn.execute("SELECT id FROM ship_quest_actions WHERE slug = ? LIMIT 1", [a.slug]);
      if (Array.isArray(existing) && existing.length > 0) {
        await conn.execute(
          "UPDATE ship_quest_actions SET title = ?, description = ?, points = ?, proofType = ?, linkedQuestId = ?, isRequired = 1, sortOrder = ? WHERE slug = ?",
          [a.title, a.description, a.points, a.proofType, a.linkedQuestId ?? null, a.sortOrder, a.slug],
        );
        updated++;
      } else {
        await conn.execute(
          `INSERT INTO ship_quest_actions (slug, title, description, points, isRequired, proofType, linkedQuestId, sortOrder, createdAt)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?, NOW())`,
          [a.slug, a.title, a.description, a.points, a.proofType, a.linkedQuestId ?? null, a.sortOrder],
        );
        inserted++;
      }
    }
    console.log(`Done. Inserted: ${inserted}, Updated: ${updated}`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
