/**
 * Deterministic theme extraction for gratitude summaries.
 *
 * The shareable gratitude card summarizes WHAT people keep thanking someone
 * for — as recurring themes, never quotes and never sender names. This is
 * fully deterministic (no LLM): each received message is matched against a
 * curated lexicon of theme -> keyword patterns, and themes are ranked by how
 * many distinct messages mention them.
 *
 * Why deterministic (Rye's call, 2026-07-03): gratitude messages are
 * untrusted user input. A frequency-over-lexicon approach cannot be
 * prompt-injected, costs nothing, renders instantly, and never invents a
 * claim the messages don't support. The tradeoff — it reads as themes, not
 * prose — is handled in the UI by letting the user edit the caption.
 */

export interface GratitudeTheme {
  key: string;
  label: string;
  /** Number of distinct messages that mention this theme. */
  count: number;
}

/**
 * Theme lexicon. Order is the tie-break priority (earlier = shown first when
 * counts are equal). Patterns are matched case-insensitively against word-ish
 * boundaries; keep them as stems so "welcome/welcomed/welcoming" all hit.
 * Labels are human, first-person-neutral phrases that read well on a card.
 */
export const THEME_LEXICON: Array<{ key: string; label: string; patterns: string[] }> = [
  { key: "welcoming", label: "welcoming newcomers", patterns: ["welcom", "made me feel", "belong", "first week", "greeted", "included me"] },
  { key: "holding_space", label: "holding space", patterns: ["held space", "holding space", "hold space", "presence", "safe space", "grounded us", "calm"] },
  { key: "clarity", label: "bringing clarity", patterns: ["clear", "clarity", "clarified", "made sense", "explained", "cut through", "articulat"] },
  { key: "generosity", label: "generosity", patterns: ["generous", "generosity", "gave so", "giving", "your time", "shared freely"] },
  { key: "listening", label: "deep listening", patterns: ["listen", "heard me", "made me feel seen", "you saw me", "understood", "held my"] },
  { key: "inspiration", label: "inspiring others", patterns: ["inspir", "motivat", "sparked", "lit a fire", "because of you i"] },
  { key: "wisdom", label: "wisdom", patterns: ["wisdom", "wise", "insight", "perspective", "guidance"] },
  { key: "kindness", label: "kindness", patterns: ["kind", "gentle", "caring", "compassion", "tender", "warmth"] },
  { key: "courage", label: "courage", patterns: ["courage", "brave", "bold", "stood up", "spoke up", "took a risk"] },
  { key: "helpfulness", label: "showing up to help", patterns: ["helped", "help me", "saved", "fixed", "supported", "stepped in", "had my back"] },
  { key: "leadership", label: "leadership", patterns: ["led ", "leadership", "organiz", "coordinat", "rallied", "brought us together"] },
  { key: "dedication", label: "hard work and dedication", patterns: ["hard work", "dedication", "effort", "put in the hours", "tireless", "commitment"] },
  { key: "healing", label: "healing", patterns: ["heal", "healing", "restored", "medicine", "made me whole"] },
  { key: "vision", label: "vision", patterns: ["vision", "big picture", "dream", "what's possible", "future"] },
  { key: "teaching", label: "teaching and mentoring", patterns: ["taught", "teaching", "mentor", "learned so much", "showed me how"] },
];

/** Strip code, urls, and @mentions so they can never seed a theme or leak. */
function normalize(message: string): string {
  return message
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/@[a-z0-9_-]+/g, " ")
    .replace(/[`*_>#]/g, " ");
}

/**
 * Extract ranked themes from a set of received gratitude messages.
 * A message contributes at most once to each theme it matches.
 */
export function extractThemes(messages: string[], limit = 5): GratitudeTheme[] {
  const counts = new Map<string, number>();
  for (const raw of messages) {
    if (!raw) continue;
    const text = normalize(raw);
    for (const theme of THEME_LEXICON) {
      if (theme.patterns.some((p) => text.includes(p))) {
        counts.set(theme.key, (counts.get(theme.key) ?? 0) + 1);
      }
    }
  }
  const order = new Map(THEME_LEXICON.map((t, i) => [t.key, i]));
  const labelOf = new Map(THEME_LEXICON.map((t) => [t.key, t.label]));
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: labelOf.get(key)!, count }))
    .sort((a, b) => b.count - a.count || (order.get(a.key)! - order.get(b.key)!))
    .slice(0, limit);
}

/** Validate/dedupe a list of theme keys against the lexicon (for the OG route). */
export function validThemeKeys(keys: string[]): string[] {
  const known = new Set(THEME_LEXICON.map((t) => t.key));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    if (known.has(k) && !seen.has(k)) { seen.add(k); out.push(k); }
  }
  return out;
}

export function labelForThemeKey(key: string): string | null {
  return THEME_LEXICON.find((t) => t.key === key)?.label ?? null;
}

/**
 * Template a warm one-line blurb from themes. Deliberately plain — the user
 * edits it before sharing. Grammar handles 1, 2, and 3+ theme cases.
 */
export function themeBlurb(themes: GratitudeTheme[]): string {
  const labels = themes.map((t) => t.label);
  if (labels.length === 0) return "People are grateful for who you are in this community.";
  if (labels.length === 1) return `People keep thanking you for ${labels[0]}.`;
  const last = labels[labels.length - 1];
  const head = labels.slice(0, -1).join(", ");
  return `People keep thanking you for ${head}, and ${last}.`;
}
