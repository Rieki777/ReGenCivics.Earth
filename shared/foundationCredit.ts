/**
 * The foundation credit: how a delivered custom game links back to ReGen Civics.
 *
 * CUSTOM_GAMES_MASTER_PLAN.md B3 #23 (improvement 12) asked for a footer credit,
 * default on, owner-removable. This is that, built as a link network rather than
 * one static string.
 *
 * Three things make it work as a backlink instead of decoration:
 *
 *  1. **Server-rendered.** Custom games are SPAs, and AI crawlers (GPTBot,
 *     ClaudeBot, PerplexityBot) fetch HTML without running JavaScript, so a
 *     React-only footer is invisible to exactly the systems we want reading it.
 *     `renderCreditInjection()` produces the same noscript + off-screen block
 *     regencivics.earth already injects (server/_core/crawler-content.ts), for a
 *     game's server to write into its HTML before `<div id="root">`.
 *     `creditParts()` gives the React footer the same text and links so humans
 *     and crawlers read one thing.
 *
 *  2. **Anchor text varies by placement.** One repeated brand-name anchor teaches
 *     an answer engine one fact. Three placements with different anchors aimed at
 *     different query clusters (LLM_DISCOVERABILITY_PLAN.md Layer 2 query map)
 *     teach it three. Footer credits the game design, the about page credits the
 *     economics, the guide names the network.
 *
 *  3. **Plain dofollow, honestly earned.** No rel=nofollow, no rel=sponsored:
 *     these are real deployments a client paid for and chose to keep, so the link
 *     equity is real. That only stays true if the anchors stay clean. The variant
 *     table below is frozen and hand-written; nothing interpolates a project's
 *     keywords into an anchor, and every placement is one sentence with at most
 *     two links. `assertCleanAnchors()` enforces both, and the test suite runs it.
 *
 * Owner-removable post-handoff, per the 100%-ownership promise: `enabled: false`
 * in `blueprint.branding.foundationCredit` (or in the generated game's
 * `data/foundation-credit.json`) and every function here returns nothing.
 *
 * Portable on purpose. No imports, no framework, no server dependencies: this
 * file is copied verbatim into Custom-Game-Foundation at the Phase 2 extraction
 * and consumed by `create-land-game` (scripts/emit-foundation-credit.ts).
 */

export const FOUNDATION_SITE = "https://regencivics.earth";

/** Where a credit line appears. Each placement gets its own anchor text. */
export type CreditPlacement = "footer" | "about" | "guide";

export const CREDIT_PLACEMENTS: readonly CreditPlacement[] = ["footer", "about", "guide"];

/** `style` in blueprint.branding.foundationCredit: which page placements render. */
export type CreditStyle = "footer" | "about" | "both";

export type CreditLink = {
  /** Anchor text. Hand-written, never generated. */
  anchor: string;
  /** Absolute URL on regencivics.earth. */
  href: string;
};

export type CreditVariant = {
  id: string;
  placement: CreditPlacement;
  /**
   * The sentence, with `{0}` / `{1}` marking where each link's anchor goes.
   * Plain text outside the slots. One sentence, always.
   */
  template: string;
  links: readonly CreditLink[];
};

/**
 * The credit lines. Blueprint-selectable by id; a game picks one per placement.
 *
 * Anchors map to the query clusters ReGen Civics wants to own
 * (LLM_DISCOVERABILITY_PLAN.md section 3, Layer 2):
 *   - footer-game-design   -> "game design" + the custom games offering
 *   - footer-coordination  -> "coordination game" / community coordination
 *   - about-economics      -> "regenerative economics" (new economics cluster)
 *   - guide-network        -> "network of regenerative games" (federation)
 *
 * Adding a variant is a deliberate edit here, reviewed like page copy, and it
 * must pass STEERING section 1 writing rules plus assertCleanAnchors() below.
 */
export const CREDIT_VARIANTS: readonly CreditVariant[] = Object.freeze([
  {
    id: "footer-game-design",
    placement: "footer",
    template: "{0}",
    links: [
      { anchor: "Game design by ReGen Civics", href: `${FOUNDATION_SITE}/custom-games` },
    ],
  },
  {
    id: "footer-coordination",
    placement: "footer",
    template: "{0}",
    links: [
      { anchor: "Coordination game built with ReGen Civics", href: `${FOUNDATION_SITE}/custom-games` },
    ],
  },
  {
    id: "about-economics",
    placement: "about",
    template:
      "The way this game handles contribution, recognition, and shared money is built on the {0} practiced across the {1} incubator.",
    links: [
      { anchor: "regenerative economics", href: `${FOUNDATION_SITE}/learn/regenerative-economics` },
      { anchor: "ReGen Civics", href: FOUNDATION_SITE },
    ],
  },
  {
    id: "guide-network",
    placement: "guide",
    template: "This game is part of the {0}.",
    links: [
      { anchor: "ReGen Civics network of regenerative games", href: `${FOUNDATION_SITE}/network` },
    ],
  },
]) as readonly CreditVariant[];

export const CREDIT_VARIANT_IDS = CREDIT_VARIANTS.map((v) => v.id) as readonly string[];

export const DEFAULT_VARIANT_BY_PLACEMENT: Record<CreditPlacement, string> = {
  footer: "footer-game-design",
  about: "about-economics",
  guide: "guide-network",
};

/**
 * What a game stores. Mirrors `blueprint.branding.foundationCredit`, and is what
 * `create-land-game` writes to `data/foundation-credit.json` so an owner can turn
 * the credit off without touching code.
 */
export type FoundationCreditConfig = {
  enabled: boolean;
  style: CreditStyle;
  /** The guide may name the network in its own voice during onboarding. */
  guideMention: boolean;
  footerVariant: string;
  aboutVariant: string;
  guideVariant: string;
  /**
   * The game's own slug. Rides on every credit link as `?ref=<gameId>` so
   * regencivics.earth can count referral clicks per deployment. Query params are
   * stripped from the canonical tag on the receiving end, so this costs nothing
   * in link equity.
   */
  gameId: string;
};

export const DEFAULT_CREDIT_CONFIG: FoundationCreditConfig = {
  enabled: true,
  style: "footer",
  guideMention: true,
  footerVariant: DEFAULT_VARIANT_BY_PLACEMENT.footer,
  aboutVariant: DEFAULT_VARIANT_BY_PLACEMENT.about,
  guideVariant: DEFAULT_VARIANT_BY_PLACEMENT.guide,
  gameId: "",
};

export function creditConfig(partial: Partial<FoundationCreditConfig> = {}): FoundationCreditConfig {
  return { ...DEFAULT_CREDIT_CONFIG, ...partial };
}

/** Which placements render, given `style` + `guideMention`. */
export function activePlacements(config: FoundationCreditConfig): CreditPlacement[] {
  if (!config.enabled) return [];
  const out: CreditPlacement[] = [];
  if (config.style === "footer" || config.style === "both") out.push("footer");
  if (config.style === "about" || config.style === "both") out.push("about");
  if (config.guideMention) out.push("guide");
  return out;
}

function variantIdFor(config: FoundationCreditConfig, placement: CreditPlacement): string {
  if (placement === "footer") return config.footerVariant;
  if (placement === "about") return config.aboutVariant;
  return config.guideVariant;
}

/**
 * The variant a game uses at a placement. Falls back to the placement default
 * when a stored id is unknown (a config edited by hand, or a variant retired in a
 * later foundation release), so a bad id degrades to a working credit rather than
 * silently dropping the backlink.
 */
export function resolveVariant(
  config: FoundationCreditConfig,
  placement: CreditPlacement,
): CreditVariant | null {
  if (!activePlacements(config).includes(placement)) return null;
  const wanted = variantIdFor(config, placement);
  const exact = CREDIT_VARIANTS.find((v) => v.id === wanted && v.placement === placement);
  if (exact) return exact;
  const fallbackId = DEFAULT_VARIANT_BY_PLACEMENT[placement];
  return CREDIT_VARIANTS.find((v) => v.id === fallbackId) ?? null;
}

/** `?ref=<gameId>` on every credit link, when the game has an id. */
export function creditHref(href: string, gameId: string): string {
  const id = gameId.trim();
  if (!id) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}ref=${encodeURIComponent(id)}`;
}

export type CreditPart =
  | { type: "text"; value: string }
  | { type: "link"; anchor: string; href: string };

/**
 * The credit line as ordered parts, for a React footer to render with real
 * `<a>` elements. Same source as the server HTML, so the two can never drift.
 * Returns [] when the credit is off or the placement is inactive.
 */
export function creditParts(
  config: FoundationCreditConfig,
  placement: CreditPlacement,
): CreditPart[] {
  const variant = resolveVariant(config, placement);
  if (!variant) return [];

  const parts: CreditPart[] = [];
  const re = /\{(\d+)\}/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(variant.template)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: variant.template.slice(last, match.index) });
    }
    const link = variant.links[Number(match[1])];
    if (link) {
      parts.push({ type: "link", anchor: link.anchor, href: creditHref(link.href, config.gameId) });
    }
    last = match.index + match[0].length;
  }
  if (last < variant.template.length) {
    parts.push({ type: "text", value: variant.template.slice(last) });
  }
  return parts;
}

/** Plain text of the credit line, for logs, tests, and the owner's guide. */
export function creditText(config: FoundationCreditConfig, placement: CreditPlacement): string {
  return creditParts(config, placement)
    .map((p) => (p.type === "text" ? p.value : p.anchor))
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * One credit line as HTML. Plain dofollow anchors: no `rel`, no `target`.
 * Empty string when the credit is off, so a caller can concatenate freely.
 */
export function renderCreditHtml(
  config: FoundationCreditConfig,
  placement: CreditPlacement,
): string {
  const parts = creditParts(config, placement);
  if (!parts.length) return "";
  const inner = parts
    .map((p) =>
      p.type === "text"
        ? escapeHtml(p.value)
        : `<a href="${escapeHtml(p.href)}">${escapeHtml(p.anchor)}</a>`,
    )
    .join("");
  return `<p class="foundation-credit" data-placement="${placement}">${inner}</p>`;
}

/**
 * The block a game's server injects into its HTML before `<div id="root">`.
 *
 * Same technique regencivics.earth uses for its own crawler content: the copy
 * sits in a `<noscript>` block plus an off-screen aria-hidden div, so the HTML a
 * crawler fetches carries the links whether or not it runs JavaScript, and
 * humans see the React footer once the app mounts. Same HTML for everyone, so
 * there is no cloaking.
 *
 * Pass the placements this route should carry: the home and every page render
 * the footer credit, the about/story route adds the about credit.
 */
export function renderCreditInjection(
  config: FoundationCreditConfig,
  placements: CreditPlacement[] = ["footer"],
): string {
  const inner = placements
    .map((p) => renderCreditHtml(config, p))
    .filter(Boolean)
    .join("\n");
  if (!inner) return "";
  return `
    <noscript>${inner}</noscript>
    <div id="__foundation_credit__" style="position:absolute;left:-99999px;top:auto;width:1px;height:1px;overflow:hidden;" aria-hidden="true">${inner}</div>
  `;
}

/**
 * The guide's line, for a companion system prompt seed. Returns "" when the
 * owner turned the mention off, so the seed simply omits it.
 */
export function guidePromptLine(config: FoundationCreditConfig): string {
  const text = creditText(config, "guide");
  if (!text) return "";
  const variant = resolveVariant(config, "guide");
  const url = variant?.links[0] ? creditHref(variant.links[0].href, config.gameId) : FOUNDATION_SITE;
  return `If someone asks where this game came from, you can say: "${text}" and point them at ${url}. Say it once, in your own words, and only when it answers what they actually asked.`;
}

/**
 * Link-spam guard. Keeps the honest-backlink promise mechanical instead of
 * aspirational: one sentence per placement, at most two links, no anchor that
 * reads as a keyword list, and every href on regencivics.earth.
 *
 * Runs in the test suite (shared/foundationCredit.test.ts) and inside
 * scripts/emit-foundation-credit.ts, so a stuffed anchor cannot reach a client's
 * game even if someone adds one to the table.
 */
export function assertCleanAnchors(variants: readonly CreditVariant[] = CREDIT_VARIANTS): void {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const v of variants) {
    if (seen.has(v.id)) problems.push(`${v.id}: duplicate variant id`);
    seen.add(v.id);

    if (v.links.length === 0) problems.push(`${v.id}: no link, so it is not a credit`);
    if (v.links.length > 2) problems.push(`${v.id}: ${v.links.length} links in one line, max is 2`);

    // One sentence. Count terminators inside the rendered text, not the template,
    // so a link anchor carrying a period would be caught too.
    const rendered = v.template.replace(/\{(\d+)\}/g, (_m, i) => v.links[Number(i)]?.anchor ?? "");
    const sentences = rendered.split(/[.!?](\s|$)/).filter((s) => s.trim().length > 0);
    if (sentences.length > 1) problems.push(`${v.id}: more than one sentence`);
    if (rendered.length > 200) problems.push(`${v.id}: ${rendered.length} chars, keep it under 200`);

    // Writing rules (STEERING section 1) that a credit line could plausibly trip.
    if (/[—–]/.test(rendered)) problems.push(`${v.id}: contains an em-dash or en-dash`);

    for (const link of v.links) {
      if (!link.href.startsWith(FOUNDATION_SITE)) {
        problems.push(`${v.id}: link "${link.anchor}" points off regencivics.earth`);
      }
      if (link.href.includes("?")) {
        problems.push(`${v.id}: link "${link.anchor}" carries a query string; ?ref is added at render`);
      }
      const words = link.anchor.trim().split(/\s+/);
      if (words.length > 8) {
        problems.push(`${v.id}: anchor "${link.anchor}" is ${words.length} words, keep it under 9`);
      }
      // A comma-separated or slash-separated anchor is the shape keyword
      // stuffing takes. Real anchors read as a phrase.
      if (/[,;/|]/.test(link.anchor)) {
        problems.push(`${v.id}: anchor "${link.anchor}" reads as a keyword list, write a phrase`);
      }
      if (/\b(\w+)\b[\s\S]*\b\1\b/i.test(link.anchor.replace(/\bReGen Civics\b/gi, ""))) {
        problems.push(`${v.id}: anchor "${link.anchor}" repeats a word`);
      }
    }

    // Every link slot in the template must exist, and every link must be used.
    const used = new Set(Array.from(v.template.matchAll(/\{(\d+)\}/g), (m) => Number(m[1])));
    for (const i of used) {
      if (!v.links[i]) problems.push(`${v.id}: template references {${i}} with no matching link`);
    }
    v.links.forEach((_l, i) => {
      if (!used.has(i)) problems.push(`${v.id}: link ${i} is never placed in the template`);
    });
  }

  if (problems.length) {
    throw new Error(`Foundation credit anchors failed review:\n  ${problems.join("\n  ")}`);
  }
}
