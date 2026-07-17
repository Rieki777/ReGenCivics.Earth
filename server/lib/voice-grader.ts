/**
 * Deterministic voice grader (the Harvest Phase 2; plan s8 "runs free on every
 * generated draft as a pre-filter, and only calls the LLM to fix a draft it
 * flags"). TypeScript twin of the vault's `_pipeline/voice_grader.py`, checking
 * the five hard publishing rules from STEERING section 1 / the Worldview Pack's
 * style_rules.json hard_rules. Zero tokens.
 */

export type VoiceFlag = { rule: string; detail: string };

const BANNED_VOCAB = [
  "delve", "tapestry", "foster", "leverage", "vibrant", "crucial",
  "groundbreaking", "transformative journey", "testament to", "beacon of",
  "unlock", "unleash", "seamless", "robust", "comprehensive", "cutting-edge",
  "empower", "utilize", "embark",
];

const CONTRAST_RES = [
  /\bnot (?:just |only |merely )?[^.,;]{2,40},?\s*but\b/i,
  /\bisn'?t about [^.,;]{2,60},\s*it'?s about\b/i,
  /\bless [a-z\- ]{2,30},\s*more [a-z\- ]{2,30}\b/i,
  /\bthis is not [^.,;]{2,40}[.,;]\s*(?:this is|it is|it'?s)\b/i,
];

/** The one rhetorical opener that is core to the brand and always allowed. */
const BRAND_QUESTION_RE = /^what if healing ourselves and our earth/i;

const RHETORICAL_OPENER_RE = /^(?:what if\b|have you ever\b|did you know\b|imagine if\b)/i;

const PASSIVE_INSPIRATION_RES = [
  /\bjoin us on this journey\b/i,
  /\bbe part of something bigger\b/i,
  /\btogether,? we can\b/i,
];

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
  return flags;
}
