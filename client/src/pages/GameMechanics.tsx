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

/* ─── Types ──────────────────────────────────────────────────────────── */

interface GameVariable {
  id: number;
  category: string;
  subcategory?: string | null;
  key: string;
  displayName: string;
  description?: string | null;
  /** DECIMAL columns arrive from MySQL as strings, e.g. "1000.000000". */
  value: number | string;
  valueType: string;
  unit?: string | null;
  minValue?: number | string | null;
  maxValue?: number | string | null;
}

/* ─── Live game variables (shared) ────────────────────────────────────
 * Every variable value, bound, and description on this page renders from
 * game_variables via trpc.game.listVariables. This hook returns the rows
 * as a Map keyed by variable key; the helpers below it are the only way
 * the simulators and reference sections read values. Numeric literals in
 * this file are fallbacks used while the query is in flight or when a row
 * is missing.
 */

function useGameVariables(): Map<string, GameVariable> {
  const { data: allVars = [] } = trpc.game.listVariables.useQuery(undefined, {
    staleTime: 60_000,
  });
  return useMemo(() => {
    const map = new Map<string, GameVariable>();
    for (const v of allVars as GameVariable[]) map.set(v.key, v);
    return map;
  }, [allVars]);
}

/** Numeric value of a variable, with a fallback while the query loads. */
function varNum(vars: Map<string, GameVariable>, key: string, fallback: number): number {
  const raw = vars.get(key)?.value;
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Slider bounds from minValue/maxValue, with literal fallbacks. */
function varBounds(
  vars: Map<string, GameVariable>,
  key: string,
  fallbackMin: number,
  fallbackMax: number,
): { min: number; max: number } {
  const row = vars.get(key);
  const min = row?.minValue == null ? NaN : Number(row.minValue);
  const max = row?.maxValue == null ? NaN : Number(row.maxValue);
  return {
    min: Number.isFinite(min) ? min : fallbackMin,
    max: Number.isFinite(max) ? max : fallbackMax,
  };
}

/** DB description for a variable's HelpTip. */
function varHelp(vars: Map<string, GameVariable>, key: string): string | undefined {
  return vars.get(key)?.description ?? undefined;
}

/** Percent display: fraction rows (0.05) and point rows (5) both read "5". */
function asPercent(n: number): number {
  const scaled = Math.abs(n) <= 1 ? n * 100 : n;
  return Math.round(scaled * 100) / 100;
}

/** Fraction form for sim math: point rows (15) become 0.15, fractions pass through. */
function asFraction(n: number): number {
  return Math.abs(n) > 1 ? n / 100 : n;
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

/* ─── Simulator state ────────────────────────────────────────────────── */

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

/** Simulator state before live variables arrive. Values here are only a
 * first-paint placeholder; the baseline itself comes from game_variables
 * (see GameSimulator). gratitudeRecipients and streakCycles are simulation
 * scenario inputs, not game variables, so they stay literal. */
function initialSimState(): SimState {
  return {
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
    claimThreshold: 1000,
  };
}

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
                    const helpText = v.description ?? "";
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
                                {formatValue(Number(v.value), v.valueType)}
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
  // Live variables drive the baseline. The literals inside varNum calls are
  // fallbacks for while the query is in flight or if a row is missing.
  const vars = useGameVariables();

  const baseline = useMemo<SimState>(
    () => ({
      questWeight: varNum(vars, "scoring.weights.quest_routine", 10),
      forumWeight: varNum(vars, "scoring.weights.forum_post", 5),
      trustMultiplierMin: varNum(vars, "trust.multiplier.min", 1.0),
      trustMultiplierMax: varNum(vars, "trust.multiplier.max", 3.0),
      // Sim math works in fractions; percentage rows may store points (15 = 15%).
      compostingDecay: asFraction(varNum(vars, "composting.decay_rate", 0.15)),
      harvestPoolSize: varNum(vars, "harvest.pool_size", 50000),
      gratitudeBudget: varNum(vars, "gratitude.budget_base", 100),
      // Simulation scenario inputs, not game variables.
      gratitudeRecipients: 10,
      streakCycles: 0,
      regenDistributionPool: varNum(vars, "gratitude.pool_per_cycle", 10000),
      claimThreshold: varNum(vars, "governance.claim_threshold_regen", 1000),
    }),
    [vars],
  );

  // Initial state can be loaded from URL hash (Permalinks, MEGA 5.6).
  const [sim, setSim] = useState<SimState>(() => {
    const base = initialSimState();
    if (typeof window === "undefined") return base;
    const hash = window.location.hash;
    if (hash.startsWith("#v1:")) {
      try {
        const decoded = JSON.parse(atob(hash.slice(4))) as Partial<SimState>;
        return { ...base, ...decoded };
      } catch { /* ignore bad hash */ }
    }
    return base;
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Re-seed untouched state with the live baseline once variables arrive.
  // Skipped when the visitor already moved a slider or came in through a
  // permalink hash, so their edits never get clobbered.
  const [seededFromDb, setSeededFromDb] = useState(false);
  useEffect(() => {
    if (seededFromDb || vars.size === 0) return;
    setSeededFromDb(true);
    const hasHash =
      typeof window !== "undefined" && window.location.hash.startsWith("#v1:");
    if (history.length === 0 && !hasHash) setSim(baseline);
  }, [seededFromDb, vars, baseline, history.length]);
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
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 pointer-coarse:min-h-11 rounded-lg text-xs border transition-colors ${
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 pointer-coarse:min-h-11 rounded-lg text-xs bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>
        <button
          onClick={reset}
          disabled={changeCount === 0}
          title="Reset every slider back to its current live value"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 pointer-coarse:min-h-11 rounded-lg text-xs bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
        <button
          onClick={copyPermalink}
          title="Copy a shareable URL that loads this exact simulator state"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 pointer-coarse:min-h-11 rounded-lg text-xs bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
        >
          <Link2 className="w-3.5 h-3.5" /> Copy link
        </button>
        <button
          onClick={copyAsForumPost}
          disabled={changeCount === 0}
          title="Copy a markdown block ready to paste into a forum thread or Hypha proposal"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 pointer-coarse:min-h-11 rounded-lg text-xs bg-[#7dd87d]/15 border border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/25 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Copy className="w-3.5 h-3.5" /> Copy as forum post
        </button>
        <button
          onClick={() => setShowHistory((s) => !s)}
          title="Review or revert any earlier slider move this session"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 pointer-coarse:min-h-11 rounded-lg text-xs bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 ml-auto"
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
          <p className="text-[10px] text-white/60 mt-2 px-2">
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
            help={varHelp(vars, "scoring.weights.quest_routine")}
            value={sim.questWeight}
            {...varBounds(vars, "scoring.weights.quest_routine", 1, 50)}
            step={1}
            onChange={update("questWeight")}
            trajectory={trajectories.questWeight}
            baseline={baseline.questWeight}
            ghost={ghostMap.questWeight}
            compare={compareMode}
          />
          <SliderRow
            label="Forum Points (per post)"
            help={varHelp(vars, "scoring.weights.forum_post")}
            value={sim.forumWeight}
            {...varBounds(vars, "scoring.weights.forum_post", 1, 30)}
            step={1}
            onChange={update("forumWeight")}
            trajectory={trajectories.forumWeight}
            baseline={baseline.forumWeight}
            ghost={ghostMap.forumWeight}
            compare={compareMode}
          />
          <SliderRow
            label="Trust Multiplier (min)"
            help={varHelp(vars, "trust.multiplier.min")}
            value={sim.trustMultiplierMin}
            {...varBounds(vars, "trust.multiplier.min", 0.5, 2.0)}
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
            help={varHelp(vars, "trust.multiplier.max")}
            value={sim.trustMultiplierMax}
            {...varBounds(vars, "trust.multiplier.max", 1.0, 5.0)}
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
            help={varHelp(vars, "composting.decay_rate")}
            value={sim.compostingDecay}
            {...varBounds(vars, "composting.decay_rate", 0, 0.5)}
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
            help={varHelp(vars, "harvest.pool_size")}
            value={sim.harvestPoolSize}
            {...varBounds(vars, "harvest.pool_size", 10000, 200000)}
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
            help={varHelp(vars, "gratitude.budget_base")}
            value={sim.gratitudeBudget}
            {...varBounds(vars, "gratitude.budget_base", 50, 200)}
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
            help={varHelp(vars, "gratitude.pool_per_cycle")}
            value={sim.regenDistributionPool}
            {...varBounds(vars, "gratitude.pool_per_cycle", 1000, 50000)}
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
            help={varHelp(vars, "governance.claim_threshold_regen")}
            value={sim.claimThreshold}
            {...varBounds(vars, "governance.claim_threshold_regen", 100, 1000)}
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
  const [dirty, setDirty] = useState(false);
  const [rationale, setRationale] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Baselines come from live game variables and arrive async. Until the
  // visitor drags a slider, keep the mini-sim synced to the fresh baseline
  // so a loaded value never reads as a proposed change.
  useEffect(() => {
    if (dirty) return;
    setState((prev) => {
      const same = variables.every((v) => prev[v.key] === v.baseline);
      return same
        ? prev
        : (Object.fromEntries(variables.map((v) => [v.key, v.baseline])) as Record<string, number>);
    });
  }, [variables, dirty]);

  const changedKeys = useMemo(
    () => variables.filter((v) => state[v.key] !== v.baseline),
    [variables, state],
  );

  const resetAll = useCallback(() => {
    setState(initial);
    setDirty(false);
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
                      <span className="text-white/60 line-through mr-1">{v.baseline}{v.unit ?? ""}</span>
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
                onValueChange={([val]) => {
                  setDirty(true);
                  setState((s) => ({ ...s, [v.key]: val }));
                }}
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
          className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/90 placeholder:text-white/60 focus:outline-none focus:border-[#7dd87d]/50 resize-none"
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
                <HelpTip text={v.description ?? ""} />
              </span>
              <span className="text-[#7dd87d] font-mono text-sm shrink-0">{formatValue(Number(v.value), v.valueType)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Learned demand factors */}
      <div>
        <h3 className="text-white/90 font-semibold mb-1">What the engine has learned</h3>
        <p className="text-white/60 text-xs mb-3 max-w-2xl">
          Demand factors per circle and size. Above 1 means that kind of bounty kept going unclaimed, so the reward
          rose. Precedent is the median of what similar work has actually paid.
        </p>
        {demandFactors.length === 0 ? (
          <p className="text-white/70 text-sm italic">No learned factors yet. The engine starts everything at 1.0x and calibrates as bounties are claimed and completed.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/60 text-left border-b border-white/10">
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
                    <td className="py-2 text-white/60">{d.sampleSize}</td>
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
            <span className="text-white/60"> ({fmtNum(Math.max(0, info.seasonBudget - info.committed))} available)</span>
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
          <p className="text-white/60 text-sm">Computing…</p>
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
  // Live variable rows keyed by variable key. Feeds the reference rows and
  // mini-simulators below; literals passed alongside are load-time fallbacks.
  const vars = useGameVariables();
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
                    ...varBounds(vars, "citizenship.co_creator.min_percentile", 10, 40),
                    step: 1,
                    baseline: varNum(vars, "citizenship.co_creator.min_percentile", 15),
                    help: varHelp(vars, "citizenship.co_creator.min_percentile"),
                  },
                  {
                    key: "citizenship.steward.min_percentile",
                    label: "Steward percentile threshold",
                    unit: "th",
                    ...varBounds(vars, "citizenship.steward.min_percentile", 40, 70),
                    step: 1,
                    baseline: varNum(vars, "citizenship.steward.min_percentile", 50),
                    help: varHelp(vars, "citizenship.steward.min_percentile"),
                  },
                  {
                    key: "citizenship.sage.min_percentile",
                    label: "Sage percentile threshold",
                    unit: "th",
                    ...varBounds(vars, "citizenship.sage.min_percentile", 70, 95),
                    step: 1,
                    baseline: varNum(vars, "citizenship.sage.min_percentile", 80),
                    help: varHelp(vars, "citizenship.sage.min_percentile"),
                  },
                  {
                    key: "citizenship.grace_period_days",
                    label: "Demotion grace period",
                    unit: " days",
                    ...varBounds(vars, "citizenship.grace_period_days", 7, 90),
                    step: 1,
                    baseline: varNum(vars, "citizenship.grace_period_days", 30),
                    help: varHelp(vars, "citizenship.grace_period_days"),
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
                      ...varBounds(vars, "scoring.weights.quest_routine", 1, 25),
                      step: 1,
                      baseline: varNum(vars, "scoring.weights.quest_routine", 10),
                      help: varHelp(vars, "scoring.weights.quest_routine"),
                    },
                    {
                      key: "scoring.weights.forum_post",
                      label: "Forum post points",
                      ...varBounds(vars, "scoring.weights.forum_post", 1, 15),
                      step: 1,
                      baseline: varNum(vars, "scoring.weights.forum_post", 5),
                      help: varHelp(vars, "scoring.weights.forum_post"),
                    },
                    {
                      key: "trust.multiplier.max",
                      label: "Max trust multiplier",
                      unit: "x",
                      ...varBounds(vars, "trust.multiplier.max", 1.5, 5.0),
                      step: 0.1,
                      baseline: varNum(vars, "trust.multiplier.max", 3.0),
                      help: varHelp(vars, "trust.multiplier.max"),
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
              Gratitude is the lunar-cycle pulse of the game. Every new moon your budget resets. Sending a thank-you
              is free and always will be: you acknowledge someone with a message, once per person per cycle. Your
              budget splits equally across everyone you acknowledge, and when the cycle closes, the $ReGen pool is
              distributed to the people who <em>received</em> gratitude, weighted by their senders' budgets. Every
              number below is live from the database; changing one changes the game.
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
                    value={varNum(vars, "gratitude.base_budget", 100).toLocaleString()}
                    detail="Same for all tiers, before multipliers"
                    help={varHelp(vars, "gratitude.base_budget")}
                  />
                  <GratVarRow
                    label="Full-Power Threshold"
                    value={`${varNum(vars, "gratitude.full_power_threshold", 10)} people`}
                    detail="Max impact per person"
                    help={varHelp(vars, "gratitude.full_power_threshold")}
                  />
                  <GratVarRow
                    label="Streak Bonus"
                    value={`+${asPercent(varNum(vars, "gratitude.streak_bonus_per_cycle", 0.03))}% / cycle`}
                    detail={`Max +${asPercent(varNum(vars, "gratitude.streak_bonus_max", 0.3))}%`}
                    help={varHelp(vars, "gratitude.streak_bonus_per_cycle")}
                  />
                  <GratVarRow
                    label="Sending"
                    value="Free"
                    detail="One acknowledgment per person per cycle"
                    help="Sending gratitude never costs you tokens and never mints them on the spot. It records your appreciation; the value flows to receivers when the cycle closes."
                  />
                </CardContent>
              </Card>

              {/* Tier Multipliers */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#d4a017]" />
                    Tier Budget Multipliers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <GratVarRow
                    label="Explorer"
                    value={`${varNum(vars, "gratitude.budget_multiplier.explorer", 1)}x`}
                    detail="Base budget"
                    help={varHelp(vars, "gratitude.budget_multiplier.explorer")}
                  />
                  <GratVarRow
                    label="Co-Creator"
                    value={`${varNum(vars, "gratitude.budget_multiplier.co_creator", 2)}x`}
                    detail="Double budget"
                    help={varHelp(vars, "gratitude.budget_multiplier.co_creator")}
                  />
                  <GratVarRow
                    label="Steward"
                    value={`${varNum(vars, "gratitude.budget_multiplier.steward", 3)}x`}
                    detail="Triple budget"
                    help={varHelp(vars, "gratitude.budget_multiplier.steward")}
                  />
                  <GratVarRow
                    label="Sage"
                    value={`${varNum(vars, "gratitude.budget_multiplier.sage", 5)}x`}
                    detail="Most weight in the game"
                    help={varHelp(vars, "gratitude.budget_multiplier.sage")}
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
                    value={`${varNum(vars, "gratitude.pool_per_cycle", 10000).toLocaleString()} ${vars.get("gratitude.pool_per_cycle")?.unit ?? "$ReGen"}`}
                    detail="Split by gratitude received"
                    help={varHelp(vars, "gratitude.pool_per_cycle")}
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
                    value={`${varNum(vars, "gratitude.trust_graph.received_weight", 0.10).toFixed(2)} / gratitude`}
                    detail="How much each gratitude nudges your multiplier"
                    help={varHelp(vars, "gratitude.trust_graph.received_weight")}
                  />
                  <GratVarRow
                    label="Max Bonus"
                    value={`+${varNum(vars, "gratitude.trust_graph.max_bonus", 0.5).toFixed(2)}`}
                    detail="Ceiling on trust graph snowball"
                    help={varHelp(vars, "gratitude.trust_graph.max_bonus")}
                  />
                  <GratVarRow
                    label="Composting Rate"
                    value={`${asPercent(varNum(vars, "trust.composting_rate", 5))}% / season`}
                    detail="Unused trust composts back"
                    help={varHelp(vars, "trust.composting_rate")}
                  />
                  <GratVarRow
                    label="Reciprocity"
                    value="Never required"
                    detail="Gratitude flows forward"
                    help="There is no send-back mechanic and no bonus for mutual exchange, by design. Gratitude is a gift, not a debt: acknowledge whoever moved you, and let what you receive arrive on its own."
                  />
                </CardContent>
              </Card>
            </div>
            <div className="max-w-2xl mx-auto mt-8">
              <MiniSectionSimulator
                sectionTitle="Gratitude System"
                variables={[
                  {
                    key: "gratitude.base_budget",
                    label: "Base budget per cycle",
                    ...varBounds(vars, "gratitude.base_budget", 10, 1000),
                    step: 10,
                    baseline: varNum(vars, "gratitude.base_budget", 100),
                    help: varHelp(vars, "gratitude.base_budget"),
                  },
                  {
                    key: "gratitude.pool_per_cycle",
                    label: "$ReGen pool per cycle",
                    unit: " $ReGen",
                    ...varBounds(vars, "gratitude.pool_per_cycle", 1000, 50000),
                    step: 1000,
                    baseline: varNum(vars, "gratitude.pool_per_cycle", 10000),
                    help: varHelp(vars, "gratitude.pool_per_cycle"),
                  },
                  {
                    key: "gratitude.claim_threshold",
                    label: "Claim threshold",
                    unit: " $ReGen",
                    ...varBounds(vars, "gratitude.claim_threshold", 100, 10000),
                    step: 50,
                    baseline: varNum(vars, "gratitude.claim_threshold", 1000),
                    help: varHelp(vars, "gratitude.claim_threshold"),
                  },
                  {
                    key: "gratitude.trust_graph.received_weight",
                    label: "Received weight (per gratitude)",
                    ...varBounds(vars, "gratitude.trust_graph.received_weight", 0.05, 0.30),
                    step: 0.01,
                    baseline: varNum(vars, "gratitude.trust_graph.received_weight", 0.10),
                    help: varHelp(vars, "gratitude.trust_graph.received_weight"),
                  },
                ]}
                summary={(s) => {
                  const base = s["gratitude.base_budget"];
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
                      detail={`Tunable multiplier (currently ${varNum(vars, "living_tree.flower_scale", 1.0).toFixed(1)}x)`}
                      help={varHelp(vars, "living_tree.flower_scale")}
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
                      ...varBounds(vars, "living_tree.trunk_max_width", 40, 240),
                      step: 5,
                      baseline: varNum(vars, "living_tree.trunk_max_width", 120),
                      help: varHelp(vars, "living_tree.trunk_max_width"),
                    },
                    {
                      key: "living_tree.longevity_threshold",
                      label: "Longevity threshold",
                      unit: " seasons",
                      ...varBounds(vars, "living_tree.longevity_threshold", 3, 20),
                      step: 1,
                      baseline: varNum(vars, "living_tree.longevity_threshold", 10),
                      help: varHelp(vars, "living_tree.longevity_threshold"),
                    },
                    {
                      key: "living_tree.flower_scale",
                      label: "Flower scale",
                      ...varBounds(vars, "living_tree.flower_scale", 0.5, 2.0),
                      step: 0.1,
                      baseline: varNum(vars, "living_tree.flower_scale", 1.0),
                      help: varHelp(vars, "living_tree.flower_scale"),
                    },
                    {
                      key: "living_tree.fruit_min_points",
                      label: "Fruit minimum points",
                      unit: " pts",
                      ...varBounds(vars, "living_tree.fruit_min_points", 10, 200),
                      step: 5,
                      baseline: varNum(vars, "living_tree.fruit_min_points", 50),
                      help: varHelp(vars, "living_tree.fruit_min_points"),
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
