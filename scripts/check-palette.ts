/**
 * Palette drift checker.
 *
 * Scans client/src for hex color literals (#xxxxxx) that do not belong to
 * the locked palette in client/src/lib/design-tokens.ts. Prints every
 * offender with file:line:snippet. Exits non-zero when drift is found so
 * the check can fail CI.
 *
 * Usage:
 *   npx tsx scripts/check-palette.ts
 *   npx tsx scripts/check-palette.ts --warn-only   # always exit 0
 *
 * The allowlist is the set of hex values exported from design-tokens.ts.
 * Files under client/src/lib/design-tokens.ts, client/src/**\/*.css, and
 * the DEPRECATED_COLORS block are ignored.
 *
 * Seasonal constants in client/src/data/seasonConstants.ts retain hex
 * literals inside Tailwind arbitrary classes (bg-[#xxxxxx]) because
 * Tailwind JIT can only find classes as static strings. Those occurrences
 * are allowed when the hex matches a canonical token.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC_ROOT = join(ROOT, "client/src");
const TOKENS_FILE = join(SRC_ROOT, "lib/design-tokens.ts");

// Build the allowlist directly from the tokens file so adding a token
// elsewhere automatically whitelists that hex.
function buildAllowlist(): Set<string> {
  const raw = readFileSync(TOKENS_FILE, "utf8");
  const hex = new Set<string>();
  for (const m of raw.matchAll(/#[0-9a-fA-F]{6}/g)) {
    hex.add(m[0].toLowerCase());
  }
  return hex;
}

const ALLOWED = buildAllowlist();

// Files that may contain hex for legitimate reasons.
const IGNORE_PATTERNS: RegExp[] = [
  /\.css$/,
  /client\/src\/lib\/design-tokens\.ts$/,
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
];

// Exit code control
const WARN_ONLY = process.argv.includes("--warn-only");

type Finding = { file: string; line: number; col: number; hex: string; snippet: string };
const findings: Finding[] = [];

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      scan(full);
    }
  }
}

function scan(file: string) {
  const rel = relative(ROOT, file);
  if (IGNORE_PATTERNS.some((r) => r.test(rel))) return;

  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const m of line.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      const hex = m[0].toLowerCase();
      if (ALLOWED.has(hex)) continue;
      findings.push({
        file: rel,
        line: i + 1,
        col: (m.index ?? 0) + 1,
        hex,
        snippet: line.trim().slice(0, 120),
      });
    }
  }
}

walk(SRC_ROOT);

if (findings.length === 0) {
  console.log(`\u2713 palette clean: no drift hex literals found in client/src (allowlist = ${ALLOWED.size} tokens)`);
  process.exit(0);
}

// Group by hex for a quick summary
const byHex = new Map<string, Finding[]>();
for (const f of findings) {
  if (!byHex.has(f.hex)) byHex.set(f.hex, []);
  byHex.get(f.hex)!.push(f);
}

console.log(`\n\u26A0  palette drift: ${findings.length} occurrence(s) across ${byHex.size} unique hex value(s)`);
console.log(`(allowlist = ${ALLOWED.size} canonical tokens from client/src/lib/design-tokens.ts)\n`);

const sorted = [...byHex.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [hex, hits] of sorted) {
  console.log(`  ${hex}  \u00D7 ${hits.length}`);
  for (const h of hits.slice(0, 3)) {
    console.log(`    ${h.file}:${h.line}  ${h.snippet}`);
  }
  if (hits.length > 3) console.log(`    ... and ${hits.length - 3} more`);
}

console.log("");
console.log("Migrate each offender to a token from client/src/lib/design-tokens.ts.");
console.log("See DESIGN_SYSTEM.md and FIXES_TO_MAKE_VISUAL_AUDIT.md for the map.");

process.exit(WARN_ONLY ? 0 : 1);
