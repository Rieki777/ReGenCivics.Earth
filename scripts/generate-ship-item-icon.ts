/**
 * generate-ship-item-icon.ts — the icon pipeline for the Ship's Inventory.
 *
 * Every inventory item gets an icon in the same locked style so the bag reads as
 * one set (SHIP_MAINTAINER_INVENTORY Section 2.2). This wraps the nano-banana-pro
 * generator (scripts/nano-banana-pro-generate-image.py, Gemini 3 Pro Image) with
 * a fixed style template, so you only supply the item.
 *
 * THE PROCESS FOR EVERY FUTURE ITEM
 *   1. Add the item row in admin (/admin/ship, Inventory) or via
 *      scripts/seed-ship-inventory.ts.
 *   2. Run this script with the item's short subject and slug.
 *   3. Review the icon in client/public/images/ship/items/<slug>.png.
 *   4. Optimize to webp (scripts/optimize-images.mjs) and set the item's iconUrl
 *      to /images/ship/items/<slug>.webp in admin, then publish.
 *
 * USAGE (needs GEMINI_API_KEY in .env)
 *   npx tsx scripts/generate-ship-item-icon.ts --slug walking-staff --item "a glowing wooden walking staff whose crown holds seeds"
 *   npx tsx scripts/generate-ship-item-icon.ts --slug paddleboard --item "a stand-up paddleboard and paddle" --resolution 2K
 *   npx tsx scripts/generate-ship-item-icon.ts --print   # print the locked prompt template and exit
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(REPO_ROOT, "client", "public", "images", "ship", "items");

/** The locked style template. Keep this in sync with the admin "icon prompt" prefill. */
export function iconPrompt(itemSubject: string): string {
  return `Game inventory icon of ${itemSubject}, solarpunk elven-futuristic regenerative style, painterly, glowing accents of living green and warm gold, centered on a deep forest-green background in a rounded-square slot with a thin gold rim, no text, 1:1`;
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function main() {
  if (process.argv.includes("--print")) {
    console.log(iconPrompt("[ITEM]"));
    return;
  }
  const slug = arg("slug");
  const item = arg("item");
  const resolution = arg("resolution") ?? "1K";
  if (!slug || !item) {
    console.error('Usage: npx tsx scripts/generate-ship-item-icon.ts --slug <slug> --item "<short subject>" [--resolution 1K|2K]');
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set. The locked prompt for this item is:\n");
    console.error(`  ${iconPrompt(item)}\n`);
    console.error("Run the nano-banana-pro skill with that prompt, or set GEMINI_API_KEY and re-run.");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const filename = join(OUT_DIR, `${slug}.png`);
  const python = process.platform === "win32" ? "py" : "python3";
  const args = [
    process.platform === "win32" ? "-3" : "",
    join(REPO_ROOT, "scripts", "nano-banana-pro-generate-image.py"),
    "--prompt", iconPrompt(item),
    "--filename", filename,
    "--resolution", resolution,
    "--aspect", "1:1",
  ].filter(Boolean);

  console.log(`Generating icon for "${slug}"...`);
  const run = spawnSync(python, args, { stdio: "inherit" });
  if (run.status !== 0) {
    console.error("Icon generation failed. Check the nano-banana-pro output above.");
    process.exit(1);
  }
  console.log(`Done. Review ${filename}, optimize to webp, then set iconUrl to /images/ship/items/${slug}.webp`);
}

main();
