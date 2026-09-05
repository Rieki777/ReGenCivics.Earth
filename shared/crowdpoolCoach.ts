/**
 * Crowdpool Capital Coach: the deterministic core of the campaign design
 * assistant. Pure functions, no dependencies beyond the taxonomy, so both the
 * client wizard and the server AI endpoint can share one source of truth.
 *
 * What it does, all without an LLM:
 *   1. analyzeCoverage  - which of the nine capitals a draft covers, how well.
 *   2. recommendGaps    - what to consider adding, drawn from role templates,
 *                         phrased as recommendations a project can decline.
 *   3. valuationFor*     - fair-market value bands anchored to regional rate
 *                         data, so a custom-named need still gets a defensible
 *                         number. The AI companion explains the band; it never
 *                         invents the figure.
 *
 * Design rule: we encourage well-rounded projects, we never require them. Every
 * gap is a suggestion with a decline path. A padded registry of needs nobody
 * will steward is worse than an honest project that covers four capitals.
 */

import { CAPITAL_TYPES, type CapitalType } from "./capitals";
import {
  ROLE_TEMPLATES_BY_CAPITAL,
  CAPITAL_LABELS,
  type RoleTemplate,
} from "./crowdpoolingTaxonomy";

// ---------------------------------------------------------------------------
// Coverage analysis
// ---------------------------------------------------------------------------

export interface CoachNeedInput {
  capitalType?: CapitalType | string | null;
  estimatedValue?: number | null;
  kind?: string | null;
}

export type CapitalStrength = "none" | "thin" | "solid";

export interface CapitalCoverageEntry {
  capital: CapitalType;
  label: string;
  blurb: string;
  needCount: number;
  totalValue: number;
  covered: boolean;
  strength: CapitalStrength;
}

export interface CapitalCoverage {
  /** All nine capitals, always in CAPITAL_TYPES order. */
  entries: CapitalCoverageEntry[];
  coveredCount: number;
  missing: CapitalType[];
  thin: CapitalType[];
  /** 0-100. Rewards breadth first, then a little for depth. */
  roundednessScore: number;
  totalValue: number;
  totalNeeds: number;
}

function isCapital(value: unknown): value is CapitalType {
  return typeof value === "string" && (CAPITAL_TYPES as readonly string[]).includes(value);
}

/**
 * Reads a draft's needs and returns per-capital coverage plus an overall
 * roundedness score. A capital is "solid" at two or more needs, "thin" at one.
 */
export function analyzeCoverage(needs: CoachNeedInput[]): CapitalCoverage {
  const counts = new Map<CapitalType, { needCount: number; totalValue: number }>();
  for (const c of CAPITAL_TYPES) counts.set(c, { needCount: 0, totalValue: 0 });

  for (const need of needs) {
    const capital = isCapital(need.capitalType) ? need.capitalType : null;
    if (!capital) continue;
    const bucket = counts.get(capital)!;
    bucket.needCount += 1;
    bucket.totalValue += Math.max(0, Number(need.estimatedValue) || 0);
  }

  const entries: CapitalCoverageEntry[] = CAPITAL_TYPES.map((capital) => {
    const { needCount, totalValue } = counts.get(capital)!;
    const strength: CapitalStrength = needCount === 0 ? "none" : needCount === 1 ? "thin" : "solid";
    return {
      capital,
      label: CAPITAL_LABELS[capital].label,
      blurb: CAPITAL_LABELS[capital].blurb,
      needCount,
      totalValue,
      covered: needCount > 0,
      strength,
    };
  });

  const coveredCount = entries.filter((e) => e.covered).length;
  const missing = entries.filter((e) => e.strength === "none").map((e) => e.capital);
  const thin = entries.filter((e) => e.strength === "thin").map((e) => e.capital);
  const solidCount = entries.filter((e) => e.strength === "solid").length;

  // Breadth is most of the score (covering a capital at all is the win); depth
  // adds a smaller bonus so a project is nudged from thin toward solid.
  const breadth = (coveredCount / CAPITAL_TYPES.length) * 80;
  const depth = (solidCount / CAPITAL_TYPES.length) * 20;
  const roundednessScore = Math.round(breadth + depth);

  return {
    entries,
    coveredCount,
    missing,
    thin,
    roundednessScore,
    totalValue: entries.reduce((sum, e) => sum + e.totalValue, 0),
    totalNeeds: entries.reduce((sum, e) => sum + e.needCount, 0),
  };
}

// ---------------------------------------------------------------------------
// Gap recommendations
// ---------------------------------------------------------------------------

export interface GapRecommendation {
  capital: CapitalType;
  label: string;
  blurb: string;
  /** Why this fits, phrased against what the project already has. */
  reason: string;
  /** One or two concrete roles they could hold, from the templates. */
  suggestedRoles: RoleTemplate[];
  /** Always true: the project can mark this "not applicable to us". */
  dismissable: true;
}

/**
 * Suggests capitals to consider filling, missing ones first, then thin ones.
 * Each suggestion carries a couple of concrete roles and a reason grounded in
 * what the project already covers. Recommendations only, never requirements.
 */
export function recommendGaps(
  coverage: CapitalCoverage,
  opts: { max?: number } = {},
): GapRecommendation[] {
  const max = opts.max ?? 3;
  const coveredLabels = coverage.entries
    .filter((e) => e.covered)
    .map((e) => e.label.toLowerCase());
  const haveContext =
    coveredLabels.length > 0
      ? `You already cover ${listPhrase(coveredLabels)}.`
      : `You have not added any needs yet.`;

  const order: CapitalType[] = [...coverage.missing, ...coverage.thin];

  return order.slice(0, max).map((capital) => {
    const isMissing = coverage.missing.includes(capital);
    const label = CAPITAL_LABELS[capital].label;
    const blurb = CAPITAL_LABELS[capital].blurb;
    const roles = (ROLE_TEMPLATES_BY_CAPITAL[capital] ?? []).slice(0, 2);
    const reason = isMissing
      ? `${haveContext} A project like yours often holds ${label.toLowerCase()} capital too, and right now it is the gap. If it fits your work, ${roles[0] ? `someone like a ${roles[0].title.toLowerCase()} would fill it` : "consider adding a role here"}.`
      : `You have one need under ${label.toLowerCase()} capital. Adding one more would make it solid, so the work does not rest on a single person.`;
    return { capital, label, blurb, reason, suggestedRoles: roles, dismissable: true as const };
  });
}

function listPhrase(items: string[]): string {
  if (items.length === 0) return "nothing yet";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Fair-market valuation bands
// ---------------------------------------------------------------------------

export type ValueBasis = "role-hours" | "land-area" | "reference" | "none";

export interface ValuationBand {
  low: number;
  mid: number;
  high: number;
  basis: ValueBasis;
  /** Plain-language explanation of where the band comes from. */
  note: string;
}

/**
 * Compact hourly-rate reference by region, mirroring the fuller table in
 * client/src/data/regionalCostData.ts so this shared module has no client
 * dependency. Tiers: unskilled, skilled, professional. Values in USD.
 */
const REGION_HOURLY_RATES: Record<
  string,
  { unskilled: number; skilled: number; professional: number }
> = {
  "north america": { unskilled: 15, skilled: 30, professional: 65 },
  "central america": { unskilled: 5, skilled: 12, professional: 25 },
  "south america": { unskilled: 6, skilled: 15, professional: 30 },
  europe: { unskilled: 18, skilled: 35, professional: 75 },
  africa: { unskilled: 4, skilled: 10, professional: 20 },
  asia: { unskilled: 7, skilled: 18, professional: 40 },
  oceania: { unskilled: 20, skilled: 40, professional: 80 },
};

/** Global fallback when no region is given (a middle-of-the-road blend). */
const DEFAULT_HOURLY = { unskilled: 12, skilled: 25, professional: 50 };

/** Per-hectare land price by region, USD, mirroring regionalCostData. */
const REGION_LAND_PER_HECTARE: Record<string, number> = {
  "north america": 15000,
  "central america": 5000,
  "south america": 3000,
  europe: 25000,
  africa: 2000,
  asia: 8000,
  oceania: 12000,
};
const DEFAULT_LAND_PER_HECTARE = 10000;

function ratesForRegion(region?: string | null) {
  if (!region) return DEFAULT_HOURLY;
  const key = region.trim().toLowerCase();
  for (const name of Object.keys(REGION_HOURLY_RATES)) {
    if (key.includes(name) || name.includes(key)) return REGION_HOURLY_RATES[name];
  }
  return DEFAULT_HOURLY;
}

function landPerHectareForRegion(region?: string | null): number {
  if (!region) return DEFAULT_LAND_PER_HECTARE;
  const key = region.trim().toLowerCase();
  for (const name of Object.keys(REGION_LAND_PER_HECTARE)) {
    if (key.includes(name) || name.includes(key)) return REGION_LAND_PER_HECTARE[name];
  }
  return DEFAULT_LAND_PER_HECTARE;
}

/** Which rate tier a capital's roles usually sit in. */
const CAPITAL_RATE_TIER: Record<CapitalType, "unskilled" | "skilled" | "professional"> = {
  intellectual: "professional",
  financial: "professional",
  spiritual: "professional",
  cultural: "skilled",
  social: "skilled",
  health: "skilled",
  experiential: "skilled",
  living: "skilled",
  material: "skilled",
};

function band(mid: number, spread = 0.25): { low: number; high: number } {
  return { low: Math.round(mid * (1 - spread)), high: Math.round(mid * (1 + spread)) };
}

/**
 * Values a role need from hours, weeks, and a fair hourly rate. If an explicit
 * rate is passed it anchors the band; otherwise the rate comes from the
 * capital's usual tier in the given region. The band is the mid plus or minus
 * a quarter, so a contributor and a steward have room to agree.
 */
export function valuationForRole(input: {
  capital?: CapitalType | string | null;
  hoursPerWeek: number;
  weeks: number;
  region?: string | null;
  hourlyRate?: number | null;
}): ValuationBand {
  const hours = Math.max(0, Number(input.hoursPerWeek) || 0);
  const weeks = Math.max(0, Number(input.weeks) || 0);
  const capital = isCapital(input.capital) ? input.capital : null;
  const tier = capital ? CAPITAL_RATE_TIER[capital] : "skilled";
  const rates = ratesForRegion(input.region);
  const rate = input.hourlyRate && input.hourlyRate > 0 ? input.hourlyRate : rates[tier];
  const mid = Math.round(hours * weeks * rate);
  const { low, high } = band(mid);
  const regionNote = input.region ? ` in ${input.region}` : "";
  return {
    low,
    high,
    mid,
    basis: "role-hours",
    note: `${hours} hours a week for ${weeks} weeks at about $${rate}/hour${regionNote}. Similar roles run $${low.toLocaleString()} to $${high.toLocaleString()}.`,
  };
}

/** Values a land contribution from area and a regional per-hectare price. */
export function valuationForLand(input: {
  hectares: number;
  region?: string | null;
}): ValuationBand {
  const hectares = Math.max(0, Number(input.hectares) || 0);
  const perHa = landPerHectareForRegion(input.region);
  const mid = Math.round(hectares * perHa);
  const { low, high } = band(mid, 0.35);
  const regionNote = input.region ? ` in ${input.region}` : "";
  return {
    low,
    high,
    mid,
    basis: "land-area",
    note: `${hectares} hectares at about $${perHa.toLocaleString()}/hectare${regionNote}. Comparable land runs $${low.toLocaleString()} to $${high.toLocaleString()}.`,
  };
}

/**
 * Wraps a figure the user already has into a plus-or-minus band for review.
 *
 * `symbol` defaults to a dollar sign so every existing caller keeps its current
 * output. Pass the campaign's own symbol where one is known: a campaign
 * denominated in francs was showing a person their pledge range in dollars,
 * measured live on a euro campaign where "$3,500" sat among euro figures on the
 * same page.
 */
export function valuationBandForValue(value: number, spread = 0.25, symbol = "$"): ValuationBand {
  const mid = Math.max(0, Math.round(Number(value) || 0));
  const { low, high } = band(mid, spread);
  return {
    low,
    high,
    mid,
    basis: mid > 0 ? "reference" : "none",
    note:
      mid > 0
        ? `A fair range around this figure is ${symbol}${low.toLocaleString()} to ${symbol}${high.toLocaleString()}.`
        : `Add an estimated value and the coach will suggest a fair range.`,
  };
}

/**
 * A single teaching tip per wizard step, drawn from the crowdfunding research.
 * The wizard shows one at a time so applicants learn as they build.
 */
export const STEP_TIPS: Record<string, string> = {
  land: "Land you already hold still counts. Listing it at fair value shows the whole picture of what the project is built on.",
  equipment:
    "A tool lent for a season is worth listing. Borrowing beats buying, and it gives a neighbor a way to help without spending.",
  roles:
    "Spread your asks: a few small, a few medium, a few large. Everyone should find a way in, whether they have an hour or a season.",
  otherNeeds:
    "Name the specific thing. `40 cedar posts` recruits. `Materials wanted` does not. The clearer the need, the faster it fills.",
  capitals:
    "Well-rounded projects draw well-rounded support. If a capital is thin, consider one role there, but only if it genuinely fits your work.",
  financial:
    "Crypto is tracked here. For cash, we recommend Ma Earth for donations and GoSteward for loans, and you link those after you launch.",
};
