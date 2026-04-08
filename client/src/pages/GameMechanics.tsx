/**
 * Game Mechanics Page - ReGen Civics
 * Route: /game-mechanics
 *
 * Section A: Live Variables Dashboard (admin-only, read-only view)
 * Section B: Client-side Game Simulator with sliders and projected outcomes
 */

import { useState, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import { PageTransition } from "@/components/PageTransition";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  SlidersHorizontal,
  Calculator,
  ArrowRight,
  BarChart3,
  Sparkles,
  Leaf,
  Heart,
  Shield,
  Moon,
  HelpCircle,
  Network,
} from "lucide-react";

/* ─── HelpTip: small info icon that reveals a plain-language explanation ─ */

function HelpTip({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Explain this variable"
          className="inline-flex items-center justify-center text-white/40 hover:text-white/90 focus:text-white/90 focus:outline-none transition-colors shrink-0"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[260px] whitespace-normal bg-[#1a472a] text-white border border-[#7dd87d]/30 text-xs leading-relaxed px-3 py-2 shadow-xl"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

/* ─── Plain-language explanations for specific variable keys ─────────────
 * Keyed by the game_variables.key column. When a live variable has an
 * entry here, this copy is used in its HelpTip instead of the terse DB
 * description. Covers the keys most visible in the simulator + gratitude
 * section. Anything not listed falls back to the DB description.
 */
const VARIABLE_HELP: Record<string, string> = {
  "scoring.weights.quest_routine": "Points you earn for completing a routine quest. Routine quests are the small, repeatable actions that build a habit of showing up.",
  "scoring.weights.quest_seasonal": "Points for completing a seasonal rite. These are bigger, once-a-season quests tied to the wheel of the year.",
  "scoring.weights.quest_epic": "Points for completing an epic quest. These are multi-week, high-effort quests reserved for deep contributors.",
  "scoring.weights.quest_welcome": "Points for completing a welcome aboard quest. Lower value because they're designed to be easy first wins.",
  "scoring.weights.forum_post": "Points for writing a forum post. Small per-post value encourages quality over spam.",
  "scoring.weights.forum_quality_reply": "Bonus points when one of your forum replies gets enough reactions to count as quality.",
  "scoring.weights.event_attended": "Points for showing up to an event in person or on a call.",
  "scoring.weights.contribution_base": "The floor value for any logged contribution before quality weighting kicks in.",
  "scoring.weights.contribution_max": "The ceiling for a single highly-valued contribution.",
  "scoring.weights.contribution_verified_bonus": "Extra points added on top when an admin verifies that a contribution actually happened.",
  "scoring.weights.crowdpool_contribution": "Points you earn when you pledge to a crowd-pooling campaign for a land project.",
  "scoring.weights.referral_signup": "Points you get when someone you invited creates an account.",
  "scoring.weights.referral_first_quest": "Bonus points when your referral completes their first quest. Rewards actually onboarding people, not just signups.",
  "scoring.weights.endorsement_from_project": "Points you receive when a land project endorses you. Worth more than a player endorsement because projects are rarer.",
  "scoring.weights.endorsement_from_player": "Points you receive when another player endorses you.",
  "scoring.weights.endorsement_given": "Small points for giving an endorsement. Kept low so endorsements stay meaningful.",
  "scoring.weights.lunar_streak": "Points added per week when you keep engaging consistently. Compounds over the season.",
  "scoring.weights.gratitude_received": "Points you earn for every gratitude token sent to you.",
  "scoring.weights.gratitude_sent": "Small points for sending gratitude. Kept low so you can't farm score by spamming gratitude.",
  "scoring.weights.flag_validated_penalty": "Points deducted if you're flagged and the flag is confirmed. Negative to discourage bad behavior.",
  "scoring.weights.cascading_endorsement_penalty": "Small penalty if you endorsed someone who later gets flagged. Makes endorsements feel weighty.",

  "trust.multiplier.min": "The lowest trust multiplier possible. A new player with zero endorsements sits near here.",
  "trust.multiplier.max": "The highest trust multiplier possible. Long-time Stewards and Sages with lots of endorsements sit near here.",
  "trust.multiplier.default": "The trust multiplier new players start with before any endorsements.",
  "trust.endorsement_project_weight": "How much each project endorsement moves your trust score. Projects matter more than individual players.",
  "trust.endorsement_player_weight": "How much each player endorsement moves your trust score.",
  "trust.account_age_weight": "Trust bonus per completed season. Rewards people who stick around.",
  "trust.flag_penalty_weight": "Trust loss per confirmed flag against you.",
  "trust.endorsements_for_max": "How many weighted endorsements you need to reach the maximum trust multiplier.",
  "trust.composting_rate": "Percentage of your trust score that composts away each season if you're inactive. Keeps trust current, not historical.",

  "composting.decay_rate": "The percentage of your raw score that composts back to the pool each season. Keeps the game fresh by rewarding current effort over past glory.",
  "composting.minimum_floor": "Your score never composts below this floor. Protects long-time players from losing everything during a quiet season.",
  "composting.is_active": "Whether seasonal composting is turned on right now. Off in early seasons while the game is still calibrating.",

  "harvest.pool_size": "The total $ReGen distributed as Harvest at the end of each season. Players get a share based on their contribution percentile.",
  "harvest.is_active": "Whether seasonal Harvest distribution is turned on. Off until the game has enough players, orgs, and land projects.",
  "harvest.min_score_percentile": "Players below this percentile get zero Harvest. Prevents dust-level payouts and rewards meaningful contribution.",
  "harvest.distribution_curve": "Higher values concentrate Harvest at the top. Lower values flatten the curve.",
  "harvest.split.contributors": "Share of the Harvest pool that goes to individual player contributors.",
  "harvest.split.bffs": "Share of the Harvest pool that goes to Bioregional Financing Facilities.",
  "harvest.split.orgs": "Share of the Harvest pool that goes to alliance organisations.",
  "harvest.split.treasury": "Share of the Harvest pool retained in the treasury for ongoing work.",

  "gratitude.budget_base": "Your starting gratitude budget per cycle. Multiplied by your citizenship tier, then boosted by streaks.",
  "gratitude.budget_per_percentile": "Extra gratitude you get per percentile point of contribution. Rewards top contributors with more voice.",
  "gratitude.max_budget": "The absolute ceiling on gratitude you can have in a single cycle.",
  "gratitude.message_max_chars": "Character limit on the message you attach to a gratitude send. Short because gratitude is supposed to feel quick.",
  "gratitude.multiplier.explorer": "How much weight an Explorer's gratitude carries when distributing the $ReGen pool.",
  "gratitude.multiplier.co_creator": "How much weight a Co-Creator's gratitude carries.",
  "gratitude.multiplier.steward": "How much weight a Steward's gratitude carries.",
  "gratitude.multiplier.sage": "How much weight a Sage's gratitude carries. Sages have the most influence on where $ReGen flows.",
  "gratitude.trust_graph.received_weight": "How much each gratitude you've received adds to your trust multiplier in the gratitude graph.",
  "gratitude.trust_graph.max_bonus": "The maximum bonus you can earn from the gratitude trust graph. Caps the snowball effect.",

  "citizenship.co_creator.min_percentile": "Contribution percentile you need to reach Co-Creator.",
  "citizenship.co_creator.min_fire_quest": "Whether you must complete the Fire quest to reach Co-Creator.",
  "citizenship.co_creator.min_rites": "Seasonal rites you need to complete to reach Co-Creator.",
  "citizenship.co_creator.min_gratitude_sent": "Gratitude tokens you need to have sent to reach Co-Creator.",
  "citizenship.co_creator.min_seasons": "Seasons of activity needed to reach Co-Creator.",
  "citizenship.steward.min_percentile": "Contribution percentile needed to reach Steward.",
  "citizenship.steward.min_epic_quests": "Epic quests you need to complete to reach Steward.",
  "citizenship.steward.min_endorsements_project": "Project endorsements needed to reach Steward.",
  "citizenship.steward.min_gratitude_received": "Gratitude you need to have received from others to reach Steward.",
  "citizenship.steward.min_seasons": "Seasons of activity needed to reach Steward.",
  "citizenship.sage.min_percentile": "Contribution percentile needed to reach Sage.",
  "citizenship.sage.min_seasons": "Seasons of activity needed to reach Sage. Sage is a long-game tier.",
  "citizenship.sage.min_contributions": "Total verified contributions needed to reach Sage.",
  "citizenship.sage.min_endorsements_total": "Total endorsements received needed to reach Sage.",
  "citizenship.grace_period_days": "Days you have to re-qualify before you're demoted. Protects you from losing a tier on a quiet week.",
  "citizenship.gratitude_budget.explorer": "Gratitude tokens an Explorer gets per season.",
  "citizenship.gratitude_budget.co_creator": "Gratitude tokens a Co-Creator gets per season.",
  "citizenship.gratitude_budget.steward": "Gratitude tokens a Steward gets per season.",
  "citizenship.gratitude_budget.sage": "Gratitude tokens a Sage gets per season.",

  "projects.status.active_endorsements": "Player endorsements a land project needs to move into Active status.",
  "projects.status.active_contributions": "Logged contributions a land project needs to move into Active status.",
  "projects.status.established_endorsements": "Endorsements needed for Established status.",
  "projects.status.established_campaigns": "Funded crowd-pooling campaigns needed for Established status.",
  "projects.status.anchor_endorsements": "Endorsements needed for Anchor status. Anchors are the cornerstone land projects of the network.",
  "projects.status.anchor_seasons": "Seasons of continuous activity needed for Anchor status.",

  "forum.vote_weight_min": "Lowest forum vote weight. A brand new player's vote carries this much.",
  "forum.vote_weight_max": "Highest forum vote weight. A Guardian's vote carries this much.",
  "forum.quality_reply_min_reactions": "Reactions a forum reply needs to count as quality and earn bonus points.",

  "quests.tier_steward_min": "Contribution percentile needed to unlock Steward-tier quests.",
  "quests.tier_elder_min": "Contribution percentile needed to unlock Elder-tier quests.",
  "quests.tier_guardian_min": "Contribution percentile needed to unlock Guardian-tier quests.",
  "quests.require_rites_complete": "Whether all 13 Rites of Passage must be complete before tier quests unlock.",

  "governance.council_seats": "Seats on the seasonal council each season.",
  "governance.council_min_score": "Minimum contribution percentile needed to qualify for the council.",
  "governance.council_require_rites": "Whether council members must have completed the Rites.",
  "governance.cocreator_threshold_percentile": "Top contribution percentile eligible for a Co-Creator invite.",

  "referral.reward.signup": "$ReGen you earn when someone you invited creates an account.",
  "referral.reward.first_quest": "$ReGen you earn when your referral completes their first quest.",
  "referral.reward.seasonal_rite": "$ReGen you earn when your referral completes a seasonal rite.",
  "referral.reward.crowdpooling": "$ReGen you earn when your referral contributes to a crowd-pooling campaign.",
  "referral.reward.second_degree": "$ReGen you earn from the activity of people your referrals invited.",
  "referral.max_rewards_per_month": "Cap on total referral rewards per user per month. Prevents referral farming.",
  "referral.max_second_degree_per_month": "Cap on second-degree referral rewards per month.",

  "proposals.signal_threshold": "Upvotes a proposal needs before it graduates from the community forum to Hypha governance.",
};

/* ─── Types ──────────────────────────────────────────────────────────── */

interface GameVariable {
  id: number;
  category: string;
  subcategory?: string;
  key: string;
  displayName: string;
  description?: string;
  value: number;
  valueType: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatValue(value: number, valueType: string): string {
  switch (valueType) {
    case "percentage":
      return `${(value * 100).toFixed(1)}%`;
    case "currency":
      return `$${value.toLocaleString()}`;
    case "multiplier":
      return `${value}x`;
    case "integer":
      return Math.round(value).toLocaleString();
    default:
      return String(value);
  }
}

function valueTypeBadgeColor(vt: string): string {
  switch (vt) {
    case "percentage":
      return "bg-blue-500/20 text-blue-300 border-blue-400/30";
    case "currency":
      return "bg-[#d4a574]/20 text-[#d4a574] border-[#d4a574]/30";
    case "multiplier":
      return "bg-purple-500/20 text-purple-300 border-purple-400/30";
    case "integer":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-400/30";
    default:
      return "bg-white/10 text-white/60 border-white/20";
  }
}

function categoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case "scoring":
      return <BarChart3 className="w-4 h-4" />;
    case "trust":
      return <Shield className="w-4 h-4" />;
    case "seasonal":
      return <Leaf className="w-4 h-4" />;
    case "gratitude":
      return <Heart className="w-4 h-4" />;
    default:
      return <Sparkles className="w-4 h-4" />;
  }
}

/* ─── Simulator Defaults ─────────────────────────────────────────────── */

interface SimState {
  questWeight: number;
  forumWeight: number;
  trustMultiplierMin: number;
  trustMultiplierMax: number;
  compostingDecay: number;
  harvestPoolSize: number;
  gratitudeBudget: number;
  gratitudeRecipients: number;
  streakCycles: number;
  regenDistributionPool: number;
  claimThreshold: number;
}

const SIM_DEFAULTS: SimState = {
  questWeight: 10,
  forumWeight: 5,
  trustMultiplierMin: 1.0,
  trustMultiplierMax: 3.0,
  compostingDecay: 0.15,
  harvestPoolSize: 50000,
  gratitudeBudget: 100,
  gratitudeRecipients: 10,
  streakCycles: 0,
  regenDistributionPool: 10000,
  claimThreshold: 333,
};

/* ─── Section A: Live Variables Dashboard ────────────────────────────── */

function LiveVariablesDashboard() {
  const [search, setSearch] = useState("");
  const { data: variables = [], isLoading, isError } = trpc.game.listVariables.useQuery(
    undefined,
    { retry: 1 }
  );

  const filtered = useMemo(() => {
    if (!search) return variables as GameVariable[];
    const q = search.toLowerCase();
    return (variables as GameVariable[]).filter(
      (v) =>
        v.key?.toLowerCase().includes(q) ||
        v.displayName?.toLowerCase().includes(q) ||
        v.category?.toLowerCase().includes(q)
    );
  }, [variables, search]);

  const grouped = useMemo(() => {
    const map: Record<string, GameVariable[]> = {};
    for (const v of filtered) {
      const cat = v.category || "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(v);
    }
    return map;
  }, [filtered]);

  if (isError) {
    return (
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          <p className="text-white/50 text-sm">
            Live variables are available to admins only. Use the simulator below to explore game
            mechanics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/60" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter variables..."
          className="pl-9 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-white/60 text-sm">Loading game variables...</p>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/60 text-sm">No variables match your search.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, vars]) => (
              <Card
                key={category}
                className="bg-white/5 border-white/10 backdrop-blur-sm hover:border-[#7dd87d]/20 transition-colors"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    {categoryIcon(category)}
                    {category}
                    <Badge
                      variant="outline"
                      className="ml-auto text-xs bg-white/5 text-white/50 border-white/10"
                    >
                      {vars.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {vars.map((v) => {
                    const helpText = VARIABLE_HELP[v.key] ?? v.description ?? "";
                    return (
                      <div
                        key={v.id}
                        className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm text-white/90 font-medium truncate">
                              {v.displayName}
                            </p>
                            <HelpTip text={helpText} />
                          </div>
                          <p className="text-[10px] text-white/40 font-mono truncate mt-0.5">
                            {v.key}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-mono text-[#7dd87d]">
                            {formatValue(v.value, v.valueType)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${valueTypeBadgeColor(v.valueType)}`}
                          >
                            {v.valueType}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}

/* ─── Section B: Game Simulator ──────────────────────────────────────── */

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  help?: string;
  onChange: (val: number) => void;
}

function SliderRow({ label, value, min, max, step, unit, help, onChange }: SliderRowProps) {
  const display = unit === "%"
    ? `${(value * 100).toFixed(0)}%`
    : unit === "x"
      ? `${value.toFixed(1)}x`
      : unit === "$"
        ? `$${value.toLocaleString()}`
        : String(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-white/80">{label}</label>
          <HelpTip text={help} />
        </div>
        <span className="text-sm font-mono text-[#7dd87d]">{display}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="[&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-range]]:bg-[#7dd87d] [&_[data-slot=slider-thumb]]:border-[#7dd87d]"
      />
    </div>
  );
}

function GameSimulator() {
  const [sim, setSim] = useState<SimState>(SIM_DEFAULTS);

  const update = useCallback(
    <K extends keyof SimState>(key: K) =>
      (val: SimState[K]) =>
        setSim((prev) => ({ ...prev, [key]: val })),
    []
  );

  // Projected calculations
  const questsCompleted = 10;
  const forumsPosted = 15;

  const rawScore = questsCompleted * sim.questWeight + forumsPosted * sim.forumWeight;
  const avgTrust = (sim.trustMultiplierMin + sim.trustMultiplierMax) / 2;
  const boostedScore = Math.round(rawScore * avgTrust);

  // Assume player is around 70th percentile with this score
  const estimatedPercentile = Math.min(95, Math.round(50 + boostedScore / 10));
  const harvestShare = Math.round(
    sim.harvestPoolSize * (estimatedPercentile / 100) * 0.02 * (1 - sim.compostingDecay)
  );

  // Gratitude budget scales with citizenship tier
  const tier =
    estimatedPercentile >= 90
      ? "Sage"
      : estimatedPercentile >= 50
        ? "Steward"
        : estimatedPercentile >= 15
          ? "Co-Creator"
          : "Explorer";

  const tierMultiplier =
    tier === "Sage" ? 5.0 : tier === "Steward" ? 3.0 : tier === "Co-Creator" ? 2.0 : 1.0;

  // Streak bonus: 3% per consecutive cycle, max 30%
  const streakBonus = Math.min(sim.streakCycles * 0.03, 0.30);
  const effectiveBudget = Math.round(sim.gratitudeBudget * tierMultiplier * (1 + streakBonus));

  // Per-person share based on recipients
  const perPerson = sim.gratitudeRecipients > 0
    ? Math.round(effectiveBudget / sim.gratitudeRecipients)
    : effectiveBudget;

  // Full power: first 10 recipients get max share (budget / 10)
  const fullPowerShare = Math.round(effectiveBudget / 10);
  const isFullPower = sim.gratitudeRecipients <= 10;

  const proposalParams = new URLSearchParams({
    category: "game_variable",
  });

  return (
    <div className="space-y-8">
      {/* Sliders */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#d4a574]" />
            Adjust Variables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <SliderRow
            label="Quest Points (per quest)"
            help="How many points you earn each time you complete a routine quest. Drag this up to see how a more generous scoring rule changes your end-of-season Harvest."
            value={sim.questWeight}
            min={1}
            max={50}
            step={1}
            onChange={update("questWeight")}
          />
          <SliderRow
            label="Forum Points (per post)"
            help="How many points you earn for each forum post. Kept lower than quests because posting is easier than completing a quest."
            value={sim.forumWeight}
            min={1}
            max={30}
            step={1}
            onChange={update("forumWeight")}
          />
          <SliderRow
            label="Trust Multiplier (min)"
            help="The lowest trust multiplier in the game. A brand-new Explorer with no endorsements sits near here. Your raw score gets multiplied by your trust multiplier to get your boosted score."
            value={sim.trustMultiplierMin}
            min={0.5}
            max={2.0}
            step={0.1}
            unit="x"
            onChange={update("trustMultiplierMin")}
          />
          <SliderRow
            label="Trust Multiplier (max)"
            help="The highest trust multiplier in the game. Long-time Stewards and Sages with lots of endorsements sit near here. A 3x multiplier triples your raw score."
            value={sim.trustMultiplierMax}
            min={1.0}
            max={5.0}
            step={0.1}
            unit="x"
            onChange={update("trustMultiplierMax")}
          />
          <SliderRow
            label="Composting Decay Rate"
            help="The percentage of last season's score that composts back to the pool each new season. Keeps the game fresh so current effort matters more than past glory. Zero = nothing decays."
            value={sim.compostingDecay}
            min={0}
            max={0.5}
            step={0.01}
            unit="%"
            onChange={update("compostingDecay")}
          />
          <SliderRow
            label="Harvest Pool Size"
            help="The total $ReGen distributed at the end of each season. Your share depends on your contribution percentile and the distribution curve."
            value={sim.harvestPoolSize}
            min={10000}
            max={200000}
            step={5000}
            unit="$"
            onChange={update("harvestPoolSize")}
          />
          <SliderRow
            label="Gratitude Base Budget (per cycle)"
            help="Your starting gratitude budget each lunar cycle, before any tier multiplier or streak bonus. This is what everyone begins with."
            value={sim.gratitudeBudget}
            min={50}
            max={200}
            step={10}
            onChange={update("gratitudeBudget")}
          />
          <SliderRow
            label="People Acknowledged (this cycle)"
            help="How many different people you send gratitude to this cycle. The first 10 get your full impact. After 10, your impact per person starts diluting."
            value={sim.gratitudeRecipients}
            min={1}
            max={30}
            step={1}
            onChange={update("gratitudeRecipients")}
          />
          <SliderRow
            label="Streak (consecutive 10+ cycles)"
            help="Number of cycles in a row where you acknowledged at least 10 people. Each streak cycle adds 3% to your effective budget, maxing at 30% after 10 cycles."
            value={sim.streakCycles}
            min={0}
            max={10}
            step={1}
            onChange={update("streakCycles")}
          />
          <SliderRow
            label="$ReGen Distribution Pool (per cycle)"
            help="The pool of $ReGen tokens distributed each gratitude cycle. Split proportionally among everyone who received gratitude, weighted by sender tier."
            value={sim.regenDistributionPool}
            min={1000}
            max={50000}
            step={1000}
            unit="$"
            onChange={update("regenDistributionPool")}
          />
          <SliderRow
            label="$ReGen Claim Threshold"
            help="How much $ReGen you need to accumulate before you can claim it on Hypha. Prevents tiny dust claims from clogging the system. Lower = easier to claim, higher = more meaningful claims."
            value={sim.claimThreshold}
            min={100}
            max={1000}
            step={50}
            onChange={update("claimThreshold")}
          />
        </CardContent>
      </Card>

      {/* Projected Outcomes */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#7dd87d]" />
            Projected Outcomes
          </CardTitle>
          <p className="text-xs text-white/60 mt-1">
            Based on completing {questsCompleted} quests and {forumsPosted} forum posts this season
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <OutcomeRow
            label={`Complete ${questsCompleted} quests this season`}
            value={`~${boostedScore.toLocaleString()} points`}
            detail={`${rawScore} raw * ${avgTrust.toFixed(1)}x avg trust`}
          />
          <OutcomeRow
            label={`Estimated harvest share at ~${estimatedPercentile}th percentile`}
            value={`~${harvestShare.toLocaleString()} $ReGen`}
            detail={`After ${(sim.compostingDecay * 100).toFixed(0)}% composting decay`}
          />
          <OutcomeRow
            label={`Gratitude budget at ${tier} tier`}
            value={`${effectiveBudget} effective budget`}
            detail={`${sim.gratitudeBudget} base * ${tierMultiplier}x tier${streakBonus > 0 ? ` + ${(streakBonus * 100).toFixed(0)}% streak bonus` : ""}`}
          />
          <OutcomeRow
            label={`Acknowledging ${sim.gratitudeRecipients} ${sim.gratitudeRecipients === 1 ? "person" : "people"}`}
            value={`${perPerson} per person`}
            detail={isFullPower ? `Full power: each of ${sim.gratitudeRecipients} gets ${perPerson}` : `Diluting: over 10 recipients (${fullPowerShare} at full power)`}
          />
          <OutcomeRow
            label="$ReGen from gratitude (if avg recipient)"
            value={`~${Math.round(sim.regenDistributionPool / 50)} per cycle`}
            detail={`Pool of ${sim.regenDistributionPool.toLocaleString()} split proportionally. Claim at ${sim.claimThreshold}+.`}
          />
        </CardContent>
      </Card>

      {/* Export as Proposal */}
      <div className="text-center">
        <Link href={`/proposals?${proposalParams.toString()}`}>
          <Button
            size="lg"
            className="bg-gradient-to-r from-[#d4a574] to-[#ffd700] text-[#1a472a] font-bold px-8 hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all"
          >
            Export as Proposal
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
        <p className="text-xs text-white/60 mt-2">
          Opens the proposal form pre-filled with the game_variable category
        </p>
      </div>
    </div>
  );
}

function OutcomeRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/5">
      <p className="text-sm text-white/70">{label}</p>
      <p className="text-xl font-bold text-[#7dd87d] mt-1">{value}</p>
      <p className="text-xs text-white/60 mt-1">{detail}</p>
    </div>
  );
}

function GratVarRow({
  label,
  value,
  detail,
  help,
}: {
  label: string;
  value: string;
  detail: string;
  help?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-white/90 font-medium">{label}</p>
          <HelpTip text={help} />
        </div>
        <p className="text-xs text-white/50 mt-0.5">{detail}</p>
      </div>
      <span className="text-sm font-mono text-[#7dd87d] shrink-0">{value}</span>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */

export default function GameMechanics() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-[#0d2818] via-[#1a472a] to-[#0d2818]">
        <SEO
          title="Game Mechanics - ReGen Civics"
          description="Explore live game variables and simulate how scoring, trust multipliers, and seasonal mechanics shape the ReGen Games."
        />

        <div className="container mx-auto px-4 pt-8 pb-4">
          <BackButton />
        </div>

        {/* Hero */}
        <section className="container mx-auto px-4 py-12 md:py-16 text-center">
          <AnimatedSection animation="fade-in">
            <Badge className="mb-6 bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/40 text-sm px-4 py-1">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 inline" />
              Game Mechanics
            </Badge>

            <h1
              className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How the Game Works
            </h1>

            <p className="text-base md:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
              Every variable in the ReGen Games is visible and tunable. Browse live values or use
              the simulator to see how changes would affect scoring, harvest shares, and gratitude
              budgets.
            </p>
          </AnimatedSection>
        </section>

        {/* Citizenship Tiers (top of page) */}
        <section className="container mx-auto px-4 pb-16">
          <AnimatedSection animation="slide-up">
            <h2
              className="text-2xl md:text-3xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Citizenship Tiers
            </h2>
            <p className="text-white/70 mb-8 max-w-2xl leading-relaxed">
              You grow into this society at your own pace. Everyone starts as an Explorer and earns deeper participation through real contribution. Each tier carries different powers, gratitude budgets, and governance weight.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Explorer",
                  emoji: "🧭",
                  description: "You just got here. Welcome. Free transactions, access to quests, and your first contributions start counting immediately.",
                  requirements: ["Create an account", "That's it"],
                  powers: [
                    "Free transactions",
                    "Access to quests",
                    "Forum participation",
                    "Gratitude sending (starter budget)",
                  ],
                  accent: "#7dd87d",
                },
                {
                  title: "Co-Creator",
                  emoji: "🌱",
                  description: "Earned through quests, invitations, and consistent participation. Your contributions start earning a share of the Harvest.",
                  requirements: [
                    "Complete onboarding quests",
                    "Invite at least 1 person",
                    "Active for 1+ season",
                  ],
                  powers: [
                    "Harvest share based on contribution score",
                    "Full gratitude budget (100/cycle, 2.0x multiplier)",
                    "Endorsement power for land projects",
                    "Marketplace access on LocalScale.org",
                  ],
                  accent: "#a8e6a8",
                },
                {
                  title: "Steward",
                  emoji: "🌳",
                  description: "Earned through deeper contribution and longer participation. Stewards carry governance weight. You can propose, vote, and shape the rules.",
                  requirements: [
                    "Sustained contribution across 3+ seasons",
                    "Reputation score above 50th percentile",
                    "Vouching from existing Stewards",
                  ],
                  powers: [
                    "Trust Tokens for governance voting",
                    "Proposal creation rights",
                    "Enhanced gratitude budget (3.0x multiplier)",
                    "Land project evaluation access",
                    "Governance on Hypha (app.hypha.earth)",
                  ],
                  accent: "#f0c040",
                },
                {
                  title: "Sage",
                  emoji: "🏔️",
                  description: "The long-game players. Sages have demonstrated deep, consistent contribution across many seasons. Their voice carries the most weight in governance.",
                  requirements: [
                    "Sustained contribution across 6+ seasons",
                    "Reputation score above 80th percentile",
                    "Track record of successful proposals",
                    "Community recognition through gratitude",
                  ],
                  powers: [
                    "Maximum governance weight",
                    "Seasonal council participation",
                    "Endorse or flag proposals",
                    "Mentor matching for newer players",
                    "Enhanced Harvest multiplier (5.0x gratitude)",
                  ],
                  accent: "#e0b0ff",
                },
              ].map((tier) => (
                <div
                  key={tier.title}
                  className="rounded-2xl border border-white/10 p-6 md:p-8 flex flex-col"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{tier.emoji}</span>
                    <h3
                      className="text-xl md:text-2xl font-bold text-white"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {tier.title}
                    </h3>
                  </div>
                  <p className="text-white/80 mb-5 leading-relaxed">{tier.description}</p>
                  <div className="mb-4">
                    <h4
                      className="text-sm uppercase tracking-wider mb-2"
                      style={{ color: tier.accent, fontFamily: "var(--font-display)" }}
                    >
                      Requirements
                    </h4>
                    <ul className="space-y-1">
                      {tier.requirements.map((req, i) => (
                        <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                          <span style={{ color: tier.accent }} className="mt-0.5">+</span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-auto">
                    <h4
                      className="text-sm uppercase tracking-wider mb-2"
                      style={{ color: tier.accent, fontFamily: "var(--font-display)" }}
                    >
                      Powers
                    </h4>
                    <ul className="space-y-1">
                      {tier.powers.map((power, i) => (
                        <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                          <span style={{ color: tier.accent }} className="mt-0.5">+</span>
                          {power}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-white/60 text-sm mt-6 max-w-2xl leading-relaxed">
              Tier promotion happens automatically through a nightly batch job that recalculates your reputation, contribution score, and seasonal activity. There's a grace period before demotion. You don't lose tiers from a quiet week.
            </p>
          </AnimatedSection>
        </section>

        {/* Section A: Live Variables */}
        <section className="container mx-auto px-4 pb-16">
          <AnimatedSection animation="slide-up">
            <h2
              className="text-2xl md:text-3xl font-bold text-white mb-8"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Live Variables
            </h2>
            <LiveVariablesDashboard />
          </AnimatedSection>
        </section>

        {/* Section B: Simulator */}
        <section className="container mx-auto px-4 pb-16">
          <AnimatedSection animation="slide-up">
            <h2
              className="text-2xl md:text-3xl font-bold text-white mb-8"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Game Simulator
            </h2>
            <div className="max-w-2xl mx-auto">
              <GameSimulator />
            </div>
          </AnimatedSection>
        </section>

        {/* Section C: Gratitude Variables Reference */}
        <section className="container mx-auto px-4 pb-24">
          <AnimatedSection animation="slide-up">
            <h2
              className="text-2xl md:text-3xl font-bold text-white mb-8 flex items-center gap-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <Heart className="w-6 h-6 text-[#d4a017]" />
              Gratitude System Variables
            </h2>
            <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
              {/* Cycle & Budget */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Moon className="w-4 h-4 text-purple-400" />
                    Cycle and Budget
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <GratVarRow
                    label="Cycle Duration"
                    value="~29.5 days"
                    detail="New moon to new moon"
                    help="A gratitude cycle runs one lunar month. Every cycle, your budget resets and the $ReGen pool is distributed to whoever received gratitude."
                  />
                  <GratVarRow
                    label="Base Budget"
                    value="100"
                    detail="Same for all tiers"
                    help="Everyone starts every cycle with 100 base budget, regardless of tier. Your tier multiplier is applied on top of this."
                  />
                  <GratVarRow
                    label="Full-Power Threshold"
                    value="10 people"
                    detail="Max impact per person"
                    help="The first 10 people you acknowledge each cycle receive your full per-person impact. After 10, your budget starts diluting so each additional person gets a smaller share."
                  />
                  <GratVarRow
                    label="Streak Bonus"
                    value="+3% / cycle"
                    detail="Max 30% (10 cycles)"
                    help="Each cycle in a row where you acknowledge at least 10 people adds 3% to your effective budget. Caps at 30% after 10 consecutive cycles. Rewards showing up consistently."
                  />
                </CardContent>
              </Card>

              {/* Tier Multipliers */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#d4a017]" />
                    Tier Multipliers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <GratVarRow
                    label="Explorer"
                    value="1.0x"
                    detail="100 effective budget"
                    help="Explorers get the base budget with no multiplier. You can still send gratitude, you just don't carry extra weight yet."
                  />
                  <GratVarRow
                    label="Co-Creator"
                    value="2.0x"
                    detail="200 effective budget"
                    help="Co-Creators double the base budget. Earned by completing onboarding quests, inviting at least one person, and staying active for a season."
                  />
                  <GratVarRow
                    label="Steward"
                    value="3.0x"
                    detail="300 effective budget"
                    help="Stewards triple the base budget. Earned by sustained contribution across 3+ seasons and reputation above the 50th percentile."
                  />
                  <GratVarRow
                    label="Sage"
                    value="5.0x"
                    detail="500 effective budget"
                    help="Sages get five times the base budget. The long-game tier, earned through 6+ seasons of deep contribution and community recognition."
                  />
                </CardContent>
              </Card>

              {/* $ReGen Distribution */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-[#7dd87d]" />
                    $ReGen Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <GratVarRow
                    label="Pool per Cycle"
                    value="10,000 $ReGen"
                    detail="Split by gratitude received"
                    help="Every cycle, 10,000 $ReGen is released and split among everyone who received gratitude. Your share depends on how much gratitude you got and who it came from."
                  />
                  <GratVarRow
                    label="Claim Threshold"
                    value="333 $ReGen"
                    detail="Accumulate before claiming on Hypha"
                    help="You need to have accumulated at least 333 $ReGen before you can claim it on Hypha. Prevents tiny dust claims and encourages meaningful withdrawals."
                  />
                  <GratVarRow
                    label="Distribution"
                    value="Proportional"
                    detail="Weighted by sender's effective budget"
                    help="Your share isn't just how many gratitudes you got. Each gratitude is weighted by the sender's effective budget, so a gratitude from a Sage counts more than one from an Explorer."
                  />
                </CardContent>
              </Card>

              {/* Trust Graph */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Network className="w-4 h-4 text-blue-400" />
                    Trust Graph
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <GratVarRow
                    label="Received Weight"
                    value="0.10 / gratitude"
                    detail="How much each gratitude nudges your multiplier"
                    help="Each gratitude you receive adds 0.10 to your gratitude trust multiplier. The more people who appreciate your work, the more your own gratitude carries weight."
                  />
                  <GratVarRow
                    label="Max Bonus"
                    value="+0.50"
                    detail="Ceiling on trust graph snowball"
                    help="The gratitude trust graph bonus is capped at +0.50 so it can't snowball forever. Keeps influence bounded no matter how much gratitude you've accumulated."
                  />
                  <GratVarRow
                    label="Composting Rate"
                    value="5% / season"
                    detail="Unused trust composts back"
                    help="If you go quiet, 5% of your trust score composts back to the pool each season. Keeps the graph current instead of frozen around early adopters."
                  />
                  <GratVarRow
                    label="Reciprocity"
                    value="Tracked"
                    detail="Two-way edges are stronger"
                    help="When two people both send gratitude to each other, the connection counts more than a one-way edge. Rewards mutual recognition."
                  />
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>
        </section>
      </div>
    </PageTransition>
  );
}