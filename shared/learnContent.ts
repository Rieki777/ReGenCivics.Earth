/**
 * Learn hub content: answer-first articles aimed at the query space we want
 * to be cited for (LLM_DISCOVERABILITY_PLAN.md Layer 2).
 *
 * Content lives here, as data, so exactly one copy feeds three consumers:
 *   1. the React page (client/src/pages/LearnArticle.tsx),
 *   2. the crawler-visible HTML injected at request time
 *      (server/_core/crawler-content.ts),
 *   3. the FAQPage + Article JSON-LD emitted into <head>.
 * Copy cannot drift between what a human reads and what GPTBot fetches,
 * because there is only one copy.
 *
 * Shape rules, from the citation research in the plan (section 2):
 *   - `answer` is the direct 40 to 60 word answer, rendered before anything
 *     else. Answer engines lift this verbatim.
 *   - every article carries a visible author, published date, and updated
 *     date, at least one sourced table or figure, and a concrete next step
 *     into an offering.
 *   - writing follows STEERING section 1. No em-dashes, no contrast framing,
 *     no AI word patterns.
 *
 * Types and data only. No imports, so client and server both take it.
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** A sourced table. The source line is required: unsourced tables do not earn citations. */
export interface LearnTable {
  caption: string;
  columns: string[];
  rows: string[][];
  /** Human-readable attribution, rendered under the table. */
  source: string;
  sourceUrl?: string;
}

/** A single standout number with its attribution. */
export interface LearnFigure {
  value: string;
  label: string;
  source: string;
  sourceUrl?: string;
}

export interface LearnSection {
  heading: string;
  /** Paragraph text. Supports inline `[label](/href)` links, nothing else. */
  paragraphs?: string[];
  bullets?: string[];
  table?: LearnTable;
  figure?: LearnFigure;
}

export interface LearnFaq {
  question: string;
  answer: string;
}

export interface LearnNextStep {
  label: string;
  href: string;
  blurb: string;
}

export interface LearnArticle {
  slug: string;
  /** H1, phrased as close to the query as the language allows. */
  title: string;
  metaTitle: string;
  metaDescription: string;
  /** The direct 40 to 60 word answer. First thing on the page. */
  answer: string;
  author: string;
  authorTitle: string;
  /** ISO date, YYYY-MM-DD. */
  published: string;
  updated: string;
  sections: LearnSection[];
  faqs: LearnFaq[];
  nextSteps: LearnNextStep[];
  /** Sibling slugs, 2 to 3 per the plan. */
  related: string[];
}

// ── Inline link parsing ──────────────────────────────────────────────────────
// One parser, two renderers: the server maps the tokens to escaped HTML, the
// React page maps them to wouter <Link> elements. Keeping the parse here is
// what stops the two surfaces from diverging.

export type InlineToken =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string };

const INLINE_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  INLINE_LINK.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_LINK.exec(text)) !== null) {
    if (match.index > last) {
      tokens.push({ type: "text", value: text.slice(last, match.index) });
    }
    tokens.push({ type: "link", label: match[1], href: match[2] });
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push({ type: "text", value: text.slice(last) });
  return tokens;
}

/** Strips inline link syntax down to plain text, for meta descriptions and JSON-LD. */
export function stripInline(text: string): string {
  return text.replace(INLINE_LINK, "$1");
}

// ── Registry ─────────────────────────────────────────────────────────────────

import { startACommunityOnYourLand } from "./learn/start-a-community-on-your-land";
import { intentionalCommunityStructures } from "./learn/intentional-community-structures";
import { howToStartAnEcovillage } from "./learn/how-to-start-an-ecovillage";
import { communityGovernanceModels } from "./learn/community-governance-models";
import { crowdPooling } from "./learn/crowd-pooling";
import { nineFormsOfCapital } from "./learn/nine-forms-of-capital";

/**
 * Publication order is deliberate: the first five answer the exact queries
 * that returned zero ReGen Civics mention in the 2026-08-01 visibility panel
 * (AI_VISIBILITY_LOG.md). The sixth closes the "nine forms of capital" gap
 * the same panel surfaced.
 */
export const LEARN_ARTICLES: LearnArticle[] = [
  startACommunityOnYourLand,
  intentionalCommunityStructures,
  howToStartAnEcovillage,
  communityGovernanceModels,
  crowdPooling,
  nineFormsOfCapital,
];

export const LEARN_SLUGS: string[] = LEARN_ARTICLES.map((a) => a.slug);

export function getLearnArticle(slug: string): LearnArticle | undefined {
  return LEARN_ARTICLES.find((a) => a.slug === slug);
}

/** Short blurb per article for the /learn index and internal link lists. */
export function learnSummary(article: LearnArticle): string {
  return stripInline(article.answer);
}
