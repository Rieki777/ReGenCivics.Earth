/**
 * bake-overlays.ts — Pre-bakes dark overlays into parallax background images.
 *
 * Downloads each CDN image, composites the dark overlay at the pixel level,
 * and saves a -baked.webp version to client/public/backgrounds/.
 *
 * After running, update code references from the CDN URLs to /backgrounds/<name>-baked.webp
 *
 * Usage:
 *   npx tsx scripts/bake-overlays.ts [--dry-run]
 *
 * Requires: sharp (already in devDependencies)
 */

import sharp from "sharp";
import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import { join } from "path";
import * as https from "https";
import * as http from "http";

const DRY_RUN = process.argv.includes("--dry-run");

const OUT_DIR = join(process.cwd(), "client", "public", "backgrounds");

// ─── Image manifest ───────────────────────────────────────────────────────────
// Each entry: { url, name, overlay } where overlay is the rgba CSS string
// that was previously applied as a runtime CSS overlay.
// Match these to the overlay= prop used in each <ParallaxSection>.

const IMAGES = [
  // Quest.tsx parallax sections
  {
    url: "https://assets.regencivics.earth/HqkwLOeDYdCpbwla.jpg",
    name: "quest-spring",
    overlayRgba: "rgba(13,28,20,0.75)",
  },
  {
    url: "https://assets.regencivics.earth/hSCSMzfMvNBVNdFX.jpg",
    name: "quest-summer",
    overlayRgba: "rgba(13,28,20,0.75)",
  },
  {
    url: "https://assets.regencivics.earth/ZhVLJNePNkZErikp.jpg",
    name: "quest-fall",
    overlayRgba: "rgba(13,28,20,0.75)",
  },
  {
    url: "https://assets.regencivics.earth/TdRIxUeJvpmoVwvP.jpg",
    name: "quest-winter",
    overlayRgba: "rgba(13,28,20,0.75)",
  },
  {
    url: "https://assets.regencivics.earth/kdpmqczDwXGfwTIK.jpg",
    name: "quest-anytime",
    overlayRgba: "rgba(13,28,20,0.80)",
  },
  // Game.tsx parallax sections
  {
    url: "https://assets.regencivics.earth/ocDzkDHpivHtGCWo.jpg",
    name: "game-seeds-intro",
    overlayRgba: "rgba(13,28,20,0.72)",
  },
  {
    url: "https://assets.regencivics.earth/LbIXEUcDdcOLOHmP.jpg",
    name: "game-seeds-legacy",
    overlayRgba: "rgba(13,28,20,0.72)",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRgba(rgba: string): { r: number; g: number; b: number; a: number } {
  // Parse "rgba(r,g,b,a)" or "rgba(r, g, b, a)"
  const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (!match) throw new Error(`Cannot parse rgba: ${rgba}`);
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
}

async function downloadToBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadToBuffer(res.headers.location!).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function bakeImage(
  url: string,
  name: string,
  overlayRgba: string,
  outDir: string
): Promise<string> {
  console.log(`  Downloading ${url} ...`);
  const imageBuffer = await downloadToBuffer(url);

  const { r, g, b, a } = parseRgba(overlayRgba);
  const alpha = Math.round(a * 255);

  // Get image dimensions
  const meta = await sharp(imageBuffer).metadata();
  if (!meta.width || !meta.height) throw new Error(`Cannot read metadata for ${name}`);

  // Create solid overlay buffer (RGBA)
  const overlayBuffer = Buffer.alloc(meta.width * meta.height * 4);
  for (let i = 0; i < overlayBuffer.length; i += 4) {
    overlayBuffer[i] = r;
    overlayBuffer[i + 1] = g;
    overlayBuffer[i + 2] = b;
    overlayBuffer[i + 3] = alpha;
  }

  const outPath = join(outDir, `${name}-baked.webp`);

  await sharp(imageBuffer)
    .composite([
      {
        input: overlayBuffer,
        raw: { width: meta.width, height: meta.height, channels: 4 },
        blend: "over",
      },
    ])
    .webp({ quality: 85 })
    .toFile(outPath);

  return outPath;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) {
    console.log("=== DRY RUN: no files will be written ===\n");
    console.log("Would bake the following images:");
    for (const img of IMAGES) {
      console.log(`  ${img.name}-baked.webp  ←  ${img.url}  (overlay: ${img.overlayRgba})`);
    }
    console.log(`\nOutput dir: ${OUT_DIR}`);
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Baking ${IMAGES.length} images into ${OUT_DIR}\n`);

  const mapping: { original: string; baked: string }[] = [];

  for (const img of IMAGES) {
    try {
      const outPath = await bakeImage(img.url, img.name, img.overlayRgba, OUT_DIR);
      const publicPath = `/backgrounds/${img.name}-baked.webp`;
      mapping.push({ original: img.url, baked: publicPath });
      console.log(`  ✓ ${img.name}-baked.webp`);
    } catch (err) {
      console.error(`  ✗ ${img.name}: ${(err as Error).message}`);
    }
  }

  console.log("\n=== Code Reference Mapping ===");
  console.log("Replace these CDN URLs with the local paths in your components:\n");
  for (const m of mapping) {
    console.log(`  BEFORE: "${m.original}"`);
    console.log(`  AFTER:  "${m.baked}"\n`);
  }

  console.log("\nDone. Now update the imageSrc props in Quest.tsx and Game.tsx,");
  console.log("and remove the overlay= props (no longer needed — baked in).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
