/**
 * Seed game_variables for the Bounty Engine and set owner permissions.
 *
 * Run AFTER applying migration 0145_bounty_engine.sql:
 *   npx tsx scripts/seed-bounty-config.ts
 *
 * Idempotent: upserts on key (game_variables) and userId (bounty_permissions).
 * Rye reviews tier amounts and adjusts via game_variables after launch.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const OWNER_EMAIL = "rieki.cordon@gmail.com";

const GAME_VARIABLES: Array<{ key: string; value: number; description: string }> = [
  // Tier schedule (placeholder — Rye confirms real amounts before launch)
  { key: "bounty.tier.trivial.delivery", value: 25, description: "Trivial bounty delivery reward ($ReGen)" },
  { key: "bounty.tier.small.delivery", value: 75, description: "Small bounty delivery reward ($ReGen)" },
  { key: "bounty.tier.medium.delivery", value: 250, description: "Medium bounty delivery reward ($ReGen)" },
  { key: "bounty.tier.large.delivery", value: 750, description: "Large bounty delivery reward ($ReGen)" },
  // Proposer fraction: proposer earns 15% of the delivery amount at merge
  { key: "bounty.proposal_fraction", value: 0.15, description: "Fraction of delivery amount paid to proposer" },
  // Settlement hold: one moon cycle = 29.5 days = 708 hours
  { key: "bounty.settlement_hold_hours", value: 708, description: "Hours before bounty tokens are claimable to Base" },
  // Season budget: 0 = unlimited (set to a positive value to enable the cap)
  { key: "bounty.season_budget", value: 0, description: "Max tokens issuable per season via bounties (0 = unlimited)" },
  // Citizenship tier floor for large bounties: 0 = explorer (everyone qualifies)
  { key: "bounty.large_tier_min", value: 0, description: "Min citizenship tier index for large bounties (0=explorer)" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set — load .env first");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  console.log("Connected to database.");

  // ── Upsert game_variables ────────────────────────────────────────────────
  for (const gv of GAME_VARIABLES) {
    await conn.execute(
      `INSERT INTO game_variables (\`key\`, \`value\`, description, createdAt, updatedAt)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), description = VALUES(description), updatedAt = NOW()`,
      [gv.key, gv.value, gv.description],
    );
    console.log(`  game_variables: ${gv.key} = ${gv.value}`);
  }

  // ── Seed bounty_permissions for the owner ────────────────────────────────
  const [userRows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [OWNER_EMAIL],
  );
  if (!userRows.length) {
    console.warn(`Owner user not found by email ${OWNER_EMAIL} — skipping bounty_permissions seed`);
    console.warn("Once Rye signs in, run this script again to grant owner permissions.");
    await conn.end();
    return;
  }
  const ownerId = userRows[0].id as number;
  await conn.execute(
    `INSERT INTO bounty_permissions (userId, canAccept, canReverse, grantedBy, grantedAt)
     VALUES (?, 1, 1, ?, NOW())
     ON DUPLICATE KEY UPDATE canAccept = 1, canReverse = 1, grantedBy = VALUES(grantedBy), grantedAt = NOW()`,
    [ownerId, ownerId],
  );
  console.log(`  bounty_permissions: userId=${ownerId} (${OWNER_EMAIL}) -> canAccept=1 canReverse=1`);

  await conn.end();
  console.log("\nBounty Engine seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
