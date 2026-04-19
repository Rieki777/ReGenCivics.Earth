/**
 * Palette drift checker (no-dep ESM version).
 * Reads design-tokens.ts for canonical hex values, scans client/src for drift.
 * Exit 0 = clean, Exit 1 = drift found.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const TOKENS_PATH = "client/src/lib/design-tokens.ts";
const SCAN_DIR = "client/src";

// Extract all hex literals from design-tokens.ts
const tokensContent = readFileSync(TOKENS_PATH, "utf8");
const tokenHexes = new Set();
for (const m of tokensContent.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
  tokenHexes.add(m[1].toLowerCase());
}
// Also allow common CSS/Tailwind values
const ALLOWED = new Set([
  "000", "000000", "fff", "ffffff", "f00", "0f0", "00f",
  "transparent", "inherit", "currentColor",
]);
for (const h of tokenHexes) ALLOWED.add(h);

// Also allow 3-char shorthand of 6-char tokens
for (const h of tokenHexes) {
  if (h.length === 6 && h[0] === h[1] && h[2] === h[3] && h[4] === h[5]) {
    ALLOWED.add(h[0] + h[2] + h[4]);
  }
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === ".git" || entry === "design-tokens.ts") continue;
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else if ([".ts", ".tsx"].includes(extname(full))) files.push(full);
  }
  return files;
}

const files = walk(SCAN_DIR);
let totalDrift = 0;
const driftByFile = {};

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments and imports
    if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim().startsWith("import")) continue;
    // Skip DEPRECATED_COLORS mapping table
    if (line.includes("DEPRECATED_COLORS")) continue;
    for (const m of line.matchAll(/(?<!&)#([0-9a-fA-F]{3,8})\b/g)) {
      const hex = m[1].toLowerCase();
      if (!ALLOWED.has(hex)) {
        if (!driftByFile[file]) driftByFile[file] = [];
        driftByFile[file].push({ line: i + 1, hex: "#" + hex, sample: line.trim().slice(0, 80) });
        totalDrift++;
      }
    }
  }
}

// Report
const fileCount = Object.keys(driftByFile).length;
if (totalDrift === 0) {
  console.log("Palette check: 0 drift hex literals found. Clean.");
  process.exit(0);
} else {
  console.log(`Palette check: ${totalDrift} drift hex literals across ${fileCount} files.\n`);
  // Sort by count descending
  const sorted = Object.entries(driftByFile).sort((a, b) => b[1].length - a[1].length);
  for (const [file, hits] of sorted.slice(0, 15)) {
    console.log(`  ${file} (${hits.length}):`);
    for (const h of hits.slice(0, 3)) {
      console.log(`    L${h.line}: ${h.hex} — ${h.sample}`);
    }
    if (hits.length > 3) console.log(`    ... and ${hits.length - 3} more`);
  }
  if (sorted.length > 15) console.log(`  ... and ${sorted.length - 15} more files`);
  process.exit(1);
}
