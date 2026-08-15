/**
 * Seed game_variables for Crowdpooling (CROWDPOOLING_PLATFORM_SPEC.md Part B).
 *
 * Run AFTER applying migrations 0202-0205:
 *   npx tsx scripts/seed-crowdpool-config.ts
 *
 * Idempotent: upserts on the game_variables `key` unique index.
 * Values are read via getGameVariable("crowdpool.<key>") with a 5-minute
 * cache. Rye adjusts via the existing game.updateVariable admin path.
 *
 * Per locked decision 1: no platform token credits for crowdpool
 * contributions, ever. The score weight below is recognition points only,
 * fired on fulfilled (decision 4), never on accepted.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

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
    key: "scoring.weights.crowdpool_contribution",
    category: "scoring",
    subcategory: "weights",
    displayName: "Crowdpool contribution points",
    description: "Points for a fulfilled crowdpool contribution (fires on delivery, never on accept)",
    value: 20,
    valueType: "integer",
    defaultValue: 20,
  },
  {
    key: "crowdpool.claim_expiry_days_item",
    category: "crowdpool",
    subcategory: "claims",
    displayName: "Item claim expiry (days)",
    description: "Days an accepted item claim stays reserved before the nightly sweep expires it",
    value: 14,
    valueType: "integer",
    defaultValue: 14,
  },
  {
    key: "crowdpool.claim_expiry_days_shift",
    category: "crowdpool",
    subcategory: "claims",
    displayName: "Shift claim expiry (days)",
    description: "Days an accepted shift claim stays reserved before the nightly sweep expires it",
    value: 7,
    valueType: "integer",
    defaultValue: 7,
  },
  {
    key: "crowdpool.claim_expiry_days_loan",
    category: "crowdpool",
    subcategory: "claims",
    displayName: "Loan claim expiry (days)",
    description: "Days an accepted loan claim stays reserved before the nightly sweep expires it",
    value: 14,
    valueType: "integer",
    defaultValue: 14,
  },
  {
    key: "crowdpool.reminder_days_before_expiry",
    category: "crowdpool",
    subcategory: "claims",
    displayName: "Claim reminder lead time (days)",
    description: "Days before a claim expires that the reminder notification goes out",
    value: 3,
    valueType: "integer",
    defaultValue: 3,
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set. Load .env first.");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  console.log("Connected to database.");

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

  await conn.end();
  console.log("\nCrowdpool config seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
