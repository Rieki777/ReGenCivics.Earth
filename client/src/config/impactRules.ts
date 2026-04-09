/**
 * Declarative impact rules for the game simulator.
 *
 * Each rule belongs to a single variable. When the simulator sees a non-zero
 * delta for that variable, it walks the rules in order and renders the first
 * one whose threshold returns true.
 *
 * The template supports {pct}, {delta}, {absolute} placeholders that get
 * substituted by the simulator at render time.
 */
export type ImpactRule = {
  variable: string;
  threshold: (delta: number, baseline: number) => boolean;
  template: string;
  severity: "info" | "warn" | "positive";
};

export const IMPACT_RULES: ImpactRule[] = [
  // Harvest pool
  {
    variable: "harvestPoolSize",
    threshold: (d) => d >= 25_000,
    template: "A bigger harvest pool means each player's share grows. With this increase, top-tier players see roughly {pct} more in their season payout.",
    severity: "positive",
  },
  {
    variable: "harvestPoolSize",
    threshold: (d) => d <= -10_000,
    template: "Smaller harvest pool means smaller season payouts. Expect roughly {pct} less per player at the top tiers.",
    severity: "warn",
  },

  // Quest weight
  {
    variable: "questWeight",
    threshold: (d) => d > 0,
    template: "Quests now count {pct} more toward score. Players who quest a lot will climb tiers faster.",
    severity: "positive",
  },
  {
    variable: "questWeight",
    threshold: (d) => d < 0,
    template: "Quests count {pct} less. Forum activity becomes relatively more important.",
    severity: "warn",
  },

  // Forum weight
  {
    variable: "forumWeight",
    threshold: (d) => d > 0,
    template: "Forum posts count {pct} more. Conversation-heavy players will move up tiers faster.",
    severity: "positive",
  },

  // Composting decay
  {
    variable: "compostingDecay",
    threshold: (d) => d > 0,
    template: "Higher composting decay means old contributions fade faster. Recent activity matters more.",
    severity: "info",
  },
  {
    variable: "compostingDecay",
    threshold: (d) => d < 0,
    template: "Less decay rewards long-term contributors. Veteran players keep their accumulated weight longer.",
    severity: "positive",
  },

  // Gratitude budget
  {
    variable: "gratitudeBudget",
    threshold: (d) => d > 0,
    template: "Bigger gratitude budget. Each player can recognize {pct} more peers per cycle.",
    severity: "positive",
  },

  // Trust multiplier
  {
    variable: "trustMultiplierMax",
    threshold: (d) => d > 0,
    template: "Higher trust ceiling. Most-trusted players get an even bigger amplification on their score.",
    severity: "info",
  },
];

export type ImpactSummary = {
  variable: string;
  message: string;
  severity: "info" | "warn" | "positive";
  delta: number;
};

/**
 * Compute impact summaries for a set of variables given baseline + current.
 * Returns one summary per changed variable that has a matching rule.
 */
export function computeImpactSummaries(
  baseline: Record<string, number>,
  current: Record<string, number>,
): ImpactSummary[] {
  const results: ImpactSummary[] = [];
  for (const variable of Object.keys(current)) {
    const base = baseline[variable] ?? 0;
    const cur = current[variable] ?? 0;
    const delta = cur - base;
    if (delta === 0) continue;

    const rule = IMPACT_RULES.find((r) => r.variable === variable && r.threshold(delta, base));
    if (!rule) continue;

    const pct = base !== 0 ? `${Math.abs(Math.round((delta / base) * 100))}%` : `${Math.abs(delta)}`;
    const message = rule.template
      .replace(/\{pct\}/g, pct)
      .replace(/\{delta\}/g, String(delta))
      .replace(/\{absolute\}/g, String(cur));

    results.push({ variable, message, severity: rule.severity, delta });
  }
  return results;
}
