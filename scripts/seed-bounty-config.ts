/**
 * Seed game_variables for the Bounty Engine and set owner permissions.
 *
 * Run AFTER applying migration 0145_bounty_engine.sql:
 *   npx tsx scripts/seed-bounty-config.ts
 *
 * Idempotent: upserts on `key` (game_variables) and userId (bounty_permissions).
 * Rye reviews tier amounts and adjusts via game_variables after launch.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const OWNER_EMAIL = "rieki.cordon@gmail.com";

type GV = {
  key: string;
  category: string;
  subcategory: string;
  displayName: string;
  description: string;
  value: number;
  valueType: "integer" | "decimal" | "percentage" | "boolean" | "multiplier";
  defaultValue: number;
};

const GAME_VARIABLES: GV[] = [
  {
    key: "bounty.tier.trivial.delivery",
    category: "bounty",
    subcategory: "tier",
    displayName: "Trivial Tier Delivery Reward",
    description: "Trivial bounty delivery reward ($ReGen)",
    value: 25,
    valueType: "integer",
    defaultValue: 25,
  },
  {
    key: "bounty.tier.small.delivery",
    category: "bounty",
    subcategory: "tier",
    displayName: "Small Tier Delivery Reward",
    description: "Small bounty delivery reward ($ReGen)",
    value: 75,
    valueType: "integer",
    defaultValue: 75,
  },
  {
    key: "bounty.tier.medium.delivery",
    category: "bounty",
    subcategory: "tier",
    displayName: "Medium Tier Delivery Reward",
    description: "Medium bounty delivery reward ($ReGen)",
    value: 250,
    valueType: "integer",
    defaultValue: 250,
  },
  {
    key: "bounty.tier.large.delivery",
    category: "bounty",
    subcategory: "tier",
    displayName: "Large Tier Delivery Reward",
    description: "Large bounty delivery reward ($ReGen)",
    value: 750,
    valueType: "integer",
    defaultValue: 750,
  },
  {
    key: "bounty.proposal_fraction",
    category: "bounty",
    subcategory: "rewards",
    displayName: "Proposer Fraction",
    description: "Fraction of the delivery amount paid to the proposer at merge",
    value: 0.15,
    valueType: "decimal",
    defaultValue: 0.15,
  },
  {
    key: "bounty.settlement_hold_hours",
    category: "bounty",
    subcategory: "settlement",
    displayName: "Settlement Hold (Hours)",
    description: "Hours before bounty tokens are claimable to Base (one moon cycle = 708 h)",
    value: 708,
    valueType: "integer",
    defaultValue: 708,
  },
  {
    key: "bounty.season_budget",
    category: "bounty",
    subcategory: "budget",
    displayName: "Season Token Budget",
    description: "Max tokens issuable per season via bounties (0 = unlimited)",
    value: 0,
    valueType: "integer",
    defaultValue: 0,
  },
  {
    key: "bounty.large_tier_min",
    category: "bounty",
    subcategory: "access",
    displayName: "Large Tier Citizenship Floor",
    description: "Min citizenship tier index for large bounties (0 = explorer, everyone qualifies)",
    value: 0,
    valueType: "integer",
    defaultValue: 0,
  },
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
      `INSERT INTO game_variables
         (category, subcategory, \`key\`, displayName, description, \`value\`, valueType, defaultValue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`value\`    = VALUES(\`value\`),
         displayName  = VALUES(displayName),
         description  = VALUES(description),
         valueType    = VALUES(valueType),
         defaultValue = VALUES(defaultValue),
         updatedAt    = NOW()`,
      [gv.category, gv.subcategory, gv.key, gv.displayName, gv.description, gv.value, gv.valueType, gv.defaultValue],
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
     ON DUPLICATE KEY UPDATE
       canAccept  = 1,
       canReverse = 1,
       grantedBy  = VALUES(grantedBy),
       grantedAt  = NOW()`,
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
