/**
 * The deterministic Galley remix engine (Galley spec section 6d), pure and shared.
 *
 * Rules-based, no LLM. Given the ingredients a crew logged and a chosen track, it
 * scores every GALLEY_CARD by how much of the haul it can use, then renders the
 * top matches as named dishes built only from what the crew actually has. When the
 * haul is thin it suggests the two or three items to grab next.
 *
 * Lives in shared/ so BOTH the server (persisted remix in server/routes/ship.ts)
 * and the client (the logged-out "try it" remixer) run the exact same engine.
 * server/lib/galley-remix.ts re-exports this for existing server import paths.
 * Pure and unit tested (server/galley-remix.test.ts). No randomness.
 */
import {
  GALLEY_CARDS,
  INGREDIENT_ALIASES,
  SEASONAL_STAPLES,
  type GalleyCard,
  type GalleyCategory,
  type GalleyTrack,
} from "./galleyCards";

export type HaulItemInput = { name: string; note?: string | null; category?: string | null };

export type ComposedDish = {
  cardSlug: string;
  name: string;
  category: GalleyCategory;
  raw: boolean;
  base: string[];
  fillings: string[];
  toppings: string[];
  sauce: string[];
  method: string;
  why: string;
  /** Canonical ingredient tokens from the haul this dish uses. */
  matchedTokens: string[];
  score: number;
};

export type RemixResult = {
  track: GalleyTrack;
  dishes: ComposedDish[];
  /** Items to grab next, as friendly labels, when the haul is thin. */
  suggestions: string[];
  /** Canonical tokens the engine read out of the haul (for display + debugging). */
  haulTokens: string[];
};

// A base ingredient the crew has is worth more than a topping.
const BASE_WEIGHT = 2;
const OTHER_WEIGHT = 1;
// A dish needs at least this score to count as a real match rather than a stretch.
const REAL_MATCH_SCORE = 2;
// Below this many distinct haul tokens, we always offer things to grab next.
const THIN_HAUL_TOKENS = 4;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Precompiled surface-form matchers: each canonical token maps to a word-boundary
// regex per alias, so "pea" matches "pea" but not "peach", and "red onion" as a
// whole phrase still matches.
const MATCHERS: Array<{ token: string; regexes: RegExp[] }> = Object.entries(INGREDIENT_ALIASES).map(
  ([token, surfaces]) => ({
    token,
    regexes: surfaces.map((s) => new RegExp(`\\b${escapeRegExp(s.toLowerCase())}\\b`, "i")),
  }),
);

/**
 * Normalize a free ingredient string to the canonical tokens it contains.
 * "roma tomato" -> ["tomato"], "ripe watermelon slabs" -> ["watermelon"],
 * "lemon-tahini" -> ["lemon", "sesame"]. Pure and order-stable.
 */
export function tokenizeIngredient(text: string): string[] {
  if (!text) return [];
  const hay = text.toLowerCase();
  const out: string[] = [];
  for (const { token, regexes } of MATCHERS) {
    if (regexes.some((r) => r.test(hay))) out.push(token);
  }
  // "corn tortillas" is a cooked pantry item, not fresh corn. When the only corn
  // mention sits inside "corn tortilla(s)", drop the bare corn token so fresh corn
  // and the cooked-tortilla card do not cross-match.
  if (out.includes("corn tortillas") && out.includes("corn") && !/\bcorn\b(?!\s+tortilla)/i.test(hay)) {
    return out.filter((t) => t !== "corn");
  }
  return out;
}

/** Union of canonical tokens across a haul (item names and notes). */
export function haulTokens(items: HaulItemInput[]): Set<string> {
  const set = new Set<string>();
  for (const it of items) {
    for (const t of tokenizeIngredient(it.name ?? "")) set.add(t);
    if (it.note) for (const t of tokenizeIngredient(it.note)) set.add(t);
  }
  return set;
}

/** Keep the card entries whose tokens the haul can satisfy. */
function pickHave(entries: string[], have: Set<string>): { kept: string[]; tokens: string[] } {
  const kept: string[] = [];
  const tokens: string[] = [];
  for (const e of entries) {
    const ts = tokenizeIngredient(e);
    if (ts.some((t) => have.has(t))) {
      kept.push(e);
      for (const t of ts) if (have.has(t)) tokens.push(t);
    }
  }
  return { kept, tokens };
}

function titleCase(token: string): string {
  return token
    .split(/[-\s]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Name the dish in the ship's voice. Leads with a hero ingredient from the haul
 * when it is not already in the card name, else uses the card name as-is.
 */
function dishName(card: GalleyCard, heroToken: string | null): string {
  if (heroToken) {
    const hero = titleCase(heroToken);
    if (!card.name.toLowerCase().includes(heroToken.toLowerCase())) {
      return `${hero} ${card.name}`;
    }
  }
  return card.name;
}

function scoreCard(card: GalleyCard, have: Set<string>): { score: number; matched: Set<string> } {
  const matched = new Set<string>();
  let score = 0;
  const count = (entries: string[], weight: number) => {
    for (const e of entries) {
      const ts = tokenizeIngredient(e).filter((t) => have.has(t));
      if (ts.length) {
        score += weight;
        for (const t of ts) matched.add(t);
      }
    }
  };
  count(card.base, BASE_WEIGHT);
  count(card.fillings, OTHER_WEIGHT);
  count(card.toppings, OTHER_WEIGHT);
  count(card.sauce, OTHER_WEIGHT);
  return { score, matched };
}

function compose(card: GalleyCard, have: Set<string>, score: number): ComposedDish {
  const b = pickHave(card.base, have);
  const f = pickHave(card.fillings, have);
  const t = pickHave(card.toppings, have);
  const s = pickHave(card.sauce, have);
  // Always give the dish a base to build on, even if the match came from fillings.
  const base = b.kept.length ? b.kept : card.base;
  const matchedTokens = Array.from(new Set([...b.tokens, ...f.tokens, ...t.tokens, ...s.tokens]));
  const hero = matchedTokens[0] ?? null;
  return {
    cardSlug: card.slug,
    name: dishName(card, hero),
    category: card.category,
    raw: card.raw,
    base,
    fillings: f.kept,
    toppings: t.kept,
    sauce: s.kept,
    method: card.method,
    why: card.why,
    matchedTokens,
    score,
  };
}

/** Friendly labels for the items to grab next (seasonal staples the haul lacks). */
function grabSuggestions(have: Set<string>): string[] {
  return SEASONAL_STAPLES.filter((t) => !have.has(t)).slice(0, 3).map(titleCase);
}

/**
 * Remix a haul into 1 to `limit` dishes for the chosen track, plus grab-next
 * suggestions when the haul is thin. Cards are filtered by track (Reset takes
 * fully raw cards only), scored by haul overlap, and the best are composed from
 * what the crew has. Ties break by card order so results are stable.
 */
export function remixHaul(items: HaulItemInput[], track: GalleyTrack, limit = 3): RemixResult {
  const have = haulTokens(items);

  const eligible = GALLEY_CARDS.filter(
    (c) => c.tracks.includes(track) && (track !== "reset" || c.raw),
  );

  const ranked = eligible
    .map((card, index) => ({ card, index, ...scoreCard(card, have) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.index - b.index));

  const dishes = ranked.slice(0, Math.max(1, limit)).map((r) => compose(r.card, have, r.score));

  const bestScore = ranked[0]?.score ?? 0;
  const thin = have.size < THIN_HAUL_TOKENS || bestScore < REAL_MATCH_SCORE || dishes.length < 2;
  const suggestions = thin ? grabSuggestions(have) : [];

  return {
    track,
    dishes,
    suggestions,
    haulTokens: Array.from(have),
  };
}

/** Pick one valid remix at a random-free "roll" (index into the ranked dishes). */
export function rollRemix(items: HaulItemInput[], track: GalleyTrack, seed: number): ComposedDish | null {
  const { dishes } = remixHaul(items, track, GALLEY_CARDS.length);
  if (!dishes.length) return null;
  const idx = ((seed % dishes.length) + dishes.length) % dishes.length;
  return dishes[idx];
}
