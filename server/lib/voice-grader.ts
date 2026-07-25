/**
 * Deterministic voice grader (the Harvest Phase 2; plan s8 "runs free on every
 * generated draft as a pre-filter, and only calls the LLM to fix a draft it
 * flags"). TypeScript twin of the vault's `_pipeline/voice_grader.py`, checking
 * the hard publishing rules from STEERING section 1 / the Worldview Pack's
 * style_rules.json hard_rules. Zero tokens.
 *
 * Every rule here costs an LLM repair pass when it fires, so precision matters
 * more than coverage. Rules that flag good copy are worse than rules that miss
 * bad copy: the repair loop churns and Rye stops trusting the flags.
 */

export type VoiceFlag = { rule: string; detail: string };

const BANNED_VOCAB = [
  "delve", "tapestry", "foster", "leverage", "vibrant", "crucial",
  "groundbreaking", "transformative journey", "testament to", "beacon of",
  "unlock", "unleash", "seamless", "robust", "comprehensive", "cutting-edge",
  "empower", "utilize", "embark", "pivotal", "foundational",
];

/**
 * Words that are AI tells in their METAPHORICAL sense but legitimate here in
 * their literal one. ReGen does actual land work, so "the landscape recovered"
 * is real writing; "the funding landscape" is filler. The fantasy-illustrated
 * governance aesthetic makes a bare "realm" plausible too, so only "realm of"
 * is banned. Matching the phrase instead of the word keeps both usable.
 */
const METAPHOR_RES: Array<{ re: RegExp; hint: string }> = [
  {
    re: /\b(?:funding|investment|financial|technology|tech|political|media|regulatory|competitive|current|evolving|changing|shifting|broader|digital)\s+landscape\b/i,
    hint: "\"landscape\" as metaphor. Name the actual thing (the funders, the market, the rules).",
  },
  { re: /\brealm of\b/i, hint: "\"realm of\" is filler. Say where you mean." },
];

const CONTRAST_RES = [
  /\bnot (?:just |only |merely )?[^.,;]{2,40},?\s*but\b/i,
  /\bisn'?t about [^.,;]{2,60},\s*it'?s about\b/i,
  /\bless [a-z\- ]{2,30},\s*more [a-z\- ]{2,30}\b/i,
  /\bthis is not [^.,;]{2,40}[.,;]\s*(?:this is|it is|it'?s)\b/i,
  // The grand pronouncement, contracted: "This isn't a budget. It's a
  // statement of intent." The uncontracted form above misses it entirely.
  /\b(?:this|that|it)\s+(?:isn'?t|ain'?t|wasn'?t)\s+[^.,;]{2,40}[.;]\s*(?:it'?s|this is|that'?s|they'?re)\b/i,
];

/**
 * Assistant-voice phrases. These are the ones that give away a chat window:
 * throat-clearing openers and sign-offs that no one writes in a real post.
 */
const ASSISTANT_PHRASE_RES = [
  /\bhere'?s the thing\b/i,
  /\bhope this helps\b/i,
  /\bafter careful consideration\b/i,
  /\bi wanted to (?:provide|share|give|reach out|update|let you know)\b/i,
  /\bquick update\b/i,
  /\bit'?s worth noting\b/i,
  /\bat the end of the day\b/i,
  /\bin conclusion\b/i,
];

/** Sweeping claims about people that the source material never supports. */
const OVERSIMPLIFICATION_RES = [
  /\bmost people (?:don'?t|do not|think|believe|assume|never|aren'?t|are not)\b/i,
  /\b(?:everyone|everybody) (?:knows|agrees|wants|thinks)\b/i,
  /\bwe all know\b/i,
];

/**
 * Adverbs that read as generated. Deliberately narrow: common adverbs like
 * "simply" or "truly" appear in real speech, so only the ornamental ones are
 * flagged.
 */
const ADVERB_ABUSE = [
  "quietly", "effortlessly", "tirelessly", "deftly", "subtly",
  "meticulously", "painstakingly", "seamlessly",
];

/** The one rhetorical opener that is core to the brand and always allowed. */
const BRAND_QUESTION_RE = /^what if healing ourselves and our earth/i;

const RHETORICAL_OPENER_RE = /^(?:what if\b|have you ever\b|did you know\b|imagine if\b)/i;

const PASSIVE_INSPIRATION_RES = [
  /\bjoin us on this journey\b/i,
  /\bbe part of something bigger\b/i,
  /\btogether,? we can\b/i,
];

/** House cap: at most 2 hashtags anywhere, and usually none (Rye, 2026-07-24). */
export const MAX_HASHTAGS = 2;

/** Grade a draft against the hard rules. Empty array = publishable. */
export function gradeVoice(text: string): VoiceFlag[] {
  const flags: VoiceFlag[] = [];
  const trimmed = text.trim();

  if (/[—–]/.test(text)) {
    flags.push({ rule: "no-em-dashes", detail: "Contains an em-dash or en-dash. Use a comma, a period, a colon, or rewrite." });
  }
  for (const re of CONTRAST_RES) {
    const m = text.match(re);
    if (m) {
      flags.push({ rule: "no-contrast-framing", detail: `Contrast frame: "${m[0].slice(0, 60)}". Lead with the affirmative.` });
      break;
    }
  }
  const lower = text.toLowerCase();
  for (const word of BANNED_VOCAB) {
    const re = new RegExp(`\\b${word.replace(/[-\s]/g, "[-\\s]")}\\b`, "i");
    if (re.test(lower)) {
      flags.push({ rule: "no-ai-vocabulary", detail: `Banned word: "${word}". Swap it for something Rye would say.` });
    }
  }
  for (const { re, hint } of METAPHOR_RES) {
    const m = text.match(re);
    if (m) {
      flags.push({ rule: "no-ai-vocabulary", detail: `${hint} Found: "${m[0].slice(0, 60)}".` });
    }
  }
  for (const re of ASSISTANT_PHRASE_RES) {
    const m = text.match(re);
    if (m) {
      flags.push({ rule: "no-assistant-voice", detail: `Assistant phrase: "${m[0]}". Cut it and start with the thing itself.` });
      break;
    }
  }
  for (const re of OVERSIMPLIFICATION_RES) {
    const m = text.match(re);
    if (m) {
      flags.push({ rule: "no-oversimplification", detail: `Sweeping claim: "${m[0]}". Say who, or cut it.` });
      break;
    }
  }
  for (const word of ADVERB_ABUSE) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    if (re.test(lower)) {
      flags.push({ rule: "no-adverb-abuse", detail: `Ornamental adverb: "${word}". Let the verb carry it.` });
      break;
    }
  }
  if (RHETORICAL_OPENER_RE.test(trimmed) && !BRAND_QUESTION_RE.test(trimmed)) {
    flags.push({ rule: "no-rhetorical-openers", detail: "Opens with a rhetorical question. Start with the thing itself (the brand framing question is the one exception)." });
  }
  for (const re of PASSIVE_INSPIRATION_RES) {
    const m = text.match(re);
    if (m) {
      flags.push({ rule: "no-passive-inspiration", detail: `Passive inspiration: "${m[0]}". Say something specific.` });
      break;
    }
  }
  // Hashtags are counted, not banned: two is the ceiling, zero is the norm.
  const hashtags = text.match(/(^|\s)#[a-z0-9_]+/gi) ?? [];
  if (hashtags.length > MAX_HASHTAGS) {
    flags.push({ rule: "no-hashtag-spam", detail: `${hashtags.length} hashtags. The cap is ${MAX_HASHTAGS}, and most posts want none.` });
  }
  return flags;
}
