/**
 * Gate: the crowdpool campaign surfaces use our words.
 *
 * A scoped guard (build spec 2026-09-25, section 10.5; research R08). It
 * reads an explicit list of files, the ones a contributor, a project steward
 * or a campaign notice reader sees, and fails when any of them says a word we
 * do not use there:
 *
 *   - the BANNED_TERMS keys in shared/crowdpoolModel.ts (the earmark family,
 *     donation, donor, tax deductible, charitable), read from that file so the
 *     list lives in one place;
 *   - pledge, pledged, pledges, pledging (we say contribution or offer);
 *   - funded (we say complete);
 *   - unlock, unlocks;
 *   - claim, claims, claimed (claim belongs to the token bridge);
 *   - the em-dash character;
 *   - and, on every surface except the campaign notices, the fund words
 *     $RCivics, fund minimum, CHF 250, reserve, allocation, allocate,
 *     routing, seat. Campaign pages carry no fund copy (section 7.6), so a
 *     later edit cannot slip fund marketing onto a page EEA retail visitors
 *     see.
 *
 * Why a path list and not the whole repo: CORE's real donation pages and the
 * token bridge's claim flow use these words correctly. A repo-wide ban would
 * fail on them on day one and get switched off. A missing path fails the
 * gate, so a rename cannot quietly drop a surface from the list.
 *
 * What it skips:
 *   - comment lines (starting with //, /*, * or {/*) and the inside of a
 *     block comment that opens at the start of a line, plus a trailing //
 *     comment when the code before it has balanced quotes;
 *   - a match that is the whole of a quoted lowercase literal: 'funded',
 *     "most-funded" and claim_expired-style enum values and ids, which are
 *     not words anyone reads.
 *
 * Suppression: `banned-terms-allow: <reason>` on the same line or the line
 * immediately above, like `fund-claims-allow`. Every allow carries a reason.
 *
 * Pure core findBannedTerms(path, text) is exported for
 * server/banned-terms-guard.test.ts.
 *
 * Usage: node scripts/check-banned-terms.mjs
 * Wired into scripts/gate.mjs (gate 1f) and .github/workflows/ci.yml.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

// ── What is scanned ─────────────────────────────────────────────────────────

/** Files scanned one by one. Each must exist. */
export const GUARDED_FILES = [
  "client/src/pages/ProjectPage.tsx",
  "client/src/pages/CrowdPoolingProjects.tsx",
  "client/src/pages/CampaignRedirect.tsx",
  "client/src/components/crowdpool/TwoLineBar.tsx",
  "client/src/components/crowdpool/WholeAskSheet.tsx",
  "client/src/components/crowdpool/BringChips.tsx",
  "client/src/components/crowdpool/MoneyBlock.tsx",
  "client/src/components/crowdpool/NeedsTab.tsx",
  "client/src/components/crowdpool/GalleryCard.tsx",
  "client/src/components/crowdpool/PledgeSimulator.tsx",
  "client/src/components/ContributionModal.tsx",
  "shared/crowdpoolCopy.ts",
  "shared/campaignProgress.ts",
  "shared/crowdpoolNeedAction.ts",
  "shared/stewardQueue.ts",
  "server/lib/campaign-notify.ts",
  "server/routes/embed.ts",
];

/** Directories whose every source file is scanned, tests excepted. */
export const GUARDED_DIRS = [
  "client/src/components/project",
  "client/src/components/campaign-needs",
];

/** Surfaces where the fund words are allowed: notices name no fund, but need no fund ban either. */
export const FUND_WORDS_EXEMPT = new Set(["server/lib/campaign-notify.ts"]);

const SOURCE_EXT = [".ts", ".tsx"];
const TEST_FILE = /\.(test|spec)\.tsx?$/;

// ── What is banned ──────────────────────────────────────────────────────────

const WORD = "[A-Za-z0-9_]";

/** A whole word, case-insensitive: not preceded or followed by a word character. */
function wordPattern(body) {
  return `(?<!${WORD})(?:${body})(?!${WORD})`;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The keys of BANNED_TERMS in shared/crowdpoolModel.ts, read from its source
 * text so the list is kept in one place. Falls back to the list as of
 * 2026-09-25 if the object cannot be found, and says so.
 */
export function loadModelBannedTerms(root = REPO) {
  const fallback = ["earmark", "earmarking", "earmarked", "donation", "donor", "tax deductible", "charitable"];
  let src;
  try {
    src = readFileSync(path.join(root, "shared/crowdpoolModel.ts"), "utf8");
  } catch {
    return { terms: fallback, fromSource: false };
  }
  const block = /export const BANNED_TERMS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(src);
  if (!block) return { terms: fallback, fromSource: false };
  const terms = [];
  for (const line of block[1].split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("//")) continue;
    const m = /^(?:"([^"]+)"|'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))\s*:/.exec(t);
    if (m) terms.push((m[1] ?? m[2] ?? m[3]).toLowerCase());
  }
  return terms.length ? { terms, fromSource: true } : { terms: fallback, fromSource: false };
}

/**
 * Build the rules. Each rule has a label (what the report names) and a
 * global, case-insensitive regex. Model terms also match their plural, and
 * a two-word term matches with a space or a hyphen between.
 */
export function buildRules(modelTerms = loadModelBannedTerms().terms) {
  const modelRules = modelTerms.map((term) => {
    const body = term.split(/\s+/).map(escapeRe).join("[\\s-]+");
    return { label: term, fund: false, re: new RegExp(wordPattern(`${body}s?`), "gi") };
  });
  const base = [
    { label: "pledge", body: "pledge|pledged|pledges|pledging" },
    { label: "funded", body: "funded" },
    { label: "unlock", body: "unlock|unlocks" },
    { label: "claim", body: "claim|claims|claimed" },
  ].map((r) => ({ label: r.label, fund: false, re: new RegExp(wordPattern(r.body), "gi") }));
  const emDash = { label: "em-dash", fund: false, re: new RegExp(String.fromCharCode(0x2014), "g") };
  const fund = [
    // $ is not a word character, so this one carries its own left edge.
    { label: "$RCivics", re: /(?<![A-Za-z0-9_$])\$RCivics(?![A-Za-z0-9_])/gi },
    { label: "fund minimum", re: new RegExp(wordPattern("fund[\\s-]+minimums?"), "gi") },
    { label: "CHF 250", re: /(?<![A-Za-z0-9_])CHF\s*250(?![0-9])/gi },
    { label: "reserve", re: new RegExp(wordPattern("reserves?"), "gi") },
    { label: "allocation", re: new RegExp(wordPattern("allocations?"), "gi") },
    { label: "allocate", re: new RegExp(wordPattern("allocate"), "gi") },
    { label: "routing", re: new RegExp(wordPattern("routing"), "gi") },
    { label: "seat", re: new RegExp(wordPattern("seats?"), "gi") },
  ].map((r) => ({ ...r, fund: true }));
  return [...modelRules, ...base, emDash, ...fund];
}

// ── Skips ───────────────────────────────────────────────────────────────────

const ALLOW = "banned-terms-allow:";

/** True when a line is a comment line by its first characters. */
function isCommentLine(trimmed) {
  return trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("{/*");
}

/**
 * Drop a trailing `// comment` when the code before it has balanced quotes,
 * so a URL inside a string ("https://...") is never mistaken for one. When
 * the quotes do not balance (JSX prose with an apostrophe), the line is kept
 * whole and checked in full.
 */
function stripTrailingComment(line) {
  let from = 0;
  for (;;) {
    const at = line.indexOf("//", from);
    if (at < 0) return line;
    const before = line.slice(0, at);
    const prev = at > 0 ? line[at - 1] : " ";
    const balanced = ["\"", "'", "`"].every((q) => (before.split(q).length - 1) % 2 === 0);
    if (balanced && /\s|[;,)}\]]/.test(prev)) return before;
    from = at + 2;
  }
}

/** Ranges of quoted lowercase literals ('funded', "most-funded", `claim_expired`) on a line. */
function enumLiteralRanges(line) {
  const out = [];
  const re = /(['"`])([a-z0-9_.:\-]+)\1/g;
  let m;
  while ((m = re.exec(line))) out.push([m.index, m.index + m[0].length]);
  return out;
}

// ── The pure core ───────────────────────────────────────────────────────────

/**
 * Every banned word in one file's text. `file` is the repo-relative path; it
 * decides whether the fund words apply. Returns
 * [{ line, term, match, text }] with 1-based line numbers.
 */
export function findBannedTerms(file, text, rules = buildRules()) {
  const rel = String(file).split(path.sep).join("/");
  const fundApplies = !FUND_WORDS_EXEMPT.has(rel);
  const lines = String(text).split(/\r?\n/);
  const found = [];
  let inBlock = false;

  lines.forEach((raw, i) => {
    const trimmed = raw.trim();
    if (inBlock) {
      if (trimmed.includes("*/")) inBlock = false;
      return;
    }
    if (trimmed.startsWith("/*") || trimmed.startsWith("{/*")) {
      if (!trimmed.includes("*/")) inBlock = true;
      return;
    }
    if (isCommentLine(trimmed)) return;
    if (raw.includes(ALLOW)) return;
    if (i > 0 && lines[i - 1].includes(ALLOW)) return;

    const code = stripTrailingComment(raw);
    const literals = enumLiteralRanges(code);
    for (const rule of rules) {
      if (rule.fund && !fundApplies) continue;
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(code))) {
        const start = m.index;
        const end = start + m[0].length;
        const inLiteral = literals.some(([a, b]) => start > a && end < b);
        if (!inLiteral) {
          found.push({ line: i + 1, term: rule.label, match: m[0], text: trimmed.slice(0, 160) });
        }
        if (m[0].length === 0) rule.re.lastIndex++;
      }
    }
  });
  return found;
}

// ── The file list ───────────────────────────────────────────────────────────

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (SOURCE_EXT.some((e) => name.endsWith(e)) && !TEST_FILE.test(name)) out.push(full);
  }
  return out;
}

/** Every guarded file as a repo-relative path, plus the listed ones that are missing. */
export function guardedFiles(root = REPO) {
  const missing = [];
  const files = new Set();
  for (const rel of GUARDED_FILES) {
    if (existsSync(path.join(root, rel))) files.add(rel);
    else missing.push(rel);
  }
  for (const dir of GUARDED_DIRS) {
    const full = path.join(root, dir);
    if (!existsSync(full)) {
      missing.push(`${dir}/`);
      continue;
    }
    for (const f of walk(full)) files.add(path.relative(root, f).split(path.sep).join("/"));
  }
  return { files: [...files].sort(), missing };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function main() {
  const { terms, fromSource } = loadModelBannedTerms();
  const rules = buildRules(terms);
  const { files, missing } = guardedFiles();
  const violations = [];
  for (const rel of files) {
    const text = readFileSync(path.join(REPO, rel), "utf8");
    for (const v of findBannedTerms(rel, text, rules)) violations.push({ file: rel, ...v });
  }

  let failed = false;
  if (!fromSource) {
    failed = true;
    console.error("\n✗ banned-terms: could not read BANNED_TERMS from shared/crowdpoolModel.ts.");
    console.error("  The guard needs that object to keep one list. Check its shape.\n");
  }
  if (missing.length) {
    failed = true;
    console.error(`\n✗ banned-terms: ${missing.length} guarded path(s) are missing.\n`);
    for (const m of missing) console.error(`  ${m}`);
    console.error("\n  A renamed or deleted surface drops out of the guard silently. Update the list in\n  scripts/check-banned-terms.mjs to the new path.\n");
  }
  if (violations.length) {
    failed = true;
    console.error(`\n✗ banned-terms: ${violations.length} word(s) we do not use on campaign surfaces.\n`);
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    term:  ${v.term} ("${v.match}")`);
      console.error(`    line:  ${v.text}`);
    }
    console.error(
      "\n  Say contribution or offer (never pledge or donation), complete (never funded),\n" +
        "  route (never earmark). Claim belongs to the token bridge. No em-dashes, and no fund\n" +
        "  copy on campaign pages. If a line truly needs the word, add\n" +
        "  `banned-terms-allow: <reason>` on it or on the line above.\n",
    );
  }
  if (failed) process.exit(1);
  console.log(`✓ banned-terms: ${files.length} campaign surface files clean of ${rules.length} banned words.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
