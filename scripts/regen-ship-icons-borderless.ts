/**
 * regen-ship-icons-borderless.ts — one-shot regeneration of every visible
 * top-level Ship's Inventory icon in the new border-less style.
 *
 * Why: the old icons baked in a gold-rimmed forest-green slot, so each card
 * showed a bordered sticker floating on the card. The new locked style
 * (scripts/generate-ship-item-icon.ts iconPrompt) paints the subject directly
 * on the card's own deep forest-green (#0d1f16), edge to edge, no rim — so the
 * icon blends into the card. This also fills in cards that had no icon
 * (e.g. the air mattress).
 *
 * Cache: /images/ship/items is served 1y-immutable, so overwriting a filename
 * in place would keep serving the old bordered icon. We write VERSIONED files
 * (<slug>.v2.webp) and flip iconUrl to them, which busts the cache cleanly.
 *
 * Two-phase (so the DB never points at a not-yet-deployed file):
 *   1. npx tsx scripts/regen-ship-icons-borderless.ts            # generate files only
 *      -> commit + deploy the new webp files
 *   2. npx tsx scripts/regen-ship-icons-borderless.ts --set-db   # flip iconUrl (live DB)
 *
 * Flags: --dry-run (plan only), --force (regenerate even if the v2 webp exists),
 * --only=slug1,slug2 (limit to specific slugs). Needs GEMINI_API_KEY; --set-db
 * needs DATABASE_URL.
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
const isSetDb = process.argv.includes("--set-db");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlySlugs = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",").filter(Boolean)) : null;

const VERSION = "v2"; // bump to bust the immutable cache again on a future restyle
const REPO_ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(REPO_ROOT, "client", "public", "images", "ship", "items");
const PY_SCRIPT = path.join(REPO_ROOT, "scripts", "nano-banana-pro-generate-image.py");

/** Locked ship-icon style: subject on the card's own #0d1f16, no rim/frame. */
function iconPrompt(subject: string): string {
  return `Game inventory icon of ${subject}, solarpunk elven-futuristic regenerative style, painterly, glowing accents of living green and warm gold, subject centered and filling most of the frame, on a solid uniform deep forest-green background color hex 0d1f16 that fills the entire square edge to edge, absolutely no border, no rim, no frame, no slot outline, no vignette, no text, 1:1`;
}

// Painterly subject per visible top-level slug (the 118 nested items keep glyphs).
const SUBJECTS: Record<string, string> = {
  // Containers (kits + drillable gear)
  "air-mattress": "an inflatable air mattress bed with a built-in pump",
  "exterior-bottom-cupboard": "a cupboard of spare parts, lubricants, and hand tools",
  "exterior-storage-bays": "outdoor adventure gear, tarps, and rugged storage containers",
  "gravity-drinking-water-filter": "an inline gravity drinking-water filter with clear tubing",
  "long-term-storage-bay": "a storage bay with folded tarps and sealed weatherproof boxes",
  "power-system": "a bank of house batteries with a solar panel and an inverter, glowing energy",
  "screw-fastener-box": "an open organizer box full of assorted screws, bolts, and washers",
  "sealants-adhesives-tape-kit": "an assortment of tape rolls, glue tubes, and sealant cartridges",
  "spring-water-intake-pump": "a water intake pump with coiled hoses drawing from a spring",
  "stand-up-paddleboard": "a stand-up paddleboard with a paddle and life vests",
  "tool-bag": "an open canvas tool bag of screwdrivers, wrenches, and small hand tools",
  "water-sewer-kit": "coiled fresh-water hoses with inline filters and blue water droplets",
  // Items (single pieces of gear)
  "cast-iron-cookware": "a cast-iron skillet and dutch oven, seasoned black",
  "copper-dowsing-rods": "a pair of L-shaped copper dowsing rods, softly glowing",
  "electric-bike": "an electric bicycle with a helmet resting on it",
  "field-guides-and-games": "a stack of nature field guides with a wooden flute and board games",
  "generator": "a portable power generator, sturdy and compact",
  "hammocks": "a woven hammock strung in a gentle curve",
  "love-your-body-kit": "a gentle self-care massage kit with natural oils and wooden tools",
  "paddle-ball-set": "a set of wooden paddle-ball paddles with a small ball",
  "regenerative-walking-staff": "a glowing wooden walking staff whose crown holds sprouting seeds",
  "safety-kit": "a first-aid kit with a fire extinguisher and a smoke detector",
  "starlink-dish": "a satellite internet dish antenna on a small stand",
  "treasure-chest-of-seeds": "an ornate wooden treasure chest overflowing with glowing seeds",
  "washing-machine": "a full-size front-loading washing machine beside a drying rack",
};

interface Row { id: number; slug: string; name: string; }

const webpName = (slug: string) => `${slug}.${VERSION}.webp`;
const iconUrlFor = (slug: string) => `/images/ship/items/${webpName(slug)}`;

async function main() {
  if (!process.env.GEMINI_API_KEY && !isDryRun && !isSetDb) {
    console.error("ERROR: GEMINI_API_KEY not set.");
    process.exit(1);
  }

  // The DB is the source of truth for which visible top-level rows exist.
  let rows: Row[];
  if (process.env.DATABASE_URL) {
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    try {
      const [r] = (await conn.execute(
        `SELECT id, slug, name FROM ship_inventory_items
          WHERE parentId IS NULL AND isVisible = 1 ORDER BY isContainer DESC, sortOrder, name`,
      )) as unknown as [Row[]];
      rows = r;
    } finally {
      await conn.end();
    }
  } else {
    // No DB (e.g. offline file-only run): fall back to the subject list.
    rows = Object.keys(SUBJECTS).map((slug, i) => ({ id: i, slug, name: slug }));
  }

  let targets = rows.filter((r) => SUBJECTS[r.slug]);
  if (onlySlugs) targets = targets.filter((r) => onlySlugs.has(r.slug));
  const skippedNoSubject = rows.filter((r) => !SUBJECTS[r.slug]).map((r) => r.slug);
  if (skippedNoSubject.length) console.log(`Note: no subject (skipped): ${skippedNoSubject.join(", ")}`);

  // ── Phase 2: just flip iconUrl for slugs whose v2 webp is on disk. ──
  if (isSetDb) {
    if (!process.env.DATABASE_URL) { console.error("ERROR: DATABASE_URL not set for --set-db."); process.exit(1); }
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    let set = 0, missing = 0;
    try {
      for (const row of targets) {
        if (!fs.existsSync(path.join(OUT_DIR, webpName(row.slug)))) { console.warn(`  ! ${row.slug}: ${webpName(row.slug)} not on disk, not setting iconUrl`); missing++; continue; }
        await conn.execute("UPDATE ship_inventory_items SET iconUrl = ? WHERE id = ?", [iconUrlFor(row.slug), row.id]);
        set++;
      }
    } finally { await conn.end(); }
    console.log(`\niconUrl set for ${set} card(s); ${missing} skipped (file missing).`);
    return;
  }

  // ── Phase 1: generate the versioned webp files. ──
  console.log(`${targets.length} icon(s) to generate${isDryRun ? " (dry run)" : ""}. Version: ${VERSION}`);
  if (isDryRun) { for (const t of targets) console.log(`  would generate ${webpName(t.slug)} <- "${SUBJECTS[t.slug]}"`); return; }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const python = process.platform === "win32" ? "py" : "python3";
  let done = 0, failed = 0;
  for (const row of targets) {
    const pngPath = path.join(OUT_DIR, `${row.slug}.${VERSION}.png`);
    const webpPath = path.join(OUT_DIR, webpName(row.slug));
    if (!isForce && fs.existsSync(webpPath)) { console.log(`  ${row.slug}: ${webpName(row.slug)} present, skipping`); done++; continue; }

    const args = [
      process.platform === "win32" ? "-3" : "",
      PY_SCRIPT, "--prompt", iconPrompt(SUBJECTS[row.slug]),
      "--filename", pngPath, "--resolution", "1K", "--aspect", "1:1",
    ].filter(Boolean);

    console.log(`  generating ${row.slug}…`);
    const run = spawnSync(python, args, { stdio: "inherit" });
    if (run.status !== 0 || !fs.existsSync(pngPath)) { console.warn(`  ! generation failed for ${row.slug}`); failed++; continue; }
    try {
      await sharp(pngPath).resize(256, 256, { fit: "cover" }).webp({ quality: 82 }).toFile(webpPath);
      fs.rmSync(pngPath, { force: true });
    } catch (e) {
      console.warn(`  ! webp step failed for ${row.slug}: ${e instanceof Error ? e.message : e}`);
      try { fs.rmSync(pngPath, { force: true }); } catch { /* best effort */ }
      failed++;
      continue;
    }
    done++;
  }
  console.log(`\nIcons: ${done} ready, ${failed} failed. Review them in ${OUT_DIR}, then deploy and run --set-db.`);
}

main().catch((err) => { console.error("Fatal:", err instanceof Error ? err.message : err); process.exit(1); });
