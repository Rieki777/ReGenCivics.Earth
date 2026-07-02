/**
 * Seed game_variables for the Bounty Valuation Engine.
 *
 * Run AFTER applying migration 0153_bounty_valuation.sql:
 *   npx tsx scripts/seed-bounty-valuation.ts
 *
 * Idempotent: upserts on `key`. Every value is a public, community-governed
 * weight; stewards tune within the published min/max, changing the bounds
 * themselves is a Hypha vote. See BOUNTY_VALUATION_ENGINE_SPEC.md.
 *
 * These `bounty.tier.*.base` amounts intentionally match the legacy
 * `bounty.tier.*.delivery` defaults, so a baseline bounty (normal impact, no
 * priority boost, demand 1.0, no precedent) values exactly to its base and
 * behaves identically to the flat-tier engine. The valuation only moves an
 * amount when impact, priority, or learned demand differ.
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
  minValue: number;
  maxValue: number;
};

const GAME_VARIABLES: GV[] = [
  // ── Tier base amounts ($ReGen) ────────────────────────────────────────────
  { key: "bounty.tier.trivial.base", category: "bounty", subcategory: "valuation", displayName: "Trivial Base Reward", description: "Base $ReGen for a trivial bounty (a quick favor).", value: 25, valueType: "integer", defaultValue: 25, minValue: 0, maxValue: 100000 },
  { key: "bounty.tier.small.base", category: "bounty", subcategory: "valuation", displayName: "Small Base Reward", description: "Base $ReGen for a small bounty (one clear deliverable).", value: 75, valueType: "integer", defaultValue: 75, minValue: 0, maxValue: 100000 },
  { key: "bounty.tier.medium.base", category: "bounty", subcategory: "valuation", displayName: "Medium Base Reward", description: "Base $ReGen for a medium bounty (a real piece of work).", value: 250, valueType: "integer", defaultValue: 250, minValue: 0, maxValue: 100000 },
  { key: "bounty.tier.large.base", category: "bounty", subcategory: "valuation", displayName: "Large Base Reward", description: "Base $ReGen for a large bounty (a substantial build).", value: 750, valueType: "integer", defaultValue: 750, minValue: 0, maxValue: 100000 },

  // ── Impact multipliers ────────────────────────────────────────────────────
  { key: "bounty.impact.low", category: "bounty", subcategory: "valuation", displayName: "Impact: Low", description: "Multiplier for internal polish or nice-to-have work.", value: 0.75, valueType: "multiplier", defaultValue: 0.75, minValue: 0.1, maxValue: 1.0 },
  { key: "bounty.impact.normal", category: "bounty", subcategory: "valuation", displayName: "Impact: Normal", description: "Multiplier for work that moves the movement forward. Most work lands here.", value: 1.0, valueType: "multiplier", defaultValue: 1.0, minValue: 0.5, maxValue: 1.5 },
  { key: "bounty.impact.high", category: "bounty", subcategory: "valuation", displayName: "Impact: High", description: "Multiplier when work directly serves a land project, unblocks a season, or heals a real relationship or system.", value: 1.5, valueType: "multiplier", defaultValue: 1.5, minValue: 1.0, maxValue: 3.0 },

  // ── Priority + anchor ─────────────────────────────────────────────────────
  { key: "bounty.priority.boost", category: "bounty", subcategory: "valuation", displayName: "Priority Boost", description: "Nudge a specific hard-to-fill bounty gets to attract someone.", value: 1.25, valueType: "multiplier", defaultValue: 1.25, minValue: 1.0, maxValue: 2.0 },
  { key: "bounty.anchor.weight", category: "bounty", subcategory: "valuation", displayName: "Precedent Anchor Weight", description: "How strongly a reward is pulled toward what similar work has actually paid (0 = ignore precedent, 1 = match it).", value: 0.25, valueType: "decimal", defaultValue: 0.25, minValue: 0, maxValue: 1 },

  // ── Self-learning loop ────────────────────────────────────────────────────
  { key: "bounty.learning.window_days", category: "bounty", subcategory: "learning", displayName: "Learning Window (days)", description: "How far back the engine looks when it learns precedent and demand.", value: 45, valueType: "integer", defaultValue: 45, minValue: 7, maxValue: 365 },
  { key: "bounty.learning.unclaimed_days", category: "bounty", subcategory: "learning", displayName: "Unclaimed Threshold (days)", description: "How long a bounty sits open before it counts as an unclaimed signal.", value: 14, valueType: "integer", defaultValue: 14, minValue: 1, maxValue: 90 },
  { key: "bounty.learning.raise_sensitivity", category: "bounty", subcategory: "learning", displayName: "Raise Sensitivity", description: "How boldly the reward rises when a kind of bounty keeps going unclaimed.", value: 0.15, valueType: "decimal", defaultValue: 0.15, minValue: 0, maxValue: 1 },
  { key: "bounty.learning.lower_sensitivity", category: "bounty", subcategory: "learning", displayName: "Lower Sensitivity", description: "How gently the reward falls when bounties are claimed instantly.", value: 0.05, valueType: "decimal", defaultValue: 0.05, minValue: 0, maxValue: 1 },
  { key: "bounty.learning.factor_min", category: "bounty", subcategory: "learning", displayName: "Demand Factor Floor", description: "The lowest the learned demand factor can go.", value: 0.9, valueType: "multiplier", defaultValue: 0.9, minValue: 0.1, maxValue: 1.0 },
  { key: "bounty.learning.factor_max", category: "bounty", subcategory: "learning", displayName: "Demand Factor Ceiling", description: "The highest the learned demand factor can go.", value: 1.4, valueType: "multiplier", defaultValue: 1.4, minValue: 1.0, maxValue: 5.0 },

  // ── Bounds + rounding ─────────────────────────────────────────────────────
  { key: "bounty.max", category: "bounty", subcategory: "valuation", displayName: "Per-Bounty Ceiling", description: "Safety ceiling in $ReGen on any single bounty, whatever the factors.", value: 2000, valueType: "integer", defaultValue: 2000, minValue: 0, maxValue: 100000 },
  { key: "bounty.round_to", category: "bounty", subcategory: "valuation", displayName: "Round To", description: "Rewards round to clean multiples of this many $ReGen.", value: 25, valueType: "integer", defaultValue: 25, minValue: 1, maxValue: 1000 },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set — load .env first");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  console.log("Connected to database.");

  for (const gv of GAME_VARIABLES) {
    await conn.execute(
      `INSERT INTO game_variables
         (category, subcategory, \`key\`, displayName, description, \`value\`, valueType, \`minValue\`, \`maxValue\`, defaultValue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         displayName  = VALUES(displayName),
         description  = VALUES(description),
         valueType    = VALUES(valueType),
         \`minValue\`  = VALUES(\`minValue\`),
         \`maxValue\`  = VALUES(\`maxValue\`),
         defaultValue = VALUES(defaultValue),
         updatedAt    = NOW()`,
      [gv.category, gv.subcategory, gv.key, gv.displayName, gv.description, gv.value, gv.valueType, gv.minValue, gv.maxValue, gv.defaultValue],
    );
    console.log(`  game_variables: ${gv.key} = ${gv.value}  [${gv.minValue}..${gv.maxValue}]`);
  }

  await conn.end();
  console.log(`\nBounty valuation seed complete (${GAME_VARIABLES.length} variables).`);
  console.log("Note: the ON DUPLICATE path does not overwrite a live `value`, so steward tunings survive re-seeding.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
