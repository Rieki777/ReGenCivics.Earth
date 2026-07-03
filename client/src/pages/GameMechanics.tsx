/**
 * Game Mechanics Page - ReGen Civics
 * Route: /game-mechanics
 *
 * Citizenship Tiers: reference panel for the 4 tiers (public).
 * Live Variables: read-only for everyone, inline edit for super admin.
 * Game Simulator: client-side sliders and projected outcomes.
 * Gratitude System Variables: reference panel (public).
 *
 * All four sections are wrapped in <CollapsibleSection>, which defaults
 * to collapsed on mobile and expanded on desktop (via useIsMobile).
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import { computeImpactSummaries } from "@/config/impactRules";
import { Sparkline } from "@/components/simulator/Sparkline";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGameMechanics } from "@/hooks/useGameMechanics";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/useMobile";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
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
  Undo2,
  Link2,
  Copy,
  RotateCcw,
  ChevronDown,
  Pencil,
  Save,
  X,
  TreePine,
} from "lucide-react";

/* ─── HelpTip: small info icon that reveals a plain-language explanation ─
 * Uses Popover (not Tooltip) because Radix Tooltip is hover-only and does
 * not reliably open on touch tap in iOS Safari. Popover opens on click
 * everywhere, so mobile works the same as desktop.
 */

function HelpTip({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Explain this variable"
          className="inline-flex items-center justify-center text-white/65 hover:text-white/90 focus:text-white/90 focus:outline-none transition-colors shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={6}
        className="w-[260px] max-w-[calc(100vw-2rem)] whitespace-normal bg-[#1a472a] text-white border border-[#7dd87d]/30 text-xs leading-relaxed px-3 py-2 shadow-xl"
      >
        {text}
      </PopoverContent>
    </Popover>
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

  "quests.tier_steward_min": "Contribution percentile required to access Steward-tier quests.",
  "quests.tier_elder_min": "Contribution percentile required to access Elder-tier quests.",
  "quests.tier_guardian_min": "Contribution percentile required to access Guardian-tier quests.",
  "quests.require_rites_complete": "Whether all Rites of Passage must be complete before tier quests become available.",

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

  // Governance Mechanics (added 2026-04-09)
  "governance.vote_weight.visitor": "How much a Visitor's stance counts in a governance decision. Visitors are still finding their footing, so their vote carries the base weight.",
  "governance.vote_weight.citizen": "How much a Citizen's stance counts. Citizens have rooted in and carry a slightly stronger voice.",
  "governance.vote_weight.contributor": "How much a Contributor's stance counts. Contributors are actively running quests and holding work.",
  "governance.vote_weight.steward": "How much a Steward's stance counts. Stewards are the elders of the community and hold the most governance weight.",
  "governance.promotion.min_thread_age_hours": "Hours a forum thread must exist before anyone can promote it to a formal decision. Gives ideas time to breathe.",
  "governance.promotion.min_unique_voices": "Distinct citizens who must have replied in a thread before it can be promoted. Prevents one person railroading a decision.",
  "governance.promotion.cosigner_window_hours": "Hours for a second citizen to co-sign a promotion. Dual-key promotion so decisions do not start alone.",
  "governance.promotion.heat_score_threshold": "Composite heat score at which the green Ready-to-promote button lights up on a forum thread.",
  "governance.default_decision_window_days": "Default days a new decision stays open for voting before it auto-closes.",
  "governance.reflection_window_hours": "Hours after a decision opens during which people can read and discuss but not yet vote. A pause so the loudest voice does not set the tone.",
  "governance.closing_soon_window_hours": "How many hours before close a decision gets marked closing soon so people can catch up before the window shuts.",
  "governance.snapshot_window_hours": "Hours for a snapshot-mode urgent decision. Requires a Steward sign-off and is reserved for true emergencies.",
  "governance.default_sunset_days": "Default days before a decision sunsets if nobody renews it. Keeps the rulebook fresh and reversible.",
  "governance.sunset_renewal_warning_days": "Days before a sunset date that a renewal thread auto-creates in the forum so the decision can be re-examined.",
  "governance.one_way_door_min_window_hours": "Minimum voting window in hours for one-way-door decisions. Hard to reverse moves get extra time.",
  "governance.storyteller_threshold_tokens": "Internal token value above which a decision auto-assigns a storyteller to write its narrative for the weekly roundup.",
  "governance.storyteller_narrative_min_words": "Minimum word count for a storyteller narrative to publish.",
  "governance.storyteller_narrative_max_words": "Maximum word count for a storyteller narrative. Keeps stories tight.",
  "governance.premortem.auto_create_delay_hours": "Hours after a main decision opens before the pre-mortem sub-poll auto-creates. Pre-mortems ask: if this fails, why?",
  "governance.premortem.top_concerns_to_address": "Number of top-agreed concerns the proposer must respond to before a decision closes.",
  "governance.claim_threshold_tokens": "Internal token balance a player must reach before they can claim to Hypha on Base. Batches small wins into meaningful on-chain moves.",
  "governance.claim_bundle_max_items": "Maximum internal ledger entries bundled into a single Hypha claim proposal. Keeps proposals readable.",
  "governance.claim_cooldown_days": "Days a player must wait between successful Hypha claims. Smooths on-chain traffic.",
  "governance.delegation_max_hops": "Maximum transitive hops for proxy delegation. If A delegates to B and B to C, the vote stops flowing after this many hops.",
  "governance.delegation_is_active": "Whether proxy delegation is turned on right now. Starts off so the community gets used to direct voting first.",
  "governance.guide.proactive_posts_per_week": "Maximum proactive ReGen Guide posts per tenant per week. Rate limit so the Guide stays in service of the community.",
  "governance.guide.devil_advocate_unanimity_pct": "Percentage of unanimous agreement at which the ReGen Guide chimes in with a devil-advocate perspective so group-think does not close a decision.",
  "governance.guide.is_active": "Whether the ReGen Guide can post and comment in governance contexts at all.",
  "governance.load.warning_threshold": "Rolling 30-day decision count above which the community load bar turns yellow. Signals the community is getting busy.",
  "governance.load.critical_threshold": "Rolling 30-day decision count above which the load bar turns red and suggests a pause. Prevents governance burnout.",
  "governance.backfield.review_cadence_days": "Days between Steward reviews of the Back Field backlog. The Back Field is an agricultural metaphor for fallow ideas resting until they are ready.",

  // Bounty valuation (added 2026-07-01)
  "bounty.tier.trivial.base": "Base $ReGen for a trivial bounty, a quick favor. The valuation starts here and is raised or lowered by impact and demand.",
  "bounty.tier.small.base": "Base $ReGen for a small bounty, one clear deliverable.",
  "bounty.tier.medium.base": "Base $ReGen for a medium bounty, a real piece of work.",
  "bounty.tier.large.base": "Base $ReGen for a large bounty, a substantial build.",
  "bounty.impact.low": "Multiplier for internal polish or nice-to-have work. Below 1, so it lowers the reward.",
  "bounty.impact.normal": "Multiplier for work that moves the movement forward. Most work lands here.",
  "bounty.impact.high": "Multiplier when work directly serves a land project, unblocks a season, or heals a real relationship or system.",
  "bounty.priority.boost": "The nudge a specific hard-to-fill bounty gets to attract someone. Applies only when the bounty is flagged hard to fill.",
  "bounty.anchor.weight": "How strongly a reward is pulled toward what similar work has actually paid. Zero ignores precedent, one matches it.",
  "bounty.learning.window_days": "How far back the engine looks when it learns precedent and demand.",
  "bounty.learning.unclaimed_days": "How long a bounty sits open before it counts as an unclaimed signal that the reward may be too low.",
  "bounty.learning.raise_sensitivity": "How boldly the reward rises when a kind of bounty keeps going unclaimed. This is the bolder nudge, because work going undone is the worst outcome.",
  "bounty.learning.lower_sensitivity": "How gently the reward falls when bounties are claimed instantly. Kept small, because a fast claim often just means good work.",
  "bounty.learning.factor_min": "The lowest the learned demand factor can go.",
  "bounty.learning.factor_max": "The highest the learned demand factor can go.",
  "bounty.max": "A safety ceiling in $ReGen on any single bounty, whatever the factors work out to.",
  "bounty.round_to": "Rewards round to clean multiples of this many $ReGen.",
  "bounty.proposal_fraction": "Fraction of the delivery amount paid to the proposer when the work is delivered.",
  "bounty.season_budget": "An optional cap on total $ReGen issued through bounties per season. Zero means no cap.",
  "bounty.settlement_hold_hours": "Hours before bounty tokens become claimable to Base, one moon cycle by default.",
  "bounty.large_tier_min": "Minimum citizenship tier to take on large bounties.",
  "bounty.tier.trivial.delivery": "Legacy flat delivery amount for a trivial bounty. Superseded by the valuation engine, kept for older code paths.",
  "bounty.tier.small.delivery": "Legacy flat delivery amount for a small bounty. Superseded by the valuation engine.",
  "bounty.tier.medium.delivery": "Legacy flat delivery amount for a medium bounty. Superseded by the valuation engine.",
  "bounty.tier.large.delivery": "Legacy flat delivery amount for a large bounty. Superseded by the valuation engine.",
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
    case "governance":
      return <Network className="w-4 h-4" />;
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
  // Matches the live governance.claim_threshold_regen game variable. The
  // simulator sliders let visitors model other values from here.
  claimThreshold: 1000,
};

/* ─── Section A: Live Variables Dashboard ──────────────────────────────
 * Read-only view for all visitors. Super admins (rieki.cordon@gmail.com)
 * see an inline edit button on each row that opens a mini form to update
 * the value. Updates go through trpc.game.updateVariable (admin-gated on
 * the server). Regular users see the same table without the edit button.
 */

const SUPER_ADMIN_EMAIL = "rieki.cordon@gmail.com";

function LiveVariablesDashboard() {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editReason, setEditReason] = useState("");

  const { user } = useAuth();
  const canEdit = user?.email === SUPER_ADMIN_EMAIL;

  const { data: variables = [], isLoading, isError, refetch } = trpc.game.listVariables.useQuery(
    undefined,
    { retry: 1 }
  );

  const updateMutation = trpc.game.updateVariable.useMutation({
    onSuccess: () => {
      toast.success("Variable updated");
      setEditingId(null);
      setEditReason("");
      refetch();
    },
    onError: (err) => toast.error("Update failed", { description: err.message }),
  });

  const startEdit = useCallback((v: GameVariable) => {
    setEditingId(v.id);
    setEditValue(String(v.value));
    setEditReason("");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditReason("");
  }, []);

  const saveEdit = useCallback((id: number) => {
    const numeric = parseFloat(editValue);
    if (Number.isNaN(numeric)) {
      toast.error("Value must be a number");
      return;
    }
    if (!editReason.trim()) {
      toast.error("Please enter a reason for this change");
      return;
    }
    updateMutation.mutate({ id, value: numeric, reason: editReason.trim() });
  }, [editValue, editReason, updateMutation]);

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
          <p className="text-white/70 text-sm">
            Couldn't load the live variables right now. Try refreshing the page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search bar + admin indicator */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter variables..."
            className="pl-9 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/70"
          />
        </div>
        {canEdit && (
          <Badge className="bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/30 text-[11px]">
            <Pencil className="w-3 h-3 mr-1" />
            Super admin edit mode
          </Badge>
        )}
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
                      className="ml-auto text-xs bg-white/5 text-white/70 border-white/10"
                    >
                      {vars.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {vars.map((v) => {
                    const helpText = VARIABLE_HELP[v.key] ?? v.description ?? "";
                    const isEditing = editingId === v.id;
                    return (
                      <div
                        key={v.id}
                        className="py-2 border-b border-white/5 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm text-white/90 font-medium truncate">
                                {v.displayName}
                              </p>
                              <HelpTip text={helpText} />
                            </div>
                            <p className="text-[10px] text-white/65 font-mono truncate mt-0.5">
                              {v.key}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!isEditing && (
                              <span className="text-sm font-mono text-[#7dd87d]">
                                {formatValue(v.value, v.valueType)}
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${valueTypeBadgeColor(v.valueType)}`}
                            >
                              {v.valueType}
                            </Badge>
                            {canEdit && !isEditing && (
                              <button
                                type="button"
                                aria-label={`Edit ${v.displayName}`}
                                onClick={() => startEdit(v)}
                                className="text-white/70 hover:text-white/90 focus:text-white/90 focus:outline-none transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <div className="mt-3 space-y-2 rounded-lg bg-white/5 border border-[#ffd700]/20 p-3">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-white/60 block mb-1">
                                New value
                              </label>
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="bg-white/5 border-white/10 text-white text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") cancelEdit();
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-white/60 block mb-1">
                                Reason (logged to history)
                              </label>
                              <Input
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                placeholder="Why is this changing?"
                                className="bg-white/5 border-white/10 text-white text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit(v.id);
                                  if (e.key === "Escape") cancelEdit();
                                }}
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={cancelEdit}
                                className="h-8 px-3 text-white/70 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => saveEdit(v.id)}
                                disabled={updateMutation.isPending}
                                className="h-8 px-3 bg-[#7dd87d] text-[#0d2818] hover:bg-[#a8e6a8] font-semibold"
                              >
                                <Save className="w-3.5 h-3.5 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        )}
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
  /** Trajectory of this variable across the current session. */
  trajectory?: number[];
  /** Baseline value (what the slider started at). */
  baseline?: number;
  /** Previous-season value, for the ghost reference line. */
  ghost?: number;
  /** Compare mode: show baseline value next to current. */
  compare?: boolean;
}

function formatSimValue(value: number, unit?: string): string {
  if (unit === "%") return `${(value * 100).toFixed(0)}%`;
  if (unit === "x") return `${value.toFixed(1)}x`;
  if (unit === "$") return `$${value.toLocaleString()}`;
  return String(value);
}

function SliderRow({ label, value, min, max, step, unit, help, onChange, trajectory, baseline, ghost, compare }: SliderRowProps) {
  const display = formatSimValue(value, unit);
  const baselineDisplay = baseline != null ? formatSimValue(baseline, unit) : null;
  const changed = baseline != null && value !== baseline;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <label className="text-sm text-white/80 truncate">{label}</label>
          <HelpTip text={help} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {trajectory && trajectory.length > 0 && (
            <Sparkline
              values={trajectory}
              baseline={baseline}
              ghost={ghost}
              width={80}
              height={22}
              color={changed ? "#7dd87d" : "#7dd87d80"}
            />
          )}
          {compare && baselineDisplay && (
            <span className="text-xs font-mono text-white/65 line-through">{baselineDisplay}</span>
          )}
          <span className={`text-sm font-mono ${changed ? "text-[#7dd87d]" : "text-white/70"}`}>{display}</span>
        </div>
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

type HistoryEntry = { label: string; state: SimState; at: number };

function GameSimulator() {
  // Initial state can be loaded from URL hash (Permalinks, MEGA 5.6).
  const [sim, setSim] = useState<SimState>(() => {
    if (typeof window === "undefined") return SIM_DEFAULTS;
    const hash = window.location.hash;
    if (hash.startsWith("#v1:")) {
      try {
        const decoded = JSON.parse(atob(hash.slice(4))) as Partial<SimState>;
        return { ...SIM_DEFAULTS, ...decoded };
      } catch { /* ignore bad hash */ }
    }
    return SIM_DEFAULTS;
  });
  const baseline = SIM_DEFAULTS;
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  // Pull the previous-season snapshot for ghost-curve overlays.
  const { data: previousSeason } = trpc.game.previousVariables.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const ghostMap = (previousSeason?.variables ?? {}) as Record<string, number>;

  const pushHistory = useCallback((label: string, next: SimState) => {
    setHistory((h) => [...h, { label, state: next, at: Date.now() }]);
  }, []);

  const update = useCallback(
    <K extends keyof SimState>(key: K) =>
      (val: SimState[K]) => {
        setSim((prev) => {
          const next = { ...prev, [key]: val };
          // Slider drag pushes a single history entry per change
          setHistory((h) => [...h, { label: `Set ${String(key)} to ${val}`, state: next, at: Date.now() }]);
          return next;
        });
      },
    []
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const next = h.slice(0, -1);
      const restoreTo = next.length > 0 ? next[next.length - 1].state : baseline;
      setSim(restoreTo);
      return next;
    });
  }, [baseline]);

  const reset = useCallback(() => {
    setSim(baseline);
    setHistory([]);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [baseline]);

  // Compute deltas as plain Records for the impact helpers.
  const baselineRecord = useMemo(() => baseline as unknown as Record<string, number>, [baseline]);
  const currentRecord = useMemo(() => sim as unknown as Record<string, number>, [sim]);
  const impactSummaries = useMemo(
    () => computeImpactSummaries(baselineRecord, currentRecord),
    [baselineRecord, currentRecord],
  );

  // Per-variable trajectories: walk history and pull each variable's value
  // at every history step. Always seeds with the baseline value first so the
  // sparkline has a reference point even before any edits.
  const trajectories = useMemo(() => {
    const result: Record<string, number[]> = {};
    for (const key of Object.keys(baseline) as Array<keyof SimState>) {
      const series: number[] = [baseline[key] as number];
      for (const h of history) series.push(h.state[key] as number);
      result[key] = series;
    }
    return result;
  }, [baseline, history]);

  // Permalink encoder
  const buildPermalinkHash = useCallback(() => {
    const delta: Record<string, number> = {};
    for (const k of Object.keys(sim)) {
      const key = k as keyof SimState;
      if (sim[key] !== baseline[key]) delta[key] = sim[key] as number;
    }
    if (Object.keys(delta).length === 0) return "";
    return "#v1:" + btoa(JSON.stringify(delta));
  }, [sim, baseline]);

  const copyPermalink = useCallback(() => {
    const hash = buildPermalinkHash();
    const url = window.location.origin + window.location.pathname + hash;
    copyToClipboard(url);
    if (typeof window !== "undefined") window.history.replaceState(null, "", url);
    setCopyToast("Link copied");
    setTimeout(() => setCopyToast(null), 1500);
  }, [buildPermalinkHash]);

  const copyAsForumPost = useCallback(() => {
    const lines: string[] = ["# Proposed game variable change", ""];
    for (const k of Object.keys(sim)) {
      const key = k as keyof SimState;
      if (sim[key] !== baseline[key]) {
        lines.push(`- **${String(key)}**: ${baseline[key]} -> ${sim[key]}`);
      }
    }
    if (impactSummaries.length > 0) {
      lines.push("", "## Expected impact", "");
      for (const s of impactSummaries) lines.push(`- ${s.message}`);
    }
    const link = window.location.origin + window.location.pathname + buildPermalinkHash();
    lines.push("", `Permalink: ${link}`);
    copyToClipboard(lines.join("\n"));
    setCopyToast("Markdown copied");
    setTimeout(() => setCopyToast(null), 1500);
  }, [sim, baseline, impactSummaries, buildPermalinkHash]);

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

  // Count how many variables differ from baseline.
  const changeCount = useMemo(() => {
    let n = 0;
    for (const k of Object.keys(sim)) {
      const key = k as keyof SimState;
      if (sim[key] !== baseline[key]) n += 1;
    }
    return n;
  }, [sim, baseline]);

  return (
    <div className="space-y-6">
      {/* Toolbar: compare, undo, reset, copy link, copy as forum post, history */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCompareMode((s) => !s)}
          title="Toggle side-by-side display of baseline vs your proposed value on every slider"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
            compareMode
              ? "bg-[#7dd87d]/20 border-[#7dd87d]/50 text-[#7dd87d]"
              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
          }`}
        >
          {compareMode ? "Compare: on" : "Compare to baseline"}
        </button>
        <button
          onClick={undo}
          disabled={history.length === 0}
          title="Step back one slider move"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>
        <button
          onClick={reset}
          disabled={changeCount === 0}
          title="Reset every slider back to its current live value"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
        <button
          onClick={copyPermalink}
          title="Copy a shareable URL that loads this exact simulator state"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
        >
          <Link2 className="w-3.5 h-3.5" /> Copy link
        </button>
        <button
          onClick={copyAsForumPost}
          disabled={changeCount === 0}
          title="Copy a markdown block ready to paste into a forum thread or Hypha proposal"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#7dd87d]/15 border border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/25 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Copy className="w-3.5 h-3.5" /> Copy as forum post
        </button>
        <button
          onClick={() => setShowHistory((s) => !s)}
          title="Review or revert any earlier slider move this session"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 ml-auto"
        >
          History ({history.length})
        </button>
        {copyToast && <span className="text-xs text-[#7dd87d]">{copyToast}</span>}
      </div>

      {/* Overall impact summary */}
      {impactSummaries.length > 0 && (
        <div className="rounded-xl border border-[#7dd87d]/40 bg-[#7dd87d]/8 p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#7dd87d] mb-2 font-bold">Expected impact</p>
          <ul className="space-y-2">
            {impactSummaries.map((s) => (
              <li key={s.variable} className="text-sm text-white/85 leading-relaxed">
                {s.message}
              </li>
            ))}
          </ul>
          {previousSeason && (
            <p className="text-[10px] text-[#d4a574]/80 mt-3">
              Sparklines show a dashed amber line for the {previousSeason.seasonName ?? `Season ${previousSeason.seasonId}`} value.
            </p>
          )}
        </div>
      )}

      {/* History panel: click any row to revert back to that moment */}
      {showHistory && history.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 max-h-60 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-white/70 mb-2 font-bold">
            Your changes (click to revert)
          </p>
          <ol className="space-y-1">
            {history.slice(-20).reverse().map((h, i) => {
              // Compute the original index (pre-reverse, pre-slice) so revert works correctly.
              const originalIndex = history.length - 1 - i;
              return (
                <li key={`${h.at}-${i}`} className="text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSim(h.state);
                      setHistory((prev) => prev.slice(0, originalIndex + 1));
                    }}
                    className="w-full text-left text-white/70 hover:text-[#7dd87d] hover:bg-white/5 rounded px-2 py-1 transition-colors"
                  >
                    {h.label}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="text-[10px] text-white/45 mt-2 px-2">
            Reverting rolls your simulator back to exactly that state and trims the history after it.
          </p>
        </div>
      )}

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
            trajectory={trajectories.questWeight}
            baseline={baseline.questWeight}
            ghost={ghostMap.questWeight}
            compare={compareMode}
          />
          <SliderRow
            label="Forum Points (per post)"
            help="How many points you earn for each forum post. Kept lower than quests because posting is easier than completing a quest."
            value={sim.forumWeight}
            min={1}
            max={30}
            step={1}
            onChange={update("forumWeight")}
            trajectory={trajectories.forumWeight}
            baseline={baseline.forumWeight}
            ghost={ghostMap.forumWeight}
            compare={compareMode}
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
            trajectory={trajectories.trustMultiplierMin}
            baseline={baseline.trustMultiplierMin}
            ghost={ghostMap.trustMultiplierMin}
            compare={compareMode}
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
            trajectory={trajectories.trustMultiplierMax}
            baseline={baseline.trustMultiplierMax}
            ghost={ghostMap.trustMultiplierMax}
            compare={compareMode}
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
            trajectory={trajectories.compostingDecay}
            baseline={baseline.compostingDecay}
            ghost={ghostMap.compostingDecay}
            compare={compareMode}
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
            trajectory={trajectories.harvestPoolSize}
            baseline={baseline.harvestPoolSize}
            ghost={ghostMap.harvestPoolSize}
            compare={compareMode}
          />
          <SliderRow
            label="Gratitude Base Budget (per cycle)"
            help="Your starting gratitude budget each lunar cycle, before any tier multiplier or streak bonus. This is what everyone begins with."
            value={sim.gratitudeBudget}
            min={50}
            max={200}
            step={10}
            onChange={update("gratitudeBudget")}
            trajectory={trajectories.gratitudeBudget}
            baseline={baseline.gratitudeBudget}
            ghost={ghostMap.gratitudeBudget}
            compare={compareMode}
          />
          <SliderRow
            label="People Acknowledged (this cycle)"
            help="How many different people you send gratitude to this cycle. The first 10 get your full impact. After 10, your impact per person starts diluting."
            value={sim.gratitudeRecipients}
            min={1}
            max={30}
            step={1}
            onChange={update("gratitudeRecipients")}
            trajectory={trajectories.gratitudeRecipients}
            baseline={baseline.gratitudeRecipients}
            ghost={ghostMap.gratitudeRecipients}
            compare={compareMode}
          />
          <SliderRow
            label="Streak (consecutive 10+ cycles)"
            help="Number of cycles in a row where you acknowledged at least 10 people. Each streak cycle adds 3% to your effective budget, maxing at 30% after 10 cycles."
            value={sim.streakCycles}
            min={0}
            max={10}
            step={1}
            onChange={update("streakCycles")}
            trajectory={trajectories.streakCycles}
            baseline={baseline.streakCycles}
            ghost={ghostMap.streakCycles}
            compare={compareMode}
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
            trajectory={trajectories.regenDistributionPool}
            baseline={baseline.regenDistributionPool}
            ghost={ghostMap.regenDistributionPool}
            compare={compareMode}
          />
          <SliderRow
            label="$ReGen Claim Threshold"
            help="How much $ReGen you need to accumulate before you can claim it on Hypha. Prevents tiny dust claims from clogging the system. Lower = easier to claim, higher = more meaningful claims."
            value={sim.claimThreshold}
            min={100}
            max={1000}
            step={50}
            onChange={update("claimThreshold")}
            trajectory={trajectories.claimThreshold}
            baseline={baseline.claimThreshold}
            ghost={ghostMap.claimThreshold}
            compare={compareMode}
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
        <Link href={`/assembly?${proposalParams.toString()}`}>
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
        <p className="text-xs text-white/70 mt-0.5">{detail}</p>
      </div>
      <span className="text-sm font-mono text-[#7dd87d] shrink-0">{value}</span>
    </div>
  );
}

/* ─── MiniSectionSimulator ────────────────────────────────────────────
 * A focused mini-sim that renders at the bottom of a section. Takes a
 * short list of variables with min/max/step/unit and baseline values and
 * lets the user drag to see how proposed changes read as a diff. Emits
 * a "Copy proposed changes" markdown block scoped to that section only.
 *
 * D4 spec: Below each collapsible section, render a mini-simulator that
 * takes the user's adjusted variables and outputs the resulting diff,
 * plus a Copy button that produces a Hypha-proposal-ready paste.
 */

interface MiniVar {
  key: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  baseline: number;
  help?: string;
  describe?: (v: number) => string;
}

function MiniSectionSimulator({
  sectionTitle,
  variables,
  summary,
}: {
  sectionTitle: string;
  variables: MiniVar[];
  summary?: (state: Record<string, number>) => string;
}) {
  const initial = useMemo(
    () => Object.fromEntries(variables.map((v) => [v.key, v.baseline])) as Record<string, number>,
    [variables],
  );
  const [state, setState] = useState<Record<string, number>>(initial);
  const [rationale, setRationale] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const changedKeys = useMemo(
    () => variables.filter((v) => state[v.key] !== v.baseline),
    [variables, state],
  );

  const resetAll = useCallback(() => {
    setState(initial);
    setRationale("");
  }, [initial]);

  const copyProposedChanges = useCallback(() => {
    const lines: string[] = [
      `ReGen Civics: Proposed variable changes`,
      `Section: ${sectionTitle}`,
    ];
    if (changedKeys.length === 0) {
      lines.push("  (no variables changed yet)");
    } else {
      for (const v of changedKeys) {
        const unit = v.unit ?? "";
        lines.push(`  ${v.key}: ${v.baseline}${unit} -> ${state[v.key]}${unit}`);
      }
    }
    if (summary) {
      lines.push("", "Expected effect:");
      lines.push(`  ${summary(state)}`);
    }
    lines.push("", "Rationale:");
    lines.push(`  ${rationale.trim() || "(add a rationale before posting)"}`);
    const text = lines.join("\n");
    copyToClipboard(text).then((ok) => {
      if (ok) {
        toast.success("Copied to clipboard", { description: "Paste into a forum post or Hypha proposal." });
        setCopied(text);
        setTimeout(() => setCopied(null), 2000);
      } else {
        toast.error("Copy failed");
      }
    });
  }, [sectionTitle, variables, state, changedKeys, rationale, summary]);

  return (
    <div className="mt-8 rounded-xl border border-[#7dd87d]/25 bg-[#7dd87d]/5 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#7dd87d]" />
          <h4 className="text-sm font-bold text-white uppercase tracking-widest">
            Propose changes to {sectionTitle.toLowerCase()}
          </h4>
        </div>
        {changedKeys.length > 0 && (
          <button
            type="button"
            onClick={resetAll}
            className="text-[11px] text-white/60 hover:text-white/90 inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      <p className="text-xs text-white/60 leading-relaxed mb-4">
        Drag to see a proposed delta, then copy the block to paste into a forum thread or a Hypha proposal.
      </p>

      <div className="space-y-4">
        {variables.map((v) => {
          const current = state[v.key];
          const changed = current !== v.baseline;
          return (
            <div key={v.key}>
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm text-white/85 truncate">{v.label}</span>
                  <HelpTip text={v.help} />
                </div>
                <span
                  className={`text-xs font-mono shrink-0 ${
                    changed ? "text-[#7dd87d] font-bold" : "text-white/60"
                  }`}
                >
                  {changed ? (
                    <>
                      <span className="text-white/40 line-through mr-1">{v.baseline}{v.unit ?? ""}</span>
                      {current}{v.unit ?? ""}
                    </>
                  ) : (
                    <>{current}{v.unit ?? ""}</>
                  )}
                </span>
              </div>
              <Slider
                value={[current]}
                min={v.min}
                max={v.max}
                step={v.step}
                onValueChange={([val]) => setState((s) => ({ ...s, [v.key]: val }))}
              />
              {v.describe && (
                <p className="text-[11px] text-white/70 mt-1">{v.describe(current)}</p>
              )}
            </div>
          );
        })}
      </div>

      {summary && (
        <div className="mt-4 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[#d4a574] mb-1 font-bold">
            Expected effect
          </p>
          <p className="text-xs text-white/80 leading-relaxed">{summary(state)}</p>
        </div>
      )}

      <div className="mt-4">
        <label className="block text-[10px] uppercase tracking-wider text-white/70 mb-1.5 font-bold">
          Rationale (plain language, optional but recommended)
        </label>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why do you want to change these values?"
          rows={2}
          className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/90 placeholder:text-white/40 focus:outline-none focus:border-[#7dd87d]/50 resize-none"
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          onClick={copyProposedChanges}
          disabled={changedKeys.length === 0}
          className="bg-[#7dd87d]/15 hover:bg-[#7dd87d]/25 text-[#7dd87d] border border-[#7dd87d]/40 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          Copy proposed changes
        </Button>
        {copied && <span className="text-[11px] text-[#7dd87d]">Copied</span>}
        <Link href="/assembly?category=game_variable" className="ml-auto">
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white/90 text-xs">
            Open proposal form
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ─── CollapsibleSection: used for each main section on this page ──────
 * Default state: collapsed on mobile (< 768px), expanded on desktop.
 * Header stays visible and tappable. Chevron rotates to indicate state.
 * Accessible via keyboard (Radix Collapsible handles that).
 */

interface CollapsibleSectionProps {
  title: React.ReactNode;
  intro?: React.ReactNode;
  children: React.ReactNode;
  titleClassName?: string;
}

function CollapsibleSection({ title, intro, children, titleClassName }: CollapsibleSectionProps) {
  const isMobile = useIsMobile();
  // React state mirrors defaultOpen; recomputed when the viewport changes
  // so rotating a phone or resizing the window reopens/closes as expected.
  const [open, setOpen] = useState(!isMobile);

  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group flex items-center justify-between gap-4 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd87d]/50 rounded-md"
        >
          <div className={`flex-1 min-w-0 ${titleClassName ?? ""}`}>{title}</div>
          <ChevronDown
            className={`w-5 h-5 text-white/60 group-hover:text-white/90 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>
      {intro ? <div className="mt-3">{intro}</div> : null}
      <CollapsibleContent className="pt-6 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ─── How Bounties Are Valued ────────────────────────────────────────────
 * Transparency surface for the deterministic bounty valuation engine: the
 * governance explainer, the live weights, the learned demand factors per
 * circle, the season budget, and a simulator that calls the real engine on
 * the server (so the shown math can never drift from what pays out).
 */

const SCOPE_TIER_OPTIONS: Array<{ value: "trivial" | "small" | "medium" | "large"; label: string }> = [
  { value: "trivial", label: "Trivial (a quick favor)" },
  { value: "small", label: "Small (one deliverable)" },
  { value: "medium", label: "Medium (a real piece of work)" },
  { value: "large", label: "Large (a substantial build)" },
];
const IMPACT_OPTIONS: Array<{ value: "low" | "normal" | "high"; label: string }> = [
  { value: "low", label: "Low (internal polish)" },
  { value: "normal", label: "Normal (moves us forward)" },
  { value: "high", label: "High (serves a land project)" },
];

function BountyValuationSection() {
  const { data: variables = [] } = trpc.game.listVariables.useQuery(undefined, { staleTime: 60_000 });
  const { data: info } = trpc.bounties.valuationInfo.useQuery(undefined, { staleTime: 60_000 });

  const [scopeTier, setScopeTier] = useState<"trivial" | "small" | "medium" | "large">("medium");
  const [impactLevel, setImpactLevel] = useState<"low" | "normal" | "high">("normal");
  const [circle, setCircle] = useState<string>("general");
  const [priority, setPriority] = useState(false);

  const { data: sim } = trpc.bounties.simulateValuation.useQuery(
    { scopeTier, impactLevel, circle, priority },
    { placeholderData: (prev) => prev },
  );

  const bountyVars = (variables as GameVariable[])
    .filter((v) => v.category === "bounty")
    .sort((a, b) => a.key.localeCompare(b.key));

  const demandFactors = (info?.demandFactors ?? []) as Array<{
    circle: string; scopeTier: string; factor: number; precedentMedian: number | null; sampleSize: number;
  }>;
  const circleOptions = Array.from(new Set(["general", ...demandFactors.map((d) => d.circle)]));

  const fmtNum = (n: number) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="space-y-8">
      {/* Governance explainer, verbatim */}
      <blockquote className="border-l-2 border-[#7dd87d]/40 pl-4 text-white/70 text-sm leading-relaxed max-w-3xl">
        <span className="font-semibold text-white/90">How these values are set.</span> Every number here is public and
        lives in the game's shared settings. Stewards can make small adjustments within published limits to keep the
        board healthy day to day. The engine also learns on its own: when a kind of bounty keeps going unclaimed, it
        raises the reward, and it calibrates toward what the community has actually paid for similar work. Larger or
        structural changes go to a community vote on Hypha, and the whole table is reviewed and ratified together at
        each Season Festival. Nothing here is fixed by decree; it is tended by the community and by the movement's real
        activity.
      </blockquote>

      <p className="text-white/60 text-sm max-w-3xl leading-relaxed">
        A bounty's reward is a base amount for its size, raised or lowered by how much it serves the movement and by
        what the community is actually claiming, then kept within the season's budget.
      </p>

      {/* Live weights */}
      <div>
        <h3 className="text-white/90 font-semibold mb-3">The weights, live</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {bountyVars.map((v) => (
            <div key={v.key} className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-3 py-2">
              <span className="flex items-center gap-1.5 text-white/70 text-sm min-w-0">
                <span className="truncate">{v.displayName || v.key}</span>
                <HelpTip text={VARIABLE_HELP[v.key] ?? v.description} />
              </span>
              <span className="text-[#7dd87d] font-mono text-sm shrink-0">{formatValue(Number(v.value), v.valueType)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Learned demand factors */}
      <div>
        <h3 className="text-white/90 font-semibold mb-1">What the engine has learned</h3>
        <p className="text-white/50 text-xs mb-3 max-w-2xl">
          Demand factors per circle and size. Above 1 means that kind of bounty kept going unclaimed, so the reward
          rose. Precedent is the median of what similar work has actually paid.
        </p>
        {demandFactors.length === 0 ? (
          <p className="text-white/40 text-sm italic">No learned factors yet. The engine starts everything at 1.0x and calibrates as bounties are claimed and completed.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/50 text-left border-b border-white/10">
                  <th className="py-2 pr-4 font-medium">Circle</th>
                  <th className="py-2 pr-4 font-medium">Size</th>
                  <th className="py-2 pr-4 font-medium">Demand</th>
                  <th className="py-2 pr-4 font-medium">Precedent</th>
                  <th className="py-2 font-medium">Samples</th>
                </tr>
              </thead>
              <tbody>
                {demandFactors.map((d) => (
                  <tr key={`${d.circle}-${d.scopeTier}`} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-white/80">{d.circle}</td>
                    <td className="py-2 pr-4 text-white/70 capitalize">{d.scopeTier}</td>
                    <td className="py-2 pr-4 font-mono text-[#7dd87d]">{Number(d.factor).toFixed(2)}x</td>
                    <td className="py-2 pr-4 font-mono text-white/70">{d.precedentMedian != null ? `${fmtNum(d.precedentMedian)} $ReGen` : "—"}</td>
                    <td className="py-2 text-white/50">{d.sampleSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Season budget */}
      <div className="rounded-md bg-white/5 px-4 py-3 max-w-md">
        <h3 className="text-white/90 font-semibold mb-1 text-sm">Season budget</h3>
        {info?.seasonBudget ? (
          <p className="text-white/70 text-sm">
            <span className="font-mono text-[#7dd87d]">{fmtNum(info.committed)}</span> committed of{" "}
            <span className="font-mono">{fmtNum(info.seasonBudget)}</span> $ReGen
            <span className="text-white/50"> ({fmtNum(Math.max(0, info.seasonBudget - info.committed))} available)</span>
          </p>
        ) : (
          <p className="text-white/60 text-sm">
            No season cap set. <span className="font-mono text-[#7dd87d]">{fmtNum(info?.committed ?? 0)}</span> $ReGen
            committed to live and paid bounties so far. Per-bounty and demand bounds keep amounts in check.
          </p>
        )}
      </div>

      {/* Simulator (server-backed) */}
      <div className="rounded-lg border border-[#7dd87d]/20 bg-white/5 p-4 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-[#7dd87d]" />
          <h3 className="text-white/90 font-semibold">Valuation simulator</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <label className="text-xs text-white/60">
            Size
            <select
              value={scopeTier}
              onChange={(e) => setScopeTier(e.target.value as typeof scopeTier)}
              className="mt-1 w-full rounded-md bg-[#0f2417] border border-white/15 text-white text-sm px-2 py-1.5 focus:outline-none focus:border-[#7dd87d]/50"
            >
              {SCOPE_TIER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/60">
            Impact
            <select
              value={impactLevel}
              onChange={(e) => setImpactLevel(e.target.value as typeof impactLevel)}
              className="mt-1 w-full rounded-md bg-[#0f2417] border border-white/15 text-white text-sm px-2 py-1.5 focus:outline-none focus:border-[#7dd87d]/50"
            >
              {IMPACT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/60">
            Circle
            <select
              value={circle}
              onChange={(e) => setCircle(e.target.value)}
              className="mt-1 w-full rounded-md bg-[#0f2417] border border-white/15 text-white text-sm px-2 py-1.5 focus:outline-none focus:border-[#7dd87d]/50"
            >
              {circleOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs text-white/60 mb-4 cursor-pointer">
          <input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} className="accent-[#7dd87d]" />
          Hard to fill (priority boost)
        </label>
        {sim ? (
          <div className="border-t border-white/10 pt-4">
            <div className="text-3xl font-bold text-[#7dd87d]" style={{ fontFamily: "var(--font-display)" }}>
              {sim.amount.toLocaleString()} $ReGen
            </div>
            <p className="text-white/60 text-xs mt-2 leading-relaxed">
              base {fmtNum(sim.base)} × impact {fmtNum(sim.impact)}× × priority {fmtNum(sim.priority)}× × demand {fmtNum(sim.demand)}×
              {sim.precedentMedian != null ? `, anchored ${Math.round(sim.anchorWeight * 100)}% toward the precedent median of ${fmtNum(sim.precedentMedian)}` : ""}
              , rounded to the nearest {formatValue(Number((bountyVars.find((b) => b.key === "bounty.round_to")?.value) ?? 25), "integer")}.
            </p>
          </div>
        ) : (
          <p className="text-white/40 text-sm">Computing…</p>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */

export default function GameMechanics() {
  // Live figures from the engine (game_variables). Rendered into the tier and
  // gratitude copy below so these pages never drift from the real values.
  const { mechanics: m } = useGameMechanics();
  const tiers = m?.citizenship.tiers;
  const fmtX = (n: number | undefined, fallback: string) =>
    n == null ? fallback : `${n}x`;
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

            <p className="text-base md:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed safe-prose">
              Every variable in the ReGen Games is visible and tunable. Browse live values or use
              the simulator to see how changes would affect scoring, harvest shares, and gratitude
              budgets.
            </p>
          </AnimatedSection>
        </section>

        {/* Citizenship Tiers (top of page) */}
        <section className="container mx-auto px-4 pb-16">
          <AnimatedSection animation="slide-up">
            <CollapsibleSection
              title={
                <h2
                  className="text-2xl md:text-3xl font-bold text-white mb-0"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Citizenship Tiers
                </h2>
              }
              intro={
                <p className="text-white/70 max-w-2xl leading-relaxed safe-prose">
                  You grow into this society at your own pace. Everyone starts as an Explorer and earns deeper participation through real contribution. Each tier carries different powers, gratitude budgets, and governance weight.
                </p>
              }
            >
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
                    `Active for ${tiers?.coCreator.minSeasons ?? 2}+ season${(tiers?.coCreator.minSeasons ?? 2) === 1 ? "" : "s"}`,
                    `Reputation above ${tiers?.coCreator.minPercentile ?? 15}th percentile`,
                  ],
                  powers: [
                    "Harvest share based on contribution score",
                    `Full gratitude budget (${fmtX(tiers?.coCreator.gratitudeMultiplier, "1.2x")} multiplier)`,
                    `Harvest multiplier ${fmtX(tiers?.coCreator.harvestMultiplier, "1.5x")}`,
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
                    `Sustained contribution across ${tiers?.steward.minSeasons ?? 3}+ seasons`,
                    `Reputation score above ${tiers?.steward.minPercentile ?? 50}th percentile`,
                    "Vouching from existing Stewards",
                  ],
                  powers: [
                    "Trust Tokens for governance voting",
                    "Proposal creation rights",
                    `Enhanced gratitude budget (${fmtX(tiers?.steward.gratitudeMultiplier, "1.5x")} multiplier)`,
                    `Harvest multiplier ${fmtX(tiers?.steward.harvestMultiplier, "2.0x")}`,
                    "Land project evaluation access",
                    "Governance on Hypha (app.hypha.earth)",
                  ],
                  accent: "#ffd700",
                },
                {
                  title: "Sage",
                  emoji: "🏔️",
                  description: "The long-game players. Sages have demonstrated deep, consistent contribution across many seasons. Their voice carries the most weight in governance.",
                  requirements: [
                    `Sustained contribution across ${tiers?.sage.minSeasons ?? 6}+ seasons`,
                    `Reputation score above ${tiers?.sage.minPercentile ?? 90}th percentile`,
                    "Track record of successful proposals",
                    "Community recognition through gratitude",
                  ],
                  powers: [
                    "Maximum governance weight",
                    "Seasonal council participation",
                    "Endorse or flag proposals",
                    "Mentor matching for newer players",
                    `Harvest multiplier ${fmtX(tiers?.sage.harvestMultiplier, "3.0x")} (${fmtX(tiers?.sage.gratitudeMultiplier, "2.0x")} gratitude)`,
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
                  <p className="text-white/80 mb-5 leading-relaxed safe-prose">{tier.description}</p>
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
            <p className="text-white/60 text-sm mt-6 max-w-2xl leading-relaxed safe-prose">
              Tier promotion happens automatically through a nightly batch job that recalculates your reputation, contribution score, and seasonal activity. There's a grace period before demotion. You don't lose tiers from a quiet week.
            </p>
            <div className="max-w-2xl">
              <MiniSectionSimulator
                sectionTitle="Citizenship Tiers"
                variables={[
                  {
                    key: "citizenship.co_creator.min_percentile",
                    label: "Co-Creator percentile threshold",
                    unit: "th",
                    min: 10,
                    max: 40,
                    step: 1,
                    baseline: 15,
                    help: "Contribution percentile needed to reach Co-Creator. Lower = easier to promote new members.",
                  },
                  {
                    key: "citizenship.steward.min_percentile",
                    label: "Steward percentile threshold",
                    unit: "th",
                    min: 40,
                    max: 70,
                    step: 1,
                    baseline: 50,
                    help: "Contribution percentile needed to reach Steward. Higher = rarer, more weighted.",
                  },
                  {
                    key: "citizenship.sage.min_percentile",
                    label: "Sage percentile threshold",
                    unit: "th",
                    min: 70,
                    max: 95,
                    step: 1,
                    baseline: 80,
                    help: "Contribution percentile needed to reach Sage. Sage is the long-game tier.",
                  },
                  {
                    key: "citizenship.grace_period_days",
                    label: "Demotion grace period",
                    unit: " days",
                    min: 7,
                    max: 90,
                    step: 1,
                    baseline: 30,
                    help: "How long after falling below a threshold before you're demoted.",
                  },
                ]}
                summary={(s) => {
                  const co = s["citizenship.co_creator.min_percentile"];
                  const st = s["citizenship.steward.min_percentile"];
                  const sg = s["citizenship.sage.min_percentile"];
                  const grace = s["citizenship.grace_period_days"];
                  return `Explorer covers 0-${co - 1}th percentile, Co-Creator ${co}-${st - 1}th, Steward ${st}-${sg - 1}th, Sage ${sg}+. Demotion kicks in after ${grace} days below threshold.`;
                }}
              />
            </div>
            </CollapsibleSection>
          </AnimatedSection>
        </section>

        {/* Section A: Live Variables */}
        <section className="container mx-auto px-4 pb-16">
          <AnimatedSection animation="slide-up">
            <CollapsibleSection
              title={
                <h2
                  className="text-2xl md:text-3xl font-bold text-white mb-0"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Live Variables
                </h2>
              }
            >
              <p className="text-white/60 text-sm max-w-3xl mb-6 leading-relaxed">
                Every number that drives the game lives here, current value and proposed-change history side by side.
                Players can read everything; super admins can edit a value inline. Use this when you want to know what
                a quest is worth right now or how a coefficient has changed over time.
              </p>
              <LiveVariablesDashboard />
              <div className="max-w-2xl mx-auto">
                <MiniSectionSimulator
                  sectionTitle="Live Variables"
                  variables={[
                    {
                      key: "scoring.weights.quest_routine",
                      label: "Routine quest points",
                      min: 1,
                      max: 25,
                      step: 1,
                      baseline: 10,
                      help: "Points earned per routine quest. Raising this rewards frequent small actions.",
                    },
                    {
                      key: "scoring.weights.forum_post",
                      label: "Forum post points",
                      min: 1,
                      max: 15,
                      step: 1,
                      baseline: 5,
                      help: "Points per forum post. Lower than quests to avoid rewarding spam.",
                    },
                    {
                      key: "trust.multiplier.max",
                      label: "Max trust multiplier",
                      unit: "x",
                      min: 1.5,
                      max: 5.0,
                      step: 0.1,
                      baseline: 3.0,
                      help: "Ceiling for long-time Sages. Higher values widen the gap between Explorers and Sages.",
                    },
                  ]}
                  summary={(s) => {
                    const quest = s["scoring.weights.quest_routine"];
                    const forum = s["scoring.weights.forum_post"];
                    const trust = s["trust.multiplier.max"];
                    const raw = quest * 10 + forum * 15;
                    return `A Sage completing 10 quests and 15 forum posts would earn ~${Math.round(raw * trust).toLocaleString()} boosted points (${raw} raw x ${trust.toFixed(1)}x trust).`;
                  }}
                />
              </div>
            </CollapsibleSection>
          </AnimatedSection>
        </section>

        {/* Section A2: How Bounties Are Valued */}
        <section id="how-bounties-are-valued" className="container mx-auto px-4 pb-16 scroll-mt-24">
          <AnimatedSection animation="slide-up">
            <CollapsibleSection
              title={
                <h2
                  className="text-2xl md:text-3xl font-bold text-white mb-0"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  How Bounties Are Valued
                </h2>
              }
            >
              <BountyValuationSection />
            </CollapsibleSection>
          </AnimatedSection>
        </section>

        {/* Section B: Simulator */}
        <section className="container mx-auto px-4 pb-16">
          <AnimatedSection animation="slide-up">
            <CollapsibleSection
              title={
                <h2
                  className="text-2xl md:text-3xl font-bold text-white mb-0"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Game Simulator
                </h2>
              }
            >
              <p className="text-white/60 text-sm max-w-3xl mb-6 leading-relaxed">
                Drag the sliders to model how a proposed change ripples through the game. Outputs are computed
                client-side from the same formulas the live system uses, so the projection matches what would happen
                if the change shipped. Nothing here writes to the database.
              </p>
              <div className="max-w-2xl mx-auto">
                <GameSimulator />
              </div>
            </CollapsibleSection>
          </AnimatedSection>
        </section>

        {/* Section C: Gratitude Variables Reference */}
        <section className="container mx-auto px-4 pb-24">
          <AnimatedSection animation="slide-up">
            <CollapsibleSection
              title={
                <h2
                  className="text-2xl md:text-3xl font-bold text-white mb-0 flex items-center gap-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <Heart className="w-6 h-6 text-[#d4a017]" />
                  Gratitude System Variables
                </h2>
              }
            >
            <p className="text-white/60 text-sm max-w-3xl mb-6 leading-relaxed">
              Gratitude is the lunar-cycle pulse of the game: every player gets a budget, sends thank-yous, and the
              receiving side carries forward as trust weight. The variables below shape the budget size, the
              redistribution pool, and how strongly received gratitude lifts your trust score.
            </p>
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
                    detail="Base weight"
                    help="Explorers carry the base gratitude weight with no multiplier. You can still send gratitude, you just don't carry extra weight yet."
                  />
                  <GratVarRow
                    label="Co-Creator"
                    value={fmtX(tiers?.coCreator.gratitudeMultiplier, "1.2x")}
                    detail="Weighted gratitude"
                    help="Co-Creators carry more gratitude weight. Earned by completing onboarding quests, inviting at least one person, and staying active for a season."
                  />
                  <GratVarRow
                    label="Steward"
                    value={fmtX(tiers?.steward.gratitudeMultiplier, "1.5x")}
                    detail="Weighted gratitude"
                    help={`Stewards carry more gratitude weight. Earned by sustained contribution across ${tiers?.steward.minSeasons ?? 3}+ seasons and reputation above the ${tiers?.steward.minPercentile ?? 50}th percentile.`}
                  />
                  <GratVarRow
                    label="Sage"
                    value={fmtX(tiers?.sage.gratitudeMultiplier, "2.0x")}
                    detail="Weighted gratitude"
                    help={`Sages carry the most gratitude weight. The long-game tier, earned through ${tiers?.sage.minSeasons ?? 6}+ seasons of deep contribution and community recognition.`}
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
                    value={`${(m?.claims.thresholds.regen ?? 1000).toLocaleString()} $ReGen`}
                    detail="Accumulate before claiming on Hypha"
                    help={`You need to have accumulated at least ${(m?.claims.thresholds.regen ?? 1000).toLocaleString()} $ReGen before you can claim it on Hypha. Prevents tiny dust claims and encourages meaningful withdrawals.`}
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
            <div className="max-w-2xl mx-auto mt-8">
              <MiniSectionSimulator
                sectionTitle="Gratitude System"
                variables={[
                  {
                    key: "gratitude.budget_base",
                    label: "Base budget per cycle",
                    min: 50,
                    max: 300,
                    step: 10,
                    baseline: 100,
                    help: "Starting gratitude budget each lunar cycle, before tier multipliers.",
                  },
                  {
                    key: "gratitude.pool_per_cycle",
                    label: "$ReGen pool per cycle",
                    unit: " $ReGen",
                    min: 1000,
                    max: 50000,
                    step: 1000,
                    baseline: 10000,
                    help: "Total $ReGen released each cycle and split among gratitude receivers.",
                  },
                  {
                    key: "gratitude.claim_threshold",
                    label: "Claim threshold",
                    unit: " $ReGen",
                    min: 100,
                    max: 1000,
                    step: 10,
                    baseline: 333,
                    help: "Minimum $ReGen you must accumulate before claiming on Hypha.",
                  },
                  {
                    key: "gratitude.trust_graph.received_weight",
                    label: "Received weight (per gratitude)",
                    min: 0.05,
                    max: 0.30,
                    step: 0.01,
                    baseline: 0.10,
                    help: "How much each gratitude you receive adds to your trust multiplier.",
                  },
                ]}
                summary={(s) => {
                  const base = s["gratitude.budget_base"];
                  const pool = s["gratitude.pool_per_cycle"];
                  const threshold = s["gratitude.claim_threshold"];
                  const sageBudget = Math.round(base * 5);
                  const cyclesToClaim = Math.max(1, Math.round(threshold / (pool / 50)));
                  return `A Sage would have ${sageBudget} effective budget per cycle. At this pool size, an average receiver needs roughly ${cyclesToClaim} cycle${cyclesToClaim === 1 ? "" : "s"} to hit the ${threshold} claim threshold.`;
                }}
              />
            </div>
            </CollapsibleSection>

            <CollapsibleSection
              title={
                <h2
                  className="text-2xl md:text-3xl font-bold text-white mb-0 flex items-center gap-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <TreePine className="w-6 h-6 text-[#7dd87d]" />
                  Living Tree
                </h2>
              }
            >
              <p className="text-white/60 text-sm max-w-3xl mb-6 leading-relaxed">
                Every player has a Living Tree grown from their contributions. Its trunk, canopy, roots, and
                seasonal flourishes all read from game data. The tables below show exactly which variable drives
                which part of the tree, so a proposal to change the art is also a proposal to change the math.
              </p>

              <div className="grid gap-6 md:grid-cols-2 max-w-5xl">
                {/* Sub-section 1: Tree Structure (per player) */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#7dd87d]" />
                      Tree Structure (per player)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <GratVarRow
                      label="Total contribution score"
                      value="SUM(points)"
                      detail="Drives trunk width"
                      help="Sum of all points in player_contributions for this user. Wider trunk reads as a more prolific player."
                    />
                    <GratVarRow
                      label="Seasons completed"
                      value="count"
                      detail="Drives trunk rings"
                      help="A ring is added each season the player finishes. Old trees show more rings."
                    />
                    <GratVarRow
                      label="Contribution balance ratio"
                      value="std-dev(9 capitals)"
                      detail="Broad canopy = balanced, tall = specialized"
                      help="Low variance across the 9 capital scores draws a broad canopy. High variance draws a taller, narrower tree."
                    />
                    <GratVarRow
                      label="Longevity flag"
                      value="seasons >= threshold"
                      detail="Moss, birds, undergrowth appear"
                      help="When seasons_completed crosses the longevity_threshold variable, ambient decorations appear on the tree."
                    />
                  </CardContent>
                </Card>

                {/* Sub-section 2: 9 Root Arteries */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Network className="w-4 h-4 text-[#7dd87d]" />
                      9 Root Arteries (from capital scores)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <GratVarRow label="Root 1: Intellectual" value="intellectual" detail="Knowledge, research, learning" />
                    <GratVarRow label="Root 2: Social" value="social" detail="Networks, relationships, trust" />
                    <GratVarRow label="Root 3: Material" value="material" detail="Tools, infrastructure, hardware" />
                    <GratVarRow label="Root 4: Financial" value="financial" detail="Money, investments, grants" />
                    <GratVarRow label="Root 5: Living" value="living" detail="Land, ecosystems, biodiversity" />
                    <GratVarRow label="Root 6: Cultural" value="cultural" detail="Art, stories, rituals, values" />
                    <GratVarRow label="Root 7: Spiritual" value="spiritual" detail="Vision, meaning, purpose" />
                    <GratVarRow label="Root 8: Experiential" value="experiential" detail="Lived experience, craft hours" />
                    <GratVarRow label="Root 9: Health" value="health" detail="Body vitality, wellness, rest" />
                  </CardContent>
                </Card>

                {/* Sub-section 3: Seasonal Elements */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-[#7dd87d]" />
                      Seasonal Elements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <GratVarRow
                      label="Flower count"
                      value="current season actions"
                      detail="Blooms this lunar cycle"
                      help="One flower per quest completion, forum post, or contribution logged in the current lunar cycle."
                    />
                    <GratVarRow
                      label="Flower size"
                      value="flower_scale"
                      detail="Tunable multiplier (default 1.0)"
                      help="Multiplies the base flower radius. Scales the visual emphasis without changing the count."
                    />
                    <GratVarRow
                      label="Fruit"
                      value="points >= fruit_min_points"
                      detail="Appears only when the threshold is crossed"
                      help="Fruit represents claim-worthy accumulation. When a player's cycle points pass fruit_min_points, a fruit renders."
                    />
                    <GratVarRow
                      label="Canopy palette"
                      value="current season"
                      detail="Rotates spring / summer / fall / winter"
                      help="Hemisphere-aware. Palette swaps on each equinox / solstice."
                    />
                  </CardContent>
                </Card>

                {/* Sub-section 4: Network */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Network className="w-4 h-4 text-[#7dd87d]" />
                      Network
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <GratVarRow
                      label="Mycelium threads"
                      value="referrals"
                      detail="Lines connecting your tree to the trees you invited"
                      help="Each successful referral draws a faint thread between your tree and the referred player's tree on the community map."
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Sub-section 5: Tunable Variables */}
              <div className="max-w-2xl mx-auto mt-8">
                <MiniSectionSimulator
                  sectionTitle="Living Tree"
                  variables={[
                    {
                      key: "living_tree.trunk_max_width",
                      label: "Trunk max width",
                      unit: " px",
                      min: 40,
                      max: 240,
                      step: 5,
                      baseline: 120,
                      help: "The widest the trunk ever draws, reached at the highest contribution score.",
                    },
                    {
                      key: "living_tree.longevity_threshold",
                      label: "Longevity threshold",
                      unit: " seasons",
                      min: 3,
                      max: 20,
                      step: 1,
                      baseline: 10,
                      help: "Seasons a player must finish before moss, birds, and undergrowth decorate the tree.",
                    },
                    {
                      key: "living_tree.flower_scale",
                      label: "Flower scale",
                      min: 0.5,
                      max: 2.0,
                      step: 0.1,
                      baseline: 1.0,
                      help: "Multiplier on flower size. 1.0 is the current default.",
                    },
                    {
                      key: "living_tree.fruit_min_points",
                      label: "Fruit minimum points",
                      unit: " pts",
                      min: 10,
                      max: 200,
                      step: 5,
                      baseline: 50,
                      help: "Minimum cycle points a player needs before a fruit appears on their tree.",
                    },
                  ]}
                  summary={(s) => {
                    const width = s["living_tree.trunk_max_width"];
                    const longevity = s["living_tree.longevity_threshold"];
                    const flower = s["living_tree.flower_scale"];
                    const fruit = s["living_tree.fruit_min_points"];
                    return `At these values, a top-tier player caps trunk width at ${width}px, earns ambient decorations after ${longevity} seasons, renders flowers at ${flower.toFixed(1)}x scale, and needs ${fruit} cycle points before a fruit appears.`;
                  }}
                />
              </div>
            </CollapsibleSection>
          </AnimatedSection>
        </section>
      </div>
    </PageTransition>
  );
}
