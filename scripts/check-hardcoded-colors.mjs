/**
 * check-hardcoded-colors.mjs — warn-only lint for hardcoded hex colors.
 *
 * Flags text-[#...], bg-[#...], border-[#...], and fill-[#...] patterns in
 * TSX/TS files inside client/src/. These should use design token classes
 * (bg-forest-base, text-spring-base, etc.) or shadcn semantic tokens instead.
 *
 * Run: node scripts/check-hardcoded-colors.mjs
 * Always exits 0 (warn-only). Tighten to exit 1 once migration completes.
 */
import { promises as fs } from 'fs';
import path from 'path';

const SRC = path.resolve('client/src');
// Match Tailwind arbitrary-value hex colors in JSX className props
const HEX_PATTERN = /(?:text|bg|border|fill|ring|stroke|shadow|from|to|via)-\[#[0-9a-fA-F]{3,8}(?:\/\d+)?\]/g;
// Also flag arbitrary pixel values that should use spacing tokens
const PX_PATTERN = /\[(\d+)px\]/g;

async function walkDir(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') {
      files.push(...await walkDir(full));
    } else if (/\.(tsx|ts)$/.test(e.name) && !e.name.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

const files = await walkDir(SRC);
let totalHex = 0;
let totalPx = 0;
const fileStats = [];

for (const f of files) {
  const content = await fs.readFile(f, 'utf8');
  const hexMatches = content.match(HEX_PATTERN) || [];
  const pxMatches = content.match(PX_PATTERN) || [];
  if (hexMatches.length + pxMatches.length > 0) {
    totalHex += hexMatches.length;
    totalPx += pxMatches.length;
    fileStats.push({ file: path.relative(SRC, f), hex: hexMatches.length, px: pxMatches.length });
  }
}

if (fileStats.length === 0) {
  console.log('check:colors  no hardcoded hex colors or arbitrary px values found');
} else {
  fileStats.sort((a, b) => (b.hex + b.px) - (a.hex + a.px));
  console.warn(`check:colors  ${totalHex} hardcoded hex value(s), ${totalPx} arbitrary px value(s) across ${fileStats.length} file(s)`);
  for (const s of fileStats.slice(0, 20)) {
    const parts = [];
    if (s.hex) parts.push(`${s.hex} hex`);
    if (s.px) parts.push(`${s.px} px`);
    console.warn(`  ${s.file} (${parts.join(', ')})`);
  }
  if (fileStats.length > 20) console.warn(`  … and ${fileStats.length - 20} more files`);
}

// Always exit 0 (warn-only). Set to exit 1 after token migration is complete.
process.exit(0);
