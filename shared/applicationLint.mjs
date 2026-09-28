/**
 * Application draft lint: the pure core.
 *
 * Funding engine, Phase 1 (application kit). A draft that is one character over
 * a portal limit gets cut off mid-sentence; a draft that says "returns" breaks
 * gate G5; a draft that states a number nobody confirmed is how the site came to
 * claim eight times its real accounts. This checks all three, deterministically,
 * with no LLM (STEERING 11).
 *
 * Plain JavaScript for the same reason as shared/g5Rules.mjs: the CLI
 * (scripts/lint-application-draft.mjs) runs under plain node from the kit
 * folder, and the admin packet view imports it through applicationLint.d.mts.
 *
 * Hard rules (errors): over a character or word limit, a G5 phrase, a retired
 * claim, an em-dash or en-dash, an unresolved placeholder ([VERIFY], $X).
 * Unconfirmed numbers, AI words and contrast framing are warnings: context
 * decides.
 */
import { findG5, findRetired } from "./g5Rules.mjs";

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

/** STEERING section 1.3. Warnings, not failures: context decides. */
export const AI_WORDS = [
  "delve", "tapestry", "foster", "leverage", "it's worth noting", "in conclusion", "embark", "vibrant",
  "crucial", "groundbreaking", "transformative journey", "testament to", "beacon of", "unlock", "unleash",
  "seamless", "robust", "comprehensive", "cutting-edge", "empower", "utilize", "genuinely", "honestly",
  "straightforward",
];

/** STEERING section 1.2: contrast framing. */
export const CONTRAST_PATTERNS = [
  /\bnot\s+(?:just|only|merely)\b[^.\n]{0,60}\b(?:but|it's|it is)\b/i,
  /\bnot\s+[^,.\n]{1,40},\s*but\b/i,
  /\bisn't\s+about\b[^.\n]{0,60}\bit's\s+about\b/i,
  /\bless\s+\w+,\s*more\s+\w+/i,
];

/**
 * Placeholders a draft must never carry into a portal: the answer bank marks
 * unconfirmed facts [VERIFY ...] and open choices [DECIDE], and the ask is
 * written "$X on a post-money SAFE to reach [N] paying projects".
 */
export const PLACEHOLDER_PATTERNS = [
  /\[(?:VERIFY|DECIDE|TODO|TBD|TK)\b[^\]]*\]?/i,
  /\[[A-Z]\]/,
  /\$\[?[XYN]\]?(?![A-Za-z0-9])/,
];

/** Split a markdown draft into { order -> answer } by numbered headings. */
export function parseDraft(markdown) {
  const answers = new Map();
  let current = null;
  let buf = [];
  const flush = () => {
    if (current !== null) answers.set(current, buf.join("\n").trim());
  };
  for (const line of String(markdown).split(/\r?\n/)) {
    const m = /^#{2,4}\s*Q?\s*(\d+)\b/i.exec(line);
    if (m) {
      flush();
      current = Number(m[1]);
      buf = [];
      continue;
    }
    if (current === null) continue;
    if (line.trim().startsWith(">")) continue;
    buf.push(line);
  }
  flush();
  return answers;
}

/** Characters as a portal counts them: code points, newlines included. */
export function charCount(text) {
  return [...String(text)].length;
}

export function wordCount(text) {
  const t = String(text).trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Numbers that read as claims: $10K, 50+, 66, 12%, 1,200, 3.5M. Years and list numbers are skipped. */
export function extractNumbers(text) {
  const out = [];
  const re = /\$?\d[\d,]*(?:\.\d+)?\s?(?:%|[KMB]\b|k\b|\+)?/g;
  let m;
  while ((m = re.exec(String(text)))) {
    const raw = m[0].trim();
    const bare = raw.replace(/[$,%+KMBk\s]/g, "");
    if (!bare) continue;
    const n = Number(bare);
    if (/^(19|20)\d{2}$/.test(bare) && !raw.includes("$") && !raw.includes("%")) continue; // a year
    if (n < 10 && !raw.includes("$") && !raw.includes("%") && !raw.includes("+")) continue; // small counts read as words
    out.push(raw);
  }
  return out;
}

/** Normalize a number for comparison: "$10K" and "10,000" both become 10000. */
export function normalizeNumber(raw) {
  const s = String(raw).replace(/[$,\s+]/g, "");
  const pct = s.endsWith("%");
  const unit = /[KMBk]$/.exec(s)?.[0];
  let n = Number(s.replace(/[%KMBk]$/, ""));
  if (!Number.isFinite(n)) return null;
  if (unit === "K" || unit === "k") n *= 1_000;
  if (unit === "M") n *= 1_000_000;
  if (unit === "B") n *= 1_000_000_000;
  return pct ? `${n}%` : String(n);
}

/** A question's limits, from the seed JSON (snake_case) or a database row (camelCase). */
function limitsOf(question) {
  return {
    charLimit: question?.char_limit ?? question?.charLimit ?? null,
    wordLimit: question?.word_limit ?? question?.wordLimit ?? null,
  };
}

/** Lint one answer against one question. Pure. */
export function lintAnswer(question, answer, confirmedNumbers = new Set()) {
  const text = String(answer ?? "");
  const errors = [];
  const warnings = [];
  const chars = charCount(text);
  const words = wordCount(text);
  const { charLimit, wordLimit } = limitsOf(question);
  if (charLimit && chars > charLimit) {
    errors.push(`${chars} characters, limit ${charLimit} (cut ${chars - charLimit})`);
  }
  if (wordLimit && words > wordLimit) {
    errors.push(`${words} words, limit ${wordLimit} (cut ${words - wordLimit})`);
  }
  for (const v of findG5("draft.txt", text)) errors.push(`G5 ${v.claim}: "${v.match}"`);
  for (const v of findRetired("draft.txt", text)) errors.push(`retired claim: "${v.claim}"`);
  if (text.includes(EM_DASH)) errors.push("contains an em-dash");
  if (text.includes(EN_DASH)) errors.push("contains an en-dash");
  for (const re of PLACEHOLDER_PATTERNS) {
    const m = re.exec(text);
    if (m) errors.push(`unresolved placeholder: "${m[0].slice(0, 40)}"`);
  }
  const lower = text.toLowerCase();
  for (const w of AI_WORDS) if (lower.includes(w)) warnings.push(`AI word: "${w}"`);
  for (const re of CONTRAST_PATTERNS) {
    const m = re.exec(text);
    if (m) warnings.push(`contrast framing: "${m[0].slice(0, 60)}"`);
  }
  for (const raw of extractNumbers(text)) {
    const norm = normalizeNumber(raw);
    if (norm && !confirmedNumbers.has(norm)) warnings.push(`number not in confirmed metrics: ${raw}`);
  }
  return { chars, words, errors, warnings };
}

/** Confirmed numbers as a set of normalized strings, from metrics rows. */
export function confirmedNumberSet(rows) {
  const set = new Set();
  for (const r of rows ?? []) {
    for (const v of [r.display, r.displayValue, r.value, r.valueNumeric]) {
      if (v === null || v === undefined || v === "") continue;
      for (const raw of extractNumbers(String(v))) {
        const n = normalizeNumber(raw);
        if (n) set.add(n);
      }
      const direct = normalizeNumber(String(v));
      if (direct) set.add(direct);
    }
  }
  return set;
}
