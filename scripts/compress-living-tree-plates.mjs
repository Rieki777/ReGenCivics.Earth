#!/usr/bin/env node
/**
 * compress-living-tree-plates.mjs
 *
 * Resizes and converts the generated Living Tree PNG plates to 600px-wide WebP
 * for serving directly from client/public/living-tree/.
 *
 * Input:  generated/living-tree/*.png  (2K PNGs, ~1.8-2.5MB each)
 * Output: client/public/living-tree/*.webp (~40-80KB each at 600px wide)
 *
 * Usage:
 *   node scripts/compress-living-tree-plates.mjs
 */

import sharp from "sharp";
import { readdirSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const INPUT_DIR = join(REPO_ROOT, "generated", "living-tree");
const OUTPUT_DIR = join(REPO_ROOT, "client", "public", "living-tree");
const TARGET_WIDTH = 750; // 2x display width of the tree card

async function main() {
  if (!existsSync(INPUT_DIR)) {
    console.error("Input dir not found:", INPUT_DIR);
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const pngs = readdirSync(INPUT_DIR).filter((f) => f.endsWith(".png"));
  console.log(`Compressing ${pngs.length} plates to ${TARGET_WIDTH}px WebP ...\n`);

  let ok = 0, fail = 0;
  for (const file of pngs) {
    const name = basename(file, ".png");
    const inPath = join(INPUT_DIR, file);
    const outPath = join(OUTPUT_DIR, `${name}.webp`);
    try {
      const info = await sharp(inPath)
        .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 })
        .toFile(outPath);
      const kb = Math.round(info.size / 1024);
      console.log(`  ✓  ${name}.webp  ${kb}KB`);
      ok++;
    } catch (err) {
      console.error(`  ✗  ${file}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\nDone. ${ok} WebP files in ${OUTPUT_DIR}`);
  if (fail > 0) console.error(`${fail} failures.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
