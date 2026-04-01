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
  Search,
  SlidersHorizontal,
  Calculator,
  ArrowRight,
  BarChart3,
  Sparkles,
  Leaf,
  Heart,
  Shield,
} from "lucide-react";

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
}

const SIM_DEFAULTS: SimState = {
  questWeight: 10,
  forumWeight: 5,
  trustMultiplierMin: 1.0,
  trustMultiplierMax: 3.0,
  compostingDecay: 0.15,
  harvestPoolSize: 50000,
  gratitudeBudget: 20,
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
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter variables..."
          className="pl-9 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-white/40 text-sm">Loading game variables...</p>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/40 text-sm">No variables match your search.</p>
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
                  {vars.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white/90 font-medium truncate">
                          {v.displayName}
                        </p>
                        {v.description && (
                          <p className="text-xs text-white/40 truncate mt-0.5">{v.description}</p>
                        )}
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
                  ))}
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
  onChange: (val: number) => void;
}

function SliderRow({ label, value, min, max, step, unit, onChange }: SliderRowProps) {
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
        <label className="text-sm text-white/80">{label}</label>
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
    tier === "Sage" ? 3.0 : tier === "Steward" ? 2.0 : tier === "Co-Creator" ? 1.5 : 1.0;

  const effectiveGratitude = Math.round(sim.gratitudeBudget * tierMultiplier);

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
            value={sim.questWeight}
            min={1}
            max={50}
            step={1}
            onChange={update("questWeight")}
          />
          <SliderRow
            label="Forum Points (per post)"
            value={sim.forumWeight}
            min={1}
            max={30}
            step={1}
            onChange={update("forumWeight")}
          />
          <SliderRow
            label="Trust Multiplier (min)"
            value={sim.trustMultiplierMin}
            min={0.5}
            max={2.0}
            step={0.1}
            unit="x"
            onChange={update("trustMultiplierMin")}
          />
          <SliderRow
            label="Trust Multiplier (max)"
            value={sim.trustMultiplierMax}
            min={1.0}
            max={5.0}
            step={0.1}
            unit="x"
            onChange={update("trustMultiplierMax")}
          />
          <SliderRow
            label="Composting Decay Rate"
            value={sim.compostingDecay}
            min={0}
            max={0.5}
            step={0.01}
            unit="%"
            onChange={update("compostingDecay")}
          />
          <SliderRow
            label="Harvest Pool Size"
            value={sim.harvestPoolSize}
            min={10000}
            max={200000}
            step={5000}
            unit="$"
            onChange={update("harvestPoolSize")}
          />
          <SliderRow
            label="Gratitude Budget (base tokens)"
            value={sim.gratitudeBudget}
            min={5}
            max={100}
            step={1}
            onChange={update("gratitudeBudget")}
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
          <p className="text-xs text-white/40 mt-1">
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
            value={`${effectiveGratitude} tokens`}
            detail={`${sim.gratitudeBudget} base * ${tierMultiplier}x tier bonus`}
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
        <p className="text-xs text-white/40 mt-2">
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
      <p className="text-xs text-white/40 mt-1">{detail}</p>
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
        <section className="container mx-auto px-4 pb-24">
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
      </div>
    </PageTransition>
  );
}
