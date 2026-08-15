// Single source of truth for the numbers shown on the public game-mechanics
// pages. The server assembles a GameMechanicsSnapshot from the live
// game_variables table plus a few structural constants and serves it via
// `gameMechanics.getAll`; the client renders those values instead of
// hardcoding them, so the pages can never drift from the engine.
//
// Rule of thumb for where a number belongs:
//   - Tunable dial the engine reads at runtime -> game_variables (listed in
//     MECHANICS_VARIABLE_FALLBACKS, engine reads it via getGameVariable).
//   - Structural constant coupled to code/content (rite count) -> a shared
//     constant, re-exported through the snapshot.
//
// Parity contract (audit 2026-07-31): every key the ENGINE reads from
// game_variables belongs in MECHANICS_VARIABLE_FALLBACKS with a fallback
// equal to the seeded value. server/gameMechanics.test.ts cross-checks the
// drift-prone families against the server-side default constants.

import {
  TIER_BONUS,
  RITES_OF_PASSAGE_COUNT,
  PLAYER_STEWARD_QUEST_COUNT,
  PLAYER_STEWARD_VOTE_COUNT,
} from "./questPools";

// Mean synodic lunar month. The gratitude/harvest cadence is one lunar cycle.
export const LUNAR_CYCLE_DAYS = 29.53;

// Fallback for the SEEDS -> $ReGen claim rate ($ReGen per $1 USD) when the
// `seeds.regen_per_usd` game variable is missing. Live value is tunable in the
// admin UI. Decision (2026-07-02): $ReGen = $0.10, so the rate is 10.
export const SEEDS_REGEN_PER_USD = 10;

/**
 * Every game_variables key the snapshot exposes, with the value to fall back
 * on if the key is missing from the live table. Fallbacks match the seed
 * migrations so a fresh or partially-seeded environment still renders sane
 * numbers. Keep this list in sync with what the engine actually reads.
 */
export const MECHANICS_VARIABLE_FALLBACKS: Record<string, number> = {
  // Scoring weights. NOTE: quest_routine and forum_post currently have NO
  // recordScoreEvent writer in server/ — shown as declared policy; the only
  // weights the engine actually records today are crowdpool_contribution and
  // the endorsement pair.
  "scoring.weights.quest_routine": 10,
  "scoring.weights.forum_post": 5,
  "scoring.weights.crowdpool_contribution": 20,
  "scoring.weights.endorsement_from_project": 20,
  "scoring.weights.endorsement_from_player": 5,
  // Citizenship tiers (enforced criteria only — min_fire_quest/min_rites/
  // min_epic_quests are seeded but the promotion loop never checks them, so
  // they stay off the snapshot until wired or retired)
  "citizenship.co_creator.min_percentile": 15,
  "citizenship.co_creator.min_seasons": 2,
  "citizenship.co_creator.min_gratitude_sent": 5,
  "citizenship.steward.min_percentile": 50,
  "citizenship.steward.min_seasons": 3,
  "citizenship.steward.min_endorsements_project": 1,
  "citizenship.steward.min_gratitude_received": 10,
  "citizenship.sage.min_percentile": 90,
  "citizenship.sage.min_seasons": 6,
  "citizenship.sage.min_contributions": 100,
  "citizenship.sage.min_endorsements_total": 10,
  "citizenship.grace_period_days": 30,
  "citizenship.co_creator.harvest_multiplier": 1.5,
  "citizenship.steward.harvest_multiplier": 2.0,
  "citizenship.sage.harvest_multiplier": 3.0,
  // Gratitude — the ADR-30 lunar-cycle economy the engine actually runs
  "gratitude.base_budget": 100,
  "gratitude.full_power_threshold": 10,
  "gratitude.streak_bonus_per_cycle": 0.03,
  "gratitude.streak_bonus_max": 0.30,
  "gratitude.budget_multiplier.explorer": 1.0,
  "gratitude.budget_multiplier.co_creator": 2.0,
  "gratitude.budget_multiplier.steward": 3.0,
  "gratitude.budget_multiplier.sage": 5.0,
  "gratitude.pool_per_cycle": 10000,
  "gratitude.max_payout_per_person": 1000,
  // Legacy trust-graph gratitude keys (no engine reads them; kept for the
  // trust-graph display until that engine ships or the keys retire)
  "gratitude.trust_graph.received_weight": 0.1,
  "gratitude.trust_graph.max_bonus": 0.5,
  // Trust formula weights (batch trust job)
  "trust.weight.endorsements_from_projects": 4,
  "trust.weight.endorsements_from_players": 1,
  "trust.weight.account_age_seasons": 0.5,
  "trust.weight.quests_completed": 0.2,
  "trust.weight.gratitude_received": 0.3,
  "trust.weight.flags_validated": -5,
  "trust.weight.contribution_percentile": 0.01,
  "trust.composting_rate": 5,
  // Token claim thresholds
  "governance.claim_threshold_regen": 1000,
  "governance.claim_threshold_rgvoice": 20,
  "governance.claim_threshold_rcivics": 1000,
  "governance.claim_threshold_rcvoice": 20,
  // Harvest split (percent to each pool) — keys match the SEEDED rows
  // (bffs/orgs; the page used to carry projects/stewards, which no row and
  // no engine ever read)
  "harvest.split.contributors": 30,
  "harvest.split.bffs": 20,
  "harvest.split.orgs": 20,
  "harvest.split.treasury": 30,
  // Bounty valuation engine — the ENGINE tier vocabulary is
  // trivial/small/medium/large (the old snapshot's small/medium/large/epic
  // mislabeled every tier one notch and epic existed nowhere)
  "bounty.tier.trivial.base": 25,
  "bounty.tier.small.base": 75,
  "bounty.tier.medium.base": 250,
  "bounty.tier.large.base": 750,
  "bounty.impact.low": 0.75,
  "bounty.impact.normal": 1.0,
  "bounty.impact.high": 1.5,
  "bounty.priority.boost": 1.25,
  "bounty.anchor.weight": 0.25,
  "bounty.max": 2000,
  "bounty.round_to": 25,
  "bounty.proposal_fraction": 0.15,
  "bounty.settlement_hold_hours": 708,
  // Bounty demand learning (the self-adjusting price mechanism for labor)
  "bounty.learning.window_days": 45,
  "bounty.learning.unclaimed_days": 14,
  "bounty.learning.raise_sensitivity": 0.15,
  "bounty.learning.lower_sensitivity": 0.05,
  "bounty.learning.factor_min": 0.9,
  "bounty.learning.factor_max": 1.4,
  "bounty.learning.fast_claim_days": 2,
  "bounty.learning.min_sample": 3,
  // Coordination flywheel (claimed-role hygiene)
  "coordination.stale_claim_nudge_days": 7,
  "coordination.stale_claim_expire_days": 14,
  // Crowdpooling claim windows
  "crowdpool.claim_expiry_days_shift": 7,
  "crowdpool.claim_expiry_days_loan": 14,
  "crowdpool.claim_expiry_days_item": 14,
  "crowdpool.reminder_days_before_expiry": 3,
  // Land project progression thresholds
  "project.accepted_endorsements": 1,
  "project.active_endorsements": 3,
  "project.active_contributions": 5,
  "project.established_funded_campaigns": 1,
  "project.established_seasons": 3,
  "project.anchor_seasons": 8,
  "project.anchor_endorsements": 20,
  // Community proposal + assembly process dials
  "proposals.signal_threshold": 25,
  "org_rating.min_raters": 5,
  "governance.signal_advance_points": 12,
  "governance.signal_advance_avg": 1.0,
  "governance.signal_min_tier": 0,
  "governance.synthesis_refresh_cooldown_min": 30,
  "governance.minor_lane_quiet_days": 7,
  "governance.last_call_hours": 48,
  "governance.resting_after_days": 30,
  "governance.promotion.min_thread_age_hours": 48,
  "governance.promotion.min_unique_voices": 3,
  "governance.promotion.cosigner_window_hours": 24,
  "governance.launch_carryover_idle_days": 7,
  "governance.straw_poll.consensus_pct": 0.66,
  "governance.straw_poll.min_votes": 5,
  "governance.closing_soon_window_hours": 48,
  "governance.sunset_renewal_warning_days": 7,
  "governance.storyteller_narrative_min_words": 300,
  "governance.storyteller_narrative_max_words": 600,
  "governance.storyteller_threshold_tokens": 100000,
  "governance.delegation_is_active": 0,
  "governance.delegation_max_hops": 2,
  "governance.load.warning_threshold": 15,
  "governance.load.critical_threshold": 30,
  "governance.guide.proactive_posts_per_week": 5,
  "governance.guide.devil_advocate_unanimity_pct": 95,
  "governance.guide.is_active": 1,
  "governance.sensing_min_citizen_tier": 0,
  // Evolution Engine leash
  "evolution.max_autonomy_tier": 1,
  "evolution.launch_window_hours": 24,
  "evolution.launch_require_approval": 1,
  "evolution.circuit_breaker_failures": 2,
  // Promoted hardcodes (0221)
  "events.attendance_reward_regen": 33,
  "quests.attested_bonus_fraction": 0.25,
  "ship.regen_per_quest_point": 1,
  // Path-tier ladder (questPools constants are the fallbacks; live values
  // are registry rows read by the tier detector)
  "paths.player.steward.quest_count": PLAYER_STEWARD_QUEST_COUNT,
  "paths.player.steward.vote_count": PLAYER_STEWARD_VOTE_COUNT,
  "paths.tier_bonus.co_creator": TIER_BONUS.co_creator,
  "paths.tier_bonus.steward": TIER_BONUS.steward,
  "paths.tier_bonus.sage": TIER_BONUS.sage,
  "paths.ally.co_creator.min_distinct_tool_users": 11,
  "paths.land_project.steward.min_seasons": 1,
  "paths.sage.percentile_threshold": 80,
  "paths.sage.days_pct_required": 80,
  // Public tier-label percentile bands
  "tiers.percentile.guardian": 95,
  "tiers.percentile.elder": 85,
  "tiers.percentile.cultivator": 70,
  "tiers.percentile.grower": 50,
  "tiers.percentile.sapling": 30,
  "tiers.percentile.sprout": 15,
  // Standalone rewards
  "plays.adoption_reward": 500,
  "hymnSubmissionWinnerReward": 3333,
  // SEEDS -> $ReGen claim rate ($ReGen per $1 USD)
  "seeds.regen_per_usd": SEEDS_REGEN_PER_USD,
  // The $ReGen builders' pool (ADR-50): what ReGen Civics distributes each
  // lunar cycle across the free third-party modules villages are running.
  //
  // Defaults to 0, which pays nobody. That is deliberate and is not a
  // placeholder: the amount is a money decision and it is Rye's, so the
  // machinery ships inert and starts paying the cycle after somebody sets this
  // in the admin UI. A default that guessed at the number would start moving
  // real value on a shipped-by-accident deploy. The design doc proposes 5,000
  // (docs/MODULE_POOL_DESIGN.md, decision D1), which is half of
  // gratitude.pool_per_cycle.
  "pool.regen_per_cycle": 0,
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
  /** The live lunar-cycle gratitude economy (ADR-30). */
  gratitudeEconomy: {
    baseBudget: number;
    fullPowerThreshold: number;
    streakBonusPerCycle: number;
    streakBonusMax: number;
    poolPerCycle: number;
    maxPayoutPerPerson: number;
    budgetMultiplier: { explorer: number; coCreator: number; steward: number; sage: number };
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
      bffs: number;
      orgs: number;
      treasury: number;
    };
  };
  bounties: {
    tierBase: { trivial: number; small: number; medium: number; large: number };
    roundTo: number;
    max: number;
    proposalFraction: number;
    settlementHoldHours: number;
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
  /**
   * Every registered key with its live-over-fallback value — the flat,
   * exhaustive registry surface. Anything not lifted into a typed section
   * above is still renderable from here without a second untyped fetch.
   */
  variables: Record<string, number>;
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
  const variables: Record<string, number> = {};
  for (const key of MECHANICS_VARIABLE_KEYS) variables[key] = get(key);
  return {
    scoring: {
      questPoints: get("scoring.weights.quest_routine"),
      forumPostPoints: get("scoring.weights.forum_post"),
    },
    citizenship: {
      gracePeriodDays: get("citizenship.grace_period_days"),
      tiers: {
        // gratitudeMultiplier sources gratitude.budget_multiplier.* — the
        // keys the cycle engine actually reads. (The page used to render the
        // legacy gratitude.multiplier.* trust-graph values no engine reads.)
        coCreator: {
          minPercentile: get("citizenship.co_creator.min_percentile"),
          minSeasons: get("citizenship.co_creator.min_seasons"),
          harvestMultiplier: get("citizenship.co_creator.harvest_multiplier"),
          gratitudeMultiplier: get("gratitude.budget_multiplier.co_creator"),
        },
        steward: {
          minPercentile: get("citizenship.steward.min_percentile"),
          minSeasons: get("citizenship.steward.min_seasons"),
          harvestMultiplier: get("citizenship.steward.harvest_multiplier"),
          gratitudeMultiplier: get("gratitude.budget_multiplier.steward"),
        },
        sage: {
          minPercentile: get("citizenship.sage.min_percentile"),
          minSeasons: get("citizenship.sage.min_seasons"),
          harvestMultiplier: get("citizenship.sage.harvest_multiplier"),
          gratitudeMultiplier: get("gratitude.budget_multiplier.sage"),
        },
      },
    },
    gratitude: {
      trustGraphReceivedWeight: get("gratitude.trust_graph.received_weight"),
      trustGraphMaxBonus: get("gratitude.trust_graph.max_bonus"),
      compostingRatePct: get("trust.composting_rate"),
    },
    gratitudeEconomy: {
      baseBudget: get("gratitude.base_budget"),
      fullPowerThreshold: get("gratitude.full_power_threshold"),
      streakBonusPerCycle: get("gratitude.streak_bonus_per_cycle"),
      streakBonusMax: get("gratitude.streak_bonus_max"),
      poolPerCycle: get("gratitude.pool_per_cycle"),
      maxPayoutPerPerson: get("gratitude.max_payout_per_person"),
      budgetMultiplier: {
        explorer: get("gratitude.budget_multiplier.explorer"),
        coCreator: get("gratitude.budget_multiplier.co_creator"),
        steward: get("gratitude.budget_multiplier.steward"),
        sage: get("gratitude.budget_multiplier.sage"),
      },
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
        bffs: get("harvest.split.bffs"),
        orgs: get("harvest.split.orgs"),
        treasury: get("harvest.split.treasury"),
      },
    },
    bounties: {
      tierBase: {
        trivial: get("bounty.tier.trivial.base"),
        small: get("bounty.tier.small.base"),
        medium: get("bounty.tier.medium.base"),
        large: get("bounty.tier.large.base"),
      },
      roundTo: get("bounty.round_to"),
      max: get("bounty.max"),
      proposalFraction: get("bounty.proposal_fraction"),
      settlementHoldHours: get("bounty.settlement_hold_hours"),
    },
    quests: {
      ritesOfPassageCount: RITES_OF_PASSAGE_COUNT,
      stewardQuestCount: get("paths.player.steward.quest_count"),
      stewardVoteCount: get("paths.player.steward.vote_count"),
      tierBonus: {
        coCreator: get("paths.tier_bonus.co_creator"),
        steward: get("paths.tier_bonus.steward"),
        sage: get("paths.tier_bonus.sage"),
      },
    },
    rewards: {
      playAdoption: get("plays.adoption_reward"),
      hymnWinner: get("hymnSubmissionWinnerReward"),
      seedsRegenPerUsd: get("seeds.regen_per_usd"),
    },
    variables,
    meta: {
      lunarCycleDays: LUNAR_CYCLE_DAYS,
      generatedAt,
    },
  };
}
