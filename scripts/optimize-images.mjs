/**
 * Image optimization script — converts PNG/JPG in /public to WebP
 * Run: node scripts/optimize-images.mjs
 * Uses sharp (already in devDependencies)
 */
import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '../client/public');

// Skip favicons and PWA icons — browsers expect specific formats for these
const SKIP_PATTERNS = [
  'favicon', 'apple-touch-icon', 'icon-192', 'icon-512', 'og-default'
];

async function findImages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findImages(full));
    } else if (['.png', '.jpg', '.jpeg'].includes(extname(entry.name).toLowerCase())) {
      const skip = SKIP_PATTERNS.some(p => entry.name.toLowerCase().includes(p));
      if (!skip) results.push(full);
    }
  }
  return results;
}

async function main() {
  const images = await findImages(PUBLIC_DIR);
  console.log(`Found ${images.length} images to optimize\n`);

  let saved = 0;
  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const src of images) {
    const ext = extname(src);
    const dest = src.replace(ext, '.webp');
    const origStat = await stat(src);
    const origKb = origStat.size / 1024;

    try {
      await sharp(src)
        .webp({ quality: 82, effort: 6 })
        .toFile(dest);

      const newStat = await stat(dest);
      const newKb = newStat.size / 1024;
      const pct = Math.round((1 - newKb / origKb) * 100);

      totalOriginal += origKb;
      totalOptimized += newKb;
      saved++;

      const rel = src.replace(PUBLIC_DIR, '');
      console.log(`✓ ${rel}`);
      console.log(`  ${Math.round(origKb)}KB → ${Math.round(newKb)}KB (${pct}% smaller)\n`);
    } catch (err) {
      console.error(`✗ Failed: ${src}`, err.message);
    }
  }

  const totalSavedMb = ((totalOriginal - totalOptimized) / 1024).toFixed(1);
  console.log(`\nDone: ${saved}/${images.length} images converted`);
  console.log(`Total saved: ${totalSavedMb}MB (${Math.round(totalOriginal / 1024)}MB → ${Math.round(totalOptimized / 1024)}MB)`);
}

main().catch(console.error);
