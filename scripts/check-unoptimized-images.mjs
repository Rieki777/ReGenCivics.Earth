/**
 * check-unoptimized-images.mjs
 *
 * Gate script: finds PNG/JPG files in directories that should have been
 * converted to WebP by optimize-images.mjs. Exits 1 if any are found so
 * unoptimized images can't ship through a build.
 *
 * Directories checked (each should contain only .webp after optimization):
 *   client/public/images/quests/
 *   client/public/images/return-cards/
 *   client/public/images/logos/
 *   client/public/  (game-*.{jpg,png})
 *
 * OG images, globe textures, favicons, and app icons are intentionally
 * excluded — those formats are kept by the optimizer.
 *
 * Run: node scripts/check-unoptimized-images.mjs
 */
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';

const PUBLIC = path.resolve('client/public');
const GLOB_PATTERN = /\.(png|jpe?g)$/i;

// Files/dirs allowed to keep PNG/JPG (OG images, favicons, globe textures, etc.)
const EXCLUDED_PREFIXES = [
  'og/',
  'og-default',
  'favicon',
  'apple-touch-icon',
  'android-chrome',
  'mstile',
  'globe-',
  'blog-hero',
];

async function scanDir(dir, relative = '') {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const found = [];
  for (const e of entries) {
    const relPath = relative ? `${relative}/${e.name}` : e.name;
    if (e.isDirectory()) {
      found.push(...await scanDir(path.join(dir, e.name), relPath));
    } else if (GLOB_PATTERN.test(e.name)) {
      const excluded = EXCLUDED_PREFIXES.some(p => relPath.startsWith(p) || e.name.startsWith(p));
      if (!excluded) found.push(relPath);
    }
  }
  return found;
}

const dirs = [
  path.join(PUBLIC, 'images', 'quests'),
  path.join(PUBLIC, 'images', 'return-cards'),
  path.join(PUBLIC, 'images', 'logos'),
];

const unoptimized = [];
for (const d of dirs) {
  const found = await scanDir(d);
  unoptimized.push(...found);
}

// Also check root-level game images
const rootEntries = await fs.readdir(PUBLIC, { withFileTypes: true }).catch(() => []);
for (const e of rootEntries) {
  if (!e.isDirectory() && /^game-/.test(e.name) && GLOB_PATTERN.test(e.name)) {
    unoptimized.push(e.name);
  }
}

if (unoptimized.length === 0) {
  console.log('check:images  all image assets are optimized (WebP)');
  process.exit(0);
} else {
  console.error(`check:images  ${unoptimized.length} unoptimized image(s) found. Run: node scripts/optimize-images.mjs`);
  for (const f of unoptimized) console.error(`  - ${f}`);
  process.exit(1);
}
