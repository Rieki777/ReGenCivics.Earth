/**
 * Gate: the fund's story stays true, and stays in one place.
 *
 * Two checks.
 *
 * 1. RETIRED CLAIMS. Twelve strings that were live on the site until
 *    2026-08-30 and are not true today: a fund that is open, a fund that pools
 *    capital, a Regulation D exemption nobody has chosen, two names for one
 *    thing. If any of them come back, this fails.
 *
 * 2. CONSUMERS. The files that describe the fund must import from
 *    shared/fund.ts. This is the half that matters over time. Deleting a banned
 *    string is easy; the failure mode that actually happened was someone
 *    writing a fresh, sincere, differently-worded description in a file nobody
 *    was watching. server/_core/crawler-content.ts said "Target returns of 8 to
 *    12% annually" while the page said 12 to 18%, for roughly two years, and no
 *    grep for a banned phrase would ever have caught it, because neither
 *    sentence was banned. Only "this file must read its numbers from the shared
 *    module" catches that.
 *
 * Suppression: put `fund-claims-allow: <reason>` on the same line, or on the
 * line immediately above. The line-above form exists for JSX prose, where an
 * inline comment would render into the page; scripts/audit-tap-blockers.py
 * takes the same shape for the same reason. Use it where a line legitimately
 * names Regulation D as the source of the accredited-investor DEFINITION
 * (Disclaimers.tsx, RiskDisclosure.tsx) rather than as an exemption the fund
 * relies on. There are no blanket allowlists and no directory-level opt-outs,
 * on purpose: an allowlist is where a gate goes to die.
 *
 * Usage: node scripts/check-fund-claims.mjs
 * Wired into scripts/gate.mjs and .github/workflows/ci.yml.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();

// ── 1. Retired claims ────────────────────────────────────────────────────────
// Matched case-insensitively as plain substrings, not regexes: these are
// sentences people write, not patterns.
const RETIRED = [
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
];

const SEARCH_ROOTS = ["client/src", "server", "shared", ".claude/skills"];
const SEARCH_FILES = [
  "client/public/llms.txt",
  "client/public/llms-full.txt",
  // client/index.html carried a THIRD copy of the InvestmentFund schema,
  // hardcoded in the shell, so it shipped in the HTML of every route before
  // React mounted. The first version of this gate did not scan .html and
  // reported a clean tree while that block was still being served. Found by
  // reading the built page rather than the diff, which is the only reason it
  // was found at all.
  "client/index.html",
];
const SEARCH_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".md", ".txt", ".html"];

// shared/fund.ts is the one place allowed to name the retired claims, because
// naming them is its job: the comments explain what was retired and why.
const SELF = join("shared", "fund.ts");

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "build", "coverage"]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (SEARCH_EXT.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

const files = [
  ...SEARCH_ROOTS.flatMap((d) => walk(join(ROOT, d))),
  ...SEARCH_FILES.map((f) => join(ROOT, f)).filter(existsSync),
];

const violations = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  if (rel === SELF || rel.split(sep).join("/") === "shared/fund.ts") continue;
  // The gate itself lists every retired claim by definition.
  if (rel.endsWith("check-fund-claims.mjs")) continue;

  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    // Same line, or the line immediately above (for JSX prose, where an inline
    // comment would render into the page).
    if (line.includes("fund-claims-allow:")) return;
    if (i > 0 && lines[i - 1].includes("fund-claims-allow:")) return;
    const lower = line.toLowerCase();
    for (const claim of RETIRED) {
      if (lower.includes(claim.toLowerCase())) {
        violations.push({
          file: rel.split(sep).join("/"),
          line: i + 1,
          claim,
          text: line.trim().slice(0, 140),
        });
      }
    }
  });
}

// ── 2. Consumers ─────────────────────────────────────────────────────────────
// Every surface that emits fund copy reads its facts from shared/fund.ts.
// This is the check that would have caught the 8-to-12% drift.
const CONSUMERS = [
  "client/src/pages/Opportunity.tsx",
  "client/src/pages/Fund.tsx",
  "client/src/pages/LOI.tsx",
  "client/src/pages/InvestorForm.tsx",
  "client/src/components/SEO.tsx",
  "client/src/components/ExitIntentCapture.tsx",
  "client/src/components/HowItWorks.tsx",
  "client/src/components/ProgressiveOnboarding.tsx",
  "client/src/components/AllocationCalculator.tsx",
  "server/_core/crawler-content.ts",
  "server/_core/email.ts",
  "server/_core/oauth.ts",
  "server/_core/vite.ts",
  "server/routes/players.ts",
];

const missingImport = [];
for (const rel of CONSUMERS) {
  const full = join(ROOT, rel);
  if (!existsSync(full)) {
    missingImport.push({ rel, why: "file not found" });
    continue;
  }
  const src = readFileSync(full, "utf8");
  // Both import styles the repo uses: the @shared alias on the client, and the
  // relative path on the server.
  const imports =
    /from\s+["']@shared\/fund["']/.test(src) ||
    /from\s+["'](?:\.\.?\/)+(?:\.\.\/)*shared\/fund["']/.test(src) ||
    /from\s+["'][^"']*\/shared\/fund["']/.test(src);
  if (!imports) missingImport.push({ rel, why: "does not import from shared/fund" });
}

// ── Report ───────────────────────────────────────────────────────────────────
let failed = false;

if (violations.length) {
  failed = true;
  console.error(`\n✗ fund-claims: ${violations.length} retired claim(s) are back.\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    claim: "${v.claim}"`);
    console.error(`    line:  ${v.text}`);
  }
  console.error(
    "\n  These describe a fund that does not exist yet. Rewrite to the intention,\n" +
      "  or remove. If a line legitimately names Regulation D as the source of the\n" +
      "  accredited investor DEFINITION rather than an exemption the fund relies on,\n" +
      "  add `fund-claims-allow: <reason>` on that line.\n",
  );
}

if (missingImport.length) {
  failed = true;
  console.error(`\n✗ fund-claims: ${missingImport.length} surface(s) not reading from shared/fund.ts.\n`);
  for (const m of missingImport) console.error(`  ${m.rel}  (${m.why})`);
  console.error(
    "\n  Every surface that describes the fund reads its name, status, target year\n" +
      "  and statement from shared/fund.ts. A surface with its own copy is how the\n" +
      "  page came to say 12 to 18% while the crawler said 8 to 12% for two years.\n",
  );
}

if (failed) process.exit(1);

console.log(
  `✓ fund-claims: ${files.length} files clean of ${RETIRED.length} retired claims; ` +
    `${CONSUMERS.length}/${CONSUMERS.length} surfaces read from shared/fund.ts.`,
);
