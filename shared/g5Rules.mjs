/**
 * Gate G5: the one rulebook for language that promises or prices upside.
 *
 * Plain JavaScript on purpose. Three places read it and one of them cannot run
 * TypeScript: scripts/check-fund-claims.mjs runs under plain `node` in CI; the
 * application draft linter (scripts/lint-application-draft.mjs) runs from a
 * folder with no build step; and the app (server and /admin/funding) imports it
 * through shared/g5Rules.d.mts. One copy means a phrase banned on the site is
 * banned in every draft, and the other way round.
 *
 * Why these rules exist: FUNDING_ENGINE_PLAN v1.2 gate G5 and ADR-62. A
 * purchasing cooperative keeps its "bought for use" footing only while nothing
 * in the funnel promises upside (United Housing Foundation v. Forman, 1975).
 * The fixed retired-string list could never catch a sentence like "Target
 * returns of 8 to 12% annually", which lived on the site for two years.
 *
 * Suppression: `fund-claims-allow: <reason>` on the same line or the line above.
 */

// ── Retired claims ───────────────────────────────────────────────────────────
// Case-insensitive plain substrings: sentences people write, not patterns.
export const RETIRED = [
  "Alliance Fund",
  "Regenerative Land Fund",
  "506(c)",
  "506(b)",
  "Reg D",
  "Regulation D",
  "fund is open",
  "Fund I opens",
  "legal presence across",
  "is a venture fund",
  "Offered pursuant",
  "pools capital from accredited",
  // 2026-09-27: the fund is now a cooperative in design (shared/fund.ts).
  "ReGen Civics Fund",
  "fund is in formation",
  "fund in formation",
];

// ── G5 phrase rules ──────────────────────────────────────────────────────────
// Each rule: a label for the report and a global regex. Most are
// case-insensitive; the acronyms (IRR, ROI, LP) are case-sensitive so ordinary
// words and identifiers never trip them.
const L = "(?<![A-Za-z0-9_])"; // left word edge that also treats _ as a word char
const R = "(?![A-Za-z0-9_])";

export const G5_RULES = [
  { label: "IRR", re: new RegExp(`${L}IRR${R}`, "g") },
  { label: "ROI", re: new RegExp(`${L}ROI${R}`, "g") },
  {
    label: "returns (financial)",
    re: /\b(target(?:ed)?|expected|projected|annual(?:i[sz]ed|ly)?|net|blended|financial|investor|healthy|durable|base[- ]case|cash|total|preferred|equity|portfolio|fund)\s+returns?\b/gi,
  },
  { label: "return on investment", re: /\breturns?\s+(?:of|on)\s+(?:investment|capital)\b/gi },
  { label: "returns flow", re: /\breturns?\s+(?:come|comes|flow|flows|accrue|accrues|are\s+designed|generated)\b/gi },
  {
    label: "percent near a return word",
    // "returns" is plural only: the singular is the JavaScript keyword far more
    // often than a financial return (return { text: "0%" }).
    re: /\d[\d.,]*\s*(?:%|percent)[^.\n]{0,40}?\b(?:returns|IRR|yields?|appreciation|annually|per\s+annum|distributions?|dividends?)\b|\b(?:returns|IRR|yields?|appreciation|distributions?|dividends?)\b[^.\n]{0,40}?\d[\d.,]*\s*(?:%|percent)/gi,
  },
  {
    label: "yield",
    re: /\b(?:cash|staking|annual|target(?:ed)?|current|dividend|investor|financial|ongoing|additional)\s+yields?\b|\byield\s+farming\b|\bstake\s+for\s+yield\b/gi,
  },
  {
    label: "appreciation",
    re: /\b(?:token|land|asset|equity|price|value|capital)\s+(?:value\s+)?appreciation\b|\bappreciating\s+(?:assets?|land|regenerative\s+land)\b/gi,
  },
  {
    label: "exchange listing",
    re: /\b(?:exchange|token|secondary[- ]market)\s+listings?\b|\blisted\s+on\s+(?:crypto\s+)?exchanges?\b|\blist(?:ed|ing)?\s+on\s+(?:coinbase|kraken|binance)\b|\blistings?\s+on\s+(?:coinbase|kraken|binance)\b/gi,
  },
  { label: "secondary market", re: /\bsecondary\s+markets?\b/gi },
  { label: "index fund", re: /\bindex\s+(?:fund|token)s?\b/gi },
  { label: "direct investment", re: /\bdirect(?:ly)?\s+invest(?:ment|ments|ing|s)?\b|\binvest(?:ing)?\s+directly\b/gi },
  {
    label: "invest in land projects",
    re: /\binvest(?:s|ing|ment|ments)?\s+(?:in|into|through)\s+(?:regenerative\s+)?(?:land\b|land\s+projects?|the\s+(?:regenerative\s+)?(?:fund|movement|transition|renaissance)|the\s+reGen\s+civics|reGen\s+civics|us\b)/gi,
  },
  {
    label: "investment offer",
    re: /\b(?:investment\s+(?:opportunit(?:y|ies)|vehicles?|thesis|minimums?|process|memo)|investable\s+(?:asset|vehicle|projects?)|minimum\s+(?:investment|commitment)s?)\b/gi,
  },
  { label: "accredited investor", re: /\baccredited\s+investors?\b/gi },
  {
    label: "fund terms",
    re: /\b(?:carried\s+interest|preferred\s+return|management\s+fees?|limited\s+partners?|general\s+partners?|subscription\s+agreements?|private\s+placement|capital\s+calls?|net\s+asset\s+value|tender\s+offers?|redemption\s+windows?)\b/gi,
  },
  { label: "LP", re: new RegExp(`${L}LPs?${R}`, "g") },
  { label: "Fund I / II / III", re: /\bFund\s+(?:I{1,3}|IV)\b/g },
  {
    label: "land-backed security",
    re: /\bland[- ]backed\s+(?:securit(?:y|ies)|investments?|collateral|financial|stablecoins?)\b/gi,
  },
  {
    label: "distributions to holders",
    re: /\b(?:quarterly|profit|cash|portfolio|fund)\s+distributions?\b|\bdistributions?\s+(?:to|for)\s+(?:investors|token\s+holders|holders|LPs)\b|\bshare\s+in\s+(?:the\s+)?profits\b|\bclaim\s+on\s+(?:fund\s+)?(?:returns|distributions|profits)\b/gi,
  },
  { label: "tokens for money", re: /\bexchange[d]?\s+(?:them\s+)?for\s+USD\b|\b(?:sell|trade)\s+(?:your\s+)?tokens\b/gi },
  { label: "venture fund", re: /\bventure(?:\s+capital)?\s+fund\b/gi },
  { label: "investment fund", re: /\binvestment\s+funds?\b/gi },
  {
    label: "portfolio",
    re: /\b(?:diversified|land|project|investment|fund)\s+portfolio\b|\bportfolio\s+(?:of\s+land|returns|distributions|value|construction|strategy|companies)\b|\b(?:in|into|across)\s+(?:our|the)\s+portfolio\b/gi,
  },
  { label: "asset class", re: /\basset\s+class\b/gi },
  {
    label: "liquidity promise",
    re: /\b(?:investor|token|progressive|exit)\s+liquidity\b|\bliquidity\s+(?:pools?|events?|windows?|pathways?)\b/gi,
  },
  { label: "token price", re: /\btoken\s+price\b|\bcurrently\s+valued\s+at\s+\$/gi },
];

// ── Traction numbers ─────────────────────────────────────────────────────────
export const TRACTION_RULE = {
  label: "traction number",
  // Longer alternatives first, so the report quotes the whole phrase.
  re: /\b\d[\d,]*\+?\s+(?:active\s+)?(?:players|members|land\s+projects|alliance\s+(?:partner\s+organi[sz]ations|partners?|organi[sz]ations|orgs)|participants|organi[sz]ations|bioregional\s+hubs|quests(?:\s+completed)?)\b/gi,
};

// ── Matching ─────────────────────────────────────────────────────────────────
const ALLOW = "fund-claims-allow:";
const CODE_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

/** Acronym rules whose match is skipped when it is exactly a quoted literal. */
const LITERAL_EXEMPT = new Set(["IRR", "ROI", "LP"]);

function toPosix(p) {
  return String(p).split("\\").join("/");
}

function isCodeFile(rel) {
  return CODE_EXT.some((e) => rel.endsWith(e));
}

/** True when the line, or the one above it, carries an allow comment. */
function allowed(lines, i) {
  return lines[i].includes(ALLOW) || (i > 0 && lines[i - 1].includes(ALLOW));
}

/**
 * Line indexes that are comments in a code file: // lines, lines inside a
 * block comment, and JSDoc continuation lines. Prose (md, txt, html, drafts)
 * has no comments to skip: a markdown list item starting with "*" is content.
 */
function commentLines(rel, lines) {
  const skip = new Set();
  if (!isCodeFile(rel)) return skip;
  let inBlock = false;
  lines.forEach((raw, i) => {
    const t = raw.trim();
    if (inBlock) {
      skip.add(i);
      if (t.includes("*/")) inBlock = false;
      return;
    }
    if (t.startsWith("//") || t.startsWith("*")) {
      skip.add(i);
      return;
    }
    if (t.startsWith("/*") || t.startsWith("{/*")) {
      skip.add(i);
      if (!t.includes("*/")) inBlock = true;
    }
  });
  return skip;
}

/** True when the match is the whole of a quoted literal: 'IRR' (the Iranian rial's currency code). */
function isWholeLiteral(line, start, end) {
  const before = line[start - 1];
  const after = line[end];
  return (before === "'" || before === '"' || before === "`") && after === before;
}

function runRules(rel, text, rules) {
  const lines = String(text).split(/\r?\n/);
  const skip = commentLines(rel, lines);
  const out = [];
  lines.forEach((line, i) => {
    if (skip.has(i) || allowed(lines, i)) return;
    for (const rule of rules) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line))) {
        const start = m.index;
        const end = start + m[0].length;
        const literal = LITERAL_EXEMPT.has(rule.label) && isWholeLiteral(line, start, end);
        if (!literal) out.push({ line: i + 1, claim: rule.label, match: m[0], text: line.trim().slice(0, 160) });
        if (m[0].length === 0) rule.re.lastIndex++;
      }
    }
  });
  return out;
}

/** Retired claims in one file or text. Returns [{ line, claim, text }]. */
export function findRetired(rel, text) {
  const lines = String(text).split(/\r?\n/);
  const out = [];
  lines.forEach((line, i) => {
    if (allowed(lines, i)) return;
    const lower = line.toLowerCase();
    for (const claim of RETIRED) {
      if (lower.includes(claim.toLowerCase())) {
        out.push({ line: i + 1, claim, text: line.trim().slice(0, 160) });
      }
    }
  });
  return out;
}

/** G5 phrases in one file or text. `rel` decides code-comment skipping. */
export function findG5(rel, text) {
  return runRules(toPosix(rel), text, G5_RULES);
}

/** Hardcoded traction numbers in one file or text. */
export function findTraction(rel, text) {
  return runRules(toPosix(rel), text, [TRACTION_RULE]);
}

/** Everything a piece of prose trips: retired claims and G5 phrases. */
export function lintProse(text) {
  return [...findRetired("prose.txt", text), ...findG5("prose.txt", text)];
}
