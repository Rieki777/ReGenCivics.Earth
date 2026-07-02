// Single source of truth for the numbers shown on the public game-mechanics
// pages. The server assembles a GameMechanicsSnapshot from the live
// game_variables table plus a few structural constants and serves it via
// `gameMechanics.getAll`; the client renders those values instead of
// hardcoding them, so the pages can never drift from the engine.
//
// Rule of thumb for where a number belongs:
//   - Tunable dial the engine reads at runtime -> game_variables (listed in
//     MECHANICS_VARIABLE_FALLBACKS, engine reads it via getGameVariable).
//   - Structural constant coupled to code/content (tier bonus amounts, rite
//     count) -> a shared constant, re-exported through the snapshot.

import {
  TIER_BONUS,
  RITES_OF_PASSAGE_COUNT,
  PLAYER_STEWARD_QUEST_COUNT,
  PLAYER_STEWARD_VOTE_COUNT,
} from "./questPools";

// Mean synodic lunar month. The gratitude/harvest cadence is one lunar cycle.
export const LUNAR_CYCLE_DAYS = 29.53;

// $ReGen credited per $1 USD of SEEDS contribution. Mirrors the server-side
// constant in server/routes/seedsClaims.ts. See the note there: spec says 100,
// the shipped credit path uses 1:1 — changing it is a deliberate economics
// decision, so both sides read this one constant.
export const SEEDS_REGEN_PER_USD = 1;

/**
 * Every game_variables key the snapshot exposes, with the value to fall back
 * on if the key is missing from the live table. Fallbacks match the seed
 * migrations so a fresh or partially-seeded environment still renders sane
 * numbers. Keep this list in sync with what the engine actually reads.
 */
export const MECHANICS_VARIABLE_FALLBACKS: Record<string, number> = {
  // Scoring weights
  "scoring.weights.quest_routine": 10,
  "scoring.weights.forum_post": 5,
  // Citizenship tiers
  "citizenship.co_creator.min_percentile": 15,
  "citizenship.co_creator.min_seasons": 2,
  "citizenship.steward.min_percentile": 50,
  "citizenship.steward.min_seasons": 3,
  "citizenship.sage.min_percentile": 90,
  "citizenship.sage.min_seasons": 6,
  "citizenship.grace_period_days": 30,
  "citizenship.co_creator.harvest_multiplier": 1.5,
  "citizenship.steward.harvest_multiplier": 2.0,
  "citizenship.sage.harvest_multiplier": 3.0,
  // Gratitude
  "gratitude.multiplier.co_creator": 1.2,
  "gratitude.multiplier.steward": 1.5,
  "gratitude.multiplier.sage": 2.0,
  "gratitude.trust_graph.received_weight": 0.1,
  "gratitude.trust_graph.max_bonus": 0.5,
  // Token claim thresholds
  "governance.claim_threshold_regen": 1000,
  "governance.claim_threshold_rgvoice": 20,
  "governance.claim_threshold_rcivics": 1000,
  "governance.claim_threshold_rcvoice": 20,
  // Harvest split (percent to each pool)
  "harvest.split.contributors": 30,
  "harvest.split.projects": 20,
  "harvest.split.stewards": 20,
  "harvest.split.treasury": 30,
  // Bounty tier base rewards
  "bounty.tier.small.base": 25,
  "bounty.tier.medium.base": 75,
  "bounty.tier.large.base": 250,
  "bounty.tier.epic.base": 750,
  "bounty.round_to": 25,
  // Standalone rewards
  "plays.adoption_reward": 500,
  "hymnSubmissionWinnerReward": 3333,
  "trust.composting_rate": 5,
};

export const MECHANICS_VARIABLE_KEYS = Object.keys(MECHANICS_VARIABLE_FALLBACKS);

export interface TierMechanics {
  minPercentile: number;
  minSeasons: number;
  harvestMultiplier: number;
  gratitudeMultiplier: number;
}

export interface GameMechanicsSnapshot {
  scoring: {
    questPoints: number;
    forumPostPoints: number;
  };
  citizenship: {
    gracePeriodDays: number;
    tiers: {
      coCreator: TierMechanics;
      steward: TierMechanics;
      sage: TierMechanics;
    };
  };
  gratitude: {
    trustGraphReceivedWeight: number;
    trustGraphMaxBonus: number;
    compostingRatePct: number;
  };
  claims: {
    thresholds: {
      regen: number;
      rgvoice: number;
      rcivics: number;
      rcvoice: number;
    };
  };
  harvest: {
    split: {
      contributors: number;
      projects: number;
      stewards: number;
      treasury: number;
    };
  };
  bounties: {
    tierBase: { small: number; medium: number; large: number; epic: number };
    roundTo: number;
  };
  quests: {
    ritesOfPassageCount: number;
    stewardQuestCount: number;
    stewardVoteCount: number;
    tierBonus: { coCreator: number; steward: number; sage: number };
  };
  rewards: {
    playAdoption: number;
    hymnWinner: number;
    seedsRegenPerUsd: number;
  };
  meta: {
    lunarCycleDays: number;
    // Unix ms the snapshot was assembled; lets the client show freshness.
    generatedAt: number;
  };
}

/**
 * Assemble the snapshot from a resolved {key: value} map (already merged with
 * fallbacks). Pure so it can be unit-tested without a DB. `generatedAt` is
 * passed in rather than read from the clock to keep this deterministic.
 */
export function buildGameMechanicsSnapshot(
  v: Record<string, number>,
  generatedAt: number,
): GameMechanicsSnapshot {
  const get = (key: string): number =>
    v[key] ?? MECHANICS_VARIABLE_FALLBACKS[key] ?? 0;
  return {
    scoring: {
      questPoints: get("scoring.weights.quest_routine"),
      forumPostPoints: get("scoring.weights.forum_post"),
    },
    citizenship: {
      gracePeriodDays: get("citizenship.grace_period_days"),
      tiers: {
        coCreator: {
          minPercentile: get("citizenship.co_creator.min_percentile"),
          minSeasons: get("citizenship.co_creator.min_seasons"),
          harvestMultiplier: get("citizenship.co_creator.harvest_multiplier"),
          gratitudeMultiplier: get("gratitude.multiplier.co_creator"),
        },
        steward: {
          minPercentile: get("citizenship.steward.min_percentile"),
          minSeasons: get("citizenship.steward.min_seasons"),
          harvestMultiplier: get("citizenship.steward.harvest_multiplier"),
          gratitudeMultiplier: get("gratitude.multiplier.steward"),
        },
        sage: {
          minPercentile: get("citizenship.sage.min_percentile"),
          minSeasons: get("citizenship.sage.min_seasons"),
          harvestMultiplier: get("citizenship.sage.harvest_multiplier"),
          gratitudeMultiplier: get("gratitude.multiplier.sage"),
        },
      },
    },
    gratitude: {
      trustGraphReceivedWeight: get("gratitude.trust_graph.received_weight"),
      trustGraphMaxBonus: get("gratitude.trust_graph.max_bonus"),
      compostingRatePct: get("trust.composting_rate"),
    },
    claims: {
      thresholds: {
        regen: get("governance.claim_threshold_regen"),
        rgvoice: get("governance.claim_threshold_rgvoice"),
        rcivics: get("governance.claim_threshold_rcivics"),
        rcvoice: get("governance.claim_threshold_rcvoice"),
      },
    },
    harvest: {
      split: {
        contributors: get("harvest.split.contributors"),
        projects: get("harvest.split.projects"),
        stewards: get("harvest.split.stewards"),
        treasury: get("harvest.split.treasury"),
      },
    },
    bounties: {
      tierBase: {
        small: get("bounty.tier.small.base"),
        medium: get("bounty.tier.medium.base"),
        large: get("bounty.tier.large.base"),
        epic: get("bounty.tier.epic.base"),
      },
      roundTo: get("bounty.round_to"),
    },
    quests: {
      ritesOfPassageCount: RITES_OF_PASSAGE_COUNT,
      stewardQuestCount: PLAYER_STEWARD_QUEST_COUNT,
      stewardVoteCount: PLAYER_STEWARD_VOTE_COUNT,
      tierBonus: {
        coCreator: TIER_BONUS.co_creator,
        steward: TIER_BONUS.steward,
        sage: TIER_BONUS.sage,
      },
    },
    rewards: {
      playAdoption: get("plays.adoption_reward"),
      hymnWinner: get("hymnSubmissionWinnerReward"),
      seedsRegenPerUsd: SEEDS_REGEN_PER_USD,
    },
    meta: {
      lunarCycleDays: LUNAR_CYCLE_DAYS,
      generatedAt,
    },
  };
}
