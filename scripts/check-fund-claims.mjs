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
 * The rules for checks 1 to 3 live in shared/g5Rules.mjs, so the application
 * draft linter (scripts/lint-application-draft.mjs) and the admin packet view
 * apply exactly the rules this gate applies to the site. This file decides
 * what is scanned and reports.
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
 * Pure cores findRetired / findG5 / findTraction are re-exported for
 * server/fund-claims-guard.test.ts.
 *
 * Usage: node scripts/check-fund-claims.mjs
 * Wired into scripts/gate.mjs and .github/workflows/ci.yml.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { RETIRED, G5_RULES, TRACTION_RULE, findRetired, findG5, findTraction } from "../shared/g5Rules.mjs";

export { RETIRED, G5_RULES, TRACTION_RULE, findRetired, findG5, findTraction };

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

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
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

// shared/fund.ts may name the retired claims and G5 phrases, because
// explaining what was retired and why is its job. The rulebook and the gate
// list every pattern by definition, and so does the gate's test.
export const SELF = new Set([
  "shared/fund.ts",
  "shared/g5Rules.mjs",
  "scripts/check-fund-claims.mjs",
  "server/fund-claims-guard.test.ts",
]);

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "build", "coverage"]);

function toPosix(p) {
  return String(p).split(path.sep).join("/");
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

export function scannedFiles(root = REPO) {
  const files = new Set();
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
