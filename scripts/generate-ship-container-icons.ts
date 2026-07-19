/**
 * generate-ship-container-icons.ts
 *
 * Polished icons for the TOP-LEVEL inventory nodes only (never the 118 items).
 * The 17 curated cards already have icons; this fills in the curator-added
 * container hero cards (Power system, Water & sewer kit, ...) so the /ship
 * overview reads as one set. Nested items keep their real video-frame photos
 * (frameUrl) instead — see scripts/extract-ship-frames.ts.
 *
 * Pipeline: nano-banana-pro (Gemini 3 Pro Image) in the locked ship style ->
 * PNG in client/public/images/ship/items/<slug>.png -> webp via sharp ->
 * set iconUrl = /images/ship/items/<slug>.webp.
 *
 * Idempotent: top-level rows that already have an iconUrl are skipped (unless
 * --force). Requires GEMINI_API_KEY; DATABASE_URL for the real run.
 *
 * Usage:
 *   npx tsx scripts/generate-ship-container-icons.ts --dry-run   # plan only
 *   npx tsx scripts/generate-ship-container-icons.ts             # generate + set iconUrl
 *   npx tsx scripts/generate-ship-container-icons.ts --force     # regenerate even if set
 */
import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import * as dotenv from "dotenv";
import sharp from "sharp";

dotenv.config();

const isDryRun = process.argv.includes("--dry-run");
const isForce = process.argv.includes("--force");
// --no-db: generate the webp files only, do NOT set iconUrl. Lets you commit +
// deploy the static icons first, then set iconUrl (a plain re-run) so the cards
// never point at a not-yet-deployed file.
const isNoDb = process.argv.includes("--no-db");

const REPO_ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(REPO_ROOT, "client", "public", "images", "ship", "items");
const PY_SCRIPT = path.join(REPO_ROOT, "scripts", "nano-banana-pro-generate-image.py");

/** Locked ship-icon style. Keep in sync with generate-ship-item-icon.ts / admin prefill. */
function iconPrompt(itemSubject: string): string {
  return `Game inventory icon of ${itemSubject}, solarpunk elven-futuristic regenerative style, painterly, glowing accents of living green and warm gold, centered on a deep forest-green background in a rounded-square slot with a thin gold rim, no text, 1:1`;
}

// Short painterly subjects for the container hero cards (by slug).
const SUBJECTS: Record<string, string> = {
  "power-system": "a bank of house batteries with a solar panel and an inverter, glowing energy",
  "water-sewer-kit": "coiled fresh-water hoses with inline filters and blue water droplets",
  "sealants-adhesives-tape-kit": "an assortment of tape rolls, glue tubes, and sealant cartridges",
  "screw-fastener-box": "an open organizer box full of assorted screws, bolts, and washers",
  "long-term-storage-bay": "a storage bay with folded tarps and sealed weatherproof boxes",
  "exterior-storage-bays": "outdoor adventure gear, tarps, and rugged storage containers",
  "exterior-bottom-cupboard": "a cupboard of spare parts, lubricants, and hand tools",
  "indoor-tool-bag": "an open canvas tool bag of screwdrivers, glues, and small hand tools",
  "outdoor-tool-bag": "a rugged field tool bag with a saw, multimeter, and clamps",
  "love-your-body-kit": "a gentle self-care massage kit with natural oils and wooden tools",
};

interface Row { id: number; slug: string; name: string; description: string | null; iconUrl: string | null; parentId: number | null; isContainer: number; }

function subjectFor(row: Row): string {
  return SUBJECTS[row.slug] || `${row.name}${row.description ? ", " + row.description.slice(0, 80) : ""}`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url && !isDryRun) { console.error("ERROR: DATABASE_URL not set."); process.exit(1); }
  if (!process.env.GEMINI_API_KEY && !isDryRun) { console.error("ERROR: GEMINI_API_KEY not set."); process.exit(1); }

  if (isDryRun) {
    console.log("DRY RUN — no DB, no image generation. Would generate icons for top-level nodes missing an iconUrl.");
    console.log(`  known container subjects: ${Object.keys(SUBJECTS).length}`);
    console.log(`  output: ${OUT_DIR}/<slug>.webp -> iconUrl /images/ship/items/<slug>.webp`);
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const conn = await mysql.createConnection(url!);
  try {
    // Top-level nodes (the overview cards). Icons are for the hero cards; we only
    // (re)generate ones that lack an iconUrl unless --force.
    const [rows] = (await conn.execute(
      `SELECT id, slug, name, description, iconUrl, parentId, isContainer
         FROM ship_inventory_items
        WHERE parentId IS NULL`,
    )) as unknown as [Row[]];

    const targets = rows.filter((r) => (isForce || !r.iconUrl) && (SUBJECTS[r.slug] || r.isContainer));
    console.log(`${targets.length} top-level node(s) to generate icons for.`);

    const python = process.platform === "win32" ? "py" : "python3";
    let done = 0, failed = 0;
    for (const row of targets) {
      const pngPath = path.join(OUT_DIR, `${row.slug}.png`);
      const webpPath = path.join(OUT_DIR, `${row.slug}.webp`);
      const args = [
        process.platform === "win32" ? "-3" : "",
        PY_SCRIPT, "--prompt", iconPrompt(subjectFor(row)),
        "--filename", pngPath, "--resolution", "1K", "--aspect", "1:1",
      ].filter(Boolean);

      // Generate only when the webp isn't already there (idempotent); --force regenerates.
      if (isForce || !fs.existsSync(webpPath)) {
        console.log(`  generating ${row.slug}…`);
        const run = spawnSync(python, args, { stdio: "inherit" });
        if (run.status !== 0 || !fs.existsSync(pngPath)) { console.warn(`  ! generation failed for ${row.slug}`); failed++; continue; }
        // A single undecodable PNG must not abort the batch or leave a stray png.
        try {
          await sharp(pngPath).resize(256, 256, { fit: "cover" }).webp({ quality: 82 }).toFile(webpPath);
          fs.rmSync(pngPath, { force: true });
        } catch (e) {
          console.warn(`  ! webp step failed for ${row.slug}: ${e instanceof Error ? e.message : e}`);
          try { fs.rmSync(pngPath, { force: true }); } catch { /* best effort */ }
          failed++;
          continue;
        }
      } else {
        console.log(`  ${row.slug}: webp already present, skipping generation`);
      }

      // Point the card at the static webp — skip under --no-db so we can commit +
      // deploy the file before the DB references it (no broken-image window).
      if (!isNoDb) {
        await conn.execute("UPDATE ship_inventory_items SET iconUrl = ? WHERE id = ?", [`/images/ship/items/${row.slug}.webp`, row.id]);
      }
      done++;
    }

    console.log(`\nIcons: ${done} generated + set, ${failed} failed. Review them in ${OUT_DIR}.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
