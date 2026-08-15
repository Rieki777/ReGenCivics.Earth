/**
 * Seed example crews for the Free Passage Quest draw board, so the first real
 * person to reach the points line does not feel like the first person aboard.
 *
 * What it does:
 *   - Creates 5 example crew accounts (openId prefix "demo-ship-crew:").
 *   - Gives each a set of VERIFIED quest completions summing past the 150-point
 *     entry threshold, so they appear on the live draw board with varied ticket
 *     counts (300 / 250 / 200 / 175 / 150).
 *   - Publishes a crew profile card for each, so /ship/quest shows real cards.
 *
 * On the draw: a public crew card is, by design, a live draw entry
 * (server/routes/ship.ts crew.listPublished only shows crews that are actually
 * in the draw). So these example crews CAN be drawn. Rye's call, 2026-07-16:
 * that is acceptable, and the draw is simply re-run if an example crew wins.
 *
 * On money: the cards are seeded already fully sponsored (sponsoredCents =
 * sponsorGoalCents, status "sponsored") so they read as funded and never solicit
 * a real donation toward a crew that is not a real person. To make them
 * sponsorable instead, set FULLY_SPONSORED = false below.
 *
 * Idempotent: keyed by openId + the (userId, actionId) unique constraint.
 *
 * Reversible:
 *   npx tsx scripts/seed-ship-example-crews.ts --undo
 *
 * Usage:
 *   npx tsx scripts/seed-ship-example-crews.ts --dry-run
 *   npx tsx scripts/seed-ship-example-crews.ts
 *   npx tsx scripts/seed-ship-example-crews.ts --undo
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { DEMO_CREW_OPENID_PREFIX } from "../shared/shipDemo";

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");
const UNDO = process.argv.includes("--undo");

// One shared prefix, so the drawing's exclusion can never drift from the seed.
const CREW_OPENID_PREFIX = DEMO_CREW_OPENID_PREFIX;
const FULLY_SPONSORED = true;

type Crew = {
  slot: number;
  name: string;
  handle: string;
  bio: string;
  intent: string;
  /** ship_quest_actions ids this crew has verified. Points are read from the DB. */
  actions: number[];
  /** Days ago the completions were verified, for a natural-looking board. */
  daysAgo: number;
};

// Action ids (from ship_quest_actions): 1=25 share, 2=25 origin-story,
// 3=100 refer-land-project, 4=50 refer-event-partner, 5=50 food-foresting,
// 6=50 add-map-location, 7=50 attend-partner-event, 8/9/10=25 love actions,
// 11=50 plant-together, 12=50 give-a-day, 13=50 bring-a-couple.
const CREWS: Crew[] = [
  {
    slot: 1, name: "The Wildrose Crew", handle: "wildrose", daysAgo: 12,
    bio: "Two growers from the Applegate who have been planting hedgerow and hauling water for other people's land for years.",
    intent: "We want to sail the Rogue and leave a seed trail behind us the whole way.",
    actions: [3, 6, 7, 12, 13], // 300
  },
  {
    slot: 2, name: "Juniper & Sage", handle: "junipersage", daysAgo: 9,
    bio: "A partnership that runs a small seed library out of a converted barn, and gives most of it away.",
    intent: "To visit the land projects we have only ever mailed seeds to.",
    actions: [3, 4, 5, 11], // 250
  },
  {
    slot: 3, name: "The Foxglove", handle: "foxglove", daysAgo: 6,
    bio: "A food forester and a river guide who met planting chestnuts and never really stopped.",
    intent: "We want to map the springs nobody has written down yet.",
    actions: [1, 2, 5, 6, 7], // 200
  },
  {
    slot: 4, name: "Hollis & Wren", handle: "holliswren", daysAgo: 4,
    bio: "New to all of this and going anyway. They started with a love letter to a landscape and kept going.",
    intent: "To learn enough to be useful, and to cook for everyone we meet.",
    actions: [1, 2, 8, 9, 10, 11], // 175
  },
  {
    slot: 5, name: "The Alder Crew", handle: "aldercrew", daysAgo: 2,
    bio: "A family of four who brought a whole land project to the table in their first week.",
    intent: "To show our kids what a regenerating watershed looks like from the inside.",
    actions: [1, 2, 3], // 150
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL not set. Check your .env.");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  try {
    if (UNDO) {
      const [ids] = await conn.execute("SELECT id FROM users WHERE openId LIKE ?", [`${CREW_OPENID_PREFIX}%`]);
      const userIds = (ids as { id: number }[]).map((r) => r.id);
      if (userIds.length === 0) {
        console.log("Nothing to undo: no example crews found.");
        return;
      }
      const list = userIds.join(",");
      const [dc] = await conn.query(`DELETE FROM ship_quest_completions WHERE userId IN (${list})`);
      const [dp] = await conn.query(`DELETE FROM ship_crew_profiles WHERE userId IN (${list})`);
      const [du] = await conn.query(`DELETE FROM users WHERE id IN (${list})`);
      const n = (x: unknown) => (x as { affectedRows?: number }).affectedRows ?? 0;
      console.log(`Undo complete. Removed ${n(dc)} completions, ${n(dp)} crew cards, ${n(du)} example crews.`);
      return;
    }

    // Read the real action points so the seeded totals can never drift from config.
    const [arows] = await conn.execute("SELECT id, points FROM ship_quest_actions");
    const points = new Map<number, number>((arows as { id: number; points: number }[]).map((r) => [r.id, r.points]));
    const totalFor = (c: Crew) => c.actions.reduce((s, id) => s + (points.get(id) ?? 0), 0);

    if (DRY_RUN) {
      console.log("DRY RUN — would seed these example crews (threshold is 150):");
      for (const c of CREWS) {
        console.log(`  ${c.name} (@${c.handle}) — ${totalFor(c)} pts from actions [${c.actions.join(", ")}] — ${totalFor(c) >= 150 ? "IN the draw" : "BELOW threshold!"}`);
      }
      console.log(`Cards seeded ${FULLY_SPONSORED ? "fully sponsored (no donation solicited)" : "sponsorable"}.`);
      return;
    }

    let createdUsers = 0;
    let createdCompletions = 0;
    let createdCards = 0;

    for (const c of CREWS) {
      const total = totalFor(c);
      if (total < 150) {
        console.error(`SKIP ${c.name}: only ${total} pts, below the 150 threshold.`);
        continue;
      }
      const openId = `${CREW_OPENID_PREFIX}${c.slot}`;

      // 1) the account
      const [ex] = await conn.execute("SELECT id FROM users WHERE openId = ? LIMIT 1", [openId]);
      let userId: number;
      if (Array.isArray(ex) && ex.length > 0) {
        userId = (ex[0] as { id: number }).id;
      } else {
        const [res] = await conn.execute(
          "INSERT INTO users (openId, name, handle, loginMethod, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, 'seed', NOW(), NOW(), NOW())",
          [openId, c.name, c.handle],
        );
        userId = (res as { insertId: number }).insertId;
        createdUsers++;
      }

      // 2) the verified completions (unique on userId+actionId, so skip existing)
      for (const actionId of c.actions) {
        const [ec] = await conn.execute(
          "SELECT id FROM ship_quest_completions WHERE userId = ? AND actionId = ? LIMIT 1",
          [userId, actionId],
        );
        if (Array.isArray(ec) && ec.length > 0) continue;
        await conn.execute(
          `INSERT INTO ship_quest_completions (userId, actionId, status, verifiedAt, createdAt)
           VALUES (?, ?, 'verified', DATE_SUB(NOW(), INTERVAL ? DAY), DATE_SUB(NOW(), INTERVAL ? DAY))`,
          [userId, actionId, c.daysAgo, c.daysAgo + 1],
        );
        createdCompletions++;
      }

      // 3) the public crew card
      const [ep] = await conn.execute("SELECT id FROM ship_crew_profiles WHERE userId = ? LIMIT 1", [userId]);
      if (!(Array.isArray(ep) && ep.length > 0)) {
        const goal = 210000;
        const sponsored = FULLY_SPONSORED ? goal : 0;
        const status = FULLY_SPONSORED ? "sponsored" : "published";
        await conn.execute(
          `INSERT INTO ship_crew_profiles
             (userId, displayName, bio, intent, isPublic, sponsorGoalCents, sponsoredCents, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?, NOW(), NOW())`,
          [userId, c.name, c.bio, c.intent, goal, sponsored, status],
        );
        createdCards++;
      }
      console.log(`  ${c.name} (@${c.handle}) ready — ${total} pts, in the draw.`);
    }

    console.log(`Done. Crews created: ${createdUsers}, completions: ${createdCompletions}, cards: ${createdCards}.`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
