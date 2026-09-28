/**
 * Gate: the cooperative's story stays true, stays in one place, and never
 * promises upside.
 *
 * Four checks.
 *
 * 1. RETIRED CLAIMS. Strings that were live on the site and are not true
 *    today: a fund that is open, a fund that pools capital, a Regulation D
 *    exemption nobody has chosen, and (since 2026-09-27) the "ReGen Civics
 *    Fund" itself, which is now a cooperative in design. If any come back,
 *    this fails.
 *
 * 2. G5 LANGUAGE (added 2026-09-27, FUNDING_ENGINE_PLAN v1.2 gate G5). Phrases
 *    that promise or price upside: returns, IRR, ROI, yield, appreciation,
 *    exchange listings, secondary markets, "index fund", "direct investment",
 *    "invest in land projects", accredited-investor gates, fund terms (carry,
 *    preferred return, management fee, LPs, NAV, tender offers), distributions
 *    to holders, "land-backed security", tokens for USD, and a percentage near
 *    a return word. The retired-claims list could never catch these: the
 *    crawler said "Target returns of 8 to 12% annually" for two years and
 *    passed, because no single fixed string matched it. A purchasing
 *    cooperative keeps its "bought for use" footing only while nothing in the
 *    funnel promises upside (United Housing Foundation v. Forman, 1975), so
 *    this is a phrase gate, not a string list.
 *
 * 3. TRACTION NUMBERS on the summary surfaces crawlers and AI assistants read
 *    (llms files, index.html, crawler prose, structured data, meta, README).
 *    Rye's ruling 2026-09-27: live counts stay in the admin metrics table until
 *    they are meaningful. A hardcoded "847 active players" is how the site came
 *    to claim eight times its real accounts.
 *
 * 4. CONSUMERS. The files that describe the cooperative import from
 *    shared/fund.ts. Deleting a banned string is easy; the failure that
 *    actually happened was someone writing a fresh, sincere, differently
 *    worded description in a file nobody was watching.
 *
 * What is scanned: client/src, server, shared and .claude/skills (every text
 * source), plus the named public files below. Checks 2 and 3 skip test files
 * and, in code files, comment lines: they guard what people read, and a
 * comment explaining why a phrase is banned has to be able to name it.
 *
 * Suppression: put `fund-claims-allow: <reason>` on the same line, or on the
 * line immediately above (for JSX prose, where an inline comment would render
 * into the page). There are no blanket allowlists and no directory-level
 * opt-outs, on purpose: an allowlist is where a gate goes to die.
 *
 * Pure cores findRetired / findG5 / findTraction are exported for
 * server/fund-claims-guard.test.ts.
 *
 * Usage: node scripts/check-fund-claims.mjs
 * Wired into scripts/gate.mjs and .github/workflows/ci.yml.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

// ── 1. Retired claims ────────────────────────────────────────────────────────
// Matched case-insensitively as plain substrings, not regexes: these are
// sentences people write, not patterns.
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

// ── 2. G5 language ───────────────────────────────────────────────────────────
// Each rule: a label for the report and a global regex. Most are
// case-insensitive; the acronyms (IRR, ROI, LP, NAV) are case-sensitive so
// ordinary words and identifiers never trip them.
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

// ── 3. Traction numbers on summary surfaces ─────────────────────────────────
export const SUMMARY_SURFACES = [
  "client/public/llms.txt",
  "client/public/llms-full.txt",
  "client/index.html",
  "server/_core/crawler-content.ts",
  "client/src/components/StructuredData.tsx",
  "client/src/components/SEO.tsx",
  "server/_core/vite.ts",
  "README.md",
];

export const TRACTION_RULE = {
  label: "traction number",
  // Longer alternatives first, so the report quotes the whole phrase.
  re: /\b\d[\d,]*\+?\s+(?:active\s+)?(?:players|members|land\s+projects|alliance\s+(?:partner\s+organi[sz]ations|partners?|organi[sz]ations|orgs)|participants|organi[sz]ations|bioregional\s+hubs|quests(?:\s+completed)?)\b/gi,
};

// ── What is scanned ──────────────────────────────────────────────────────────
const SEARCH_ROOTS = ["client/src", "server", "shared", ".claude/skills"];
export const SEARCH_FILES = [
  "client/public/llms.txt",
  "client/public/llms-full.txt",
  // client/index.html carried a THIRD copy of the InvestmentFund schema,
  // hardcoded in the shell, so it shipped in the HTML of every route before
  // React mounted. The first version of this gate did not scan .html and
  // reported a clean tree while that block was still being served.
  "client/index.html",
  "client/public/manifest.json",
  "README.md",
  // Agents read this before writing any fund or token copy (CLAUDE.md), so a
  // stale sentence here is copied onto the site by the next session.
  "CONTEXT_THE_TWO_GAMES.md",
];
const SEARCH_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".md", ".txt", ".html", ".json"];
const CODE_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

// shared/fund.ts may name the retired claims and G5 phrases, because
// explaining what was retired and why is its job. The gate itself lists every
// pattern by definition, and so does its test.
const SELF = new Set([
  "shared/fund.ts",
  "scripts/check-fund-claims.mjs",
  "server/fund-claims-guard.test.ts",
]);

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "build", "coverage"]);
const ALLOW = "fund-claims-allow:";

function toPosix(p) {
  return String(p).split(path.sep).join("/");
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
 * block comment, and JSDoc continuation lines. Prose files (md, txt, html)
 * have no comments to skip: a markdown list item starting with "*" is content.
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

// ── Pure cores ───────────────────────────────────────────────────────────────

/** Retired claims in one file. Returns [{ line, claim, text }]. */
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

/** Acronym rules whose match is skipped when it is exactly a quoted literal. */
const LITERAL_EXEMPT = new Set(["IRR", "ROI", "LP"]);

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

/** G5 phrases in one file. Test files are never passed in. */
export function findG5(rel, text) {
  return runRules(toPosix(rel), text, G5_RULES);
}

/** Hardcoded traction numbers in one summary-surface file. */
export function findTraction(rel, text) {
  return runRules(toPosix(rel), text, [TRACTION_RULE]);
}

// ── 4. Consumers ─────────────────────────────────────────────────────────────
// Every surface that describes the cooperative reads its facts from
// shared/fund.ts. This is the check that would have caught the 8-to-12% drift.
export const CONSUMERS = [
  "client/src/pages/Opportunity.tsx",
  "client/src/pages/Fund.tsx",
  "client/src/pages/LOI.tsx",
  "client/src/components/SEO.tsx",
  "client/src/components/ExitIntentCapture.tsx",
  "client/src/components/HowItWorks.tsx",
  "client/src/components/ProgressiveOnboarding.tsx",
  "server/_core/crawler-content.ts",
  "server/_core/email.ts",
  "server/_core/oauth.ts",
  "server/_core/vite.ts",
  "server/routes/players.ts",
];

function importsFundModule(src) {
  // Both import styles the repo uses: the @shared alias on the client, and the
  // relative path on the server.
  return (
    /from\s+["']@shared\/fund["']/.test(src) ||
    /from\s+["'](?:\.\.?\/)+(?:\.\.\/)*shared\/fund["']/.test(src) ||
    /from\s+["'][^"']*\/shared\/fund["']/.test(src)
  );
}

// ── The file list ────────────────────────────────────────────────────────────

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (SEARCH_EXT.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

/**
 * Every file git would publish: tracked files plus new files .gitignore does
 * not exclude, deleted files left out. Gitignored files never reach the public
 * repo or the site, and walking them made a local gate fail where CI passed:
 * old QA crawl output (.claude/skills/regen-qa-crawl/runs/, ignored by its own
 * .gitignore) still quotes the retired fund copy. Null outside a git checkout.
 */
export function gitListedFiles(root = REPO) {
  try {
    const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.split("\0").filter((f) => f && existsSync(path.join(root, f)));
  } catch {
    return null;
  }
}

export function scannedFiles(root = REPO) {
  const files = new Set();
  const listed = gitListedFiles(root);
  if (listed) {
    for (const f of listed) {
      const inRoot = SEARCH_ROOTS.some((d) => f.startsWith(`${d}/`));
      const skipped = f.split("/").some((seg) => SKIP_DIRS.has(seg));
      if (inRoot && !skipped && SEARCH_EXT.some((e) => f.endsWith(e))) files.add(f);
    }
    for (const f of SEARCH_FILES) if (listed.includes(f)) files.add(f);
    return [...files].sort();
  }
  // Not a git checkout (an exported tarball): walk the tree.
  for (const d of SEARCH_ROOTS) for (const f of walk(path.join(root, d))) files.add(toPosix(path.relative(root, f)));
  for (const f of SEARCH_FILES) if (existsSync(path.join(root, f))) files.add(f);
  return [...files].sort();
}

/**
 * G5 covers every scanned file except installed third-party skills. The
 * project's own regen-* skills are covered, because agents write site copy
 * from them; the generic marketing skills use "ROI" and "returns" in the
 * ordinary business sense and never reach the site.
 */
export function g5Applies(rel) {
  const p = toPosix(rel);
  if (!p.startsWith(".claude/skills/")) return true;
  return p.startsWith(".claude/skills/regen-");
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function main() {
  const files = scannedFiles();
  const retired = [];
  const g5 = [];
  const traction = [];

  for (const rel of files) {
    if (SELF.has(rel)) continue;
    const text = readFileSync(path.join(REPO, rel), "utf8");
    for (const v of findRetired(rel, text)) retired.push({ file: rel, ...v });
    if (TEST_FILE.test(rel) || !g5Applies(rel)) continue;
    for (const v of findG5(rel, text)) g5.push({ file: rel, ...v });
  }
  for (const rel of SUMMARY_SURFACES) {
    const full = path.join(REPO, rel);
    if (!existsSync(full)) continue;
    for (const v of findTraction(rel, readFileSync(full, "utf8"))) traction.push({ file: rel, ...v });
  }

  const missingImport = [];
  for (const rel of CONSUMERS) {
    const full = path.join(REPO, rel);
    if (!existsSync(full)) {
      missingImport.push({ rel, why: "file not found" });
      continue;
    }
    if (!importsFundModule(readFileSync(full, "utf8"))) missingImport.push({ rel, why: "does not import from shared/fund" });
  }

  let failed = false;
  const report = (title, list, advice) => {
    if (!list.length) return;
    failed = true;
    console.error(`\n✗ fund-claims: ${list.length} ${title}\n`);
    for (const v of list) {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    claim: ${v.claim}${v.match ? ` ("${v.match}")` : ""}`);
      console.error(`    line:  ${v.text}`);
    }
    console.error(advice);
  };

  report(
    "retired claim(s) are back.",
    retired,
    "\n  These describe a fund that does not exist. Rewrite to the cooperative in\n" +
      "  shared/fund.ts, or remove. If a line truly needs the words, add\n" +
      "  `fund-claims-allow: <reason>` on that line or the line above.\n",
  );
  report(
    "G5 phrase(s) promise or price upside.",
    g5,
    "\n  Public copy never discusses returns, yield, listings, fund terms or offers to\n" +
      "  invest (plan v1.2 gate G5). Describe the cooperative with COOP in shared/fund.ts,\n" +
      "  or remove the line. A true non-financial use (crop yields, a quest's return\n" +
      "  journey) takes `fund-claims-allow: <reason>`.\n",
  );
  report(
    "hardcoded traction number(s) on summary surfaces.",
    traction,
    "\n  Live counts stay in the admin metrics table until Rye marks them public\n" +
      "  (ruling 2026-09-27). Remove the number or render it from the metrics table.\n",
  );
  if (missingImport.length) {
    failed = true;
    console.error(`\n✗ fund-claims: ${missingImport.length} surface(s) not reading from shared/fund.ts.\n`);
    for (const m of missingImport) console.error(`  ${m.rel}  (${m.why})`);
    console.error(
      "\n  Every surface that describes the cooperative reads its name, status and\n" +
        "  statement from shared/fund.ts. A surface with its own copy is how the page came\n" +
        "  to say 12 to 18% while the crawler said 8 to 12% for two years.\n",
    );
  }

  if (failed) process.exit(1);
  console.log(
    `✓ fund-claims: ${files.length} files clean of ${RETIRED.length} retired claims and ${G5_RULES.length} G5 rules; ` +
      `${SUMMARY_SURFACES.length} summary surfaces carry no traction numbers; ` +
      `${CONSUMERS.length}/${CONSUMERS.length} surfaces read from shared/fund.ts.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
