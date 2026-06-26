#!/usr/bin/env node
/**
 * upload-living-tree-plates.mjs
 *
 * Uploads all PNGs from generated/living-tree/ to Cloudflare R2 under the
 * key  living-tree/{stage}-{season}.png
 *
 * After uploading, images are served via the /api/img proxy:
 *   /api/img?url=https://assets.regencivics.earth/living-tree/flowering-tree-summer.png&w=600
 *
 * Usage:
 *   node scripts/upload-living-tree-plates.mjs [--dry-run]
 *
 * Reads env from .env at repo root (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 * AWS_BUCKET_NAME, AWS_ENDPOINT_URL, AWS_REGION).
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const INPUT_DIR = join(REPO_ROOT, "generated", "living-tree");
const DRY_RUN = process.argv.includes("--dry-run");

const VALID_STAGES = ["seedling", "sapling", "young-tree", "flowering-tree", "fruiting-tree", "ancient-tree"];
const VALID_SEASONS = ["spring", "summer", "autumn", "winter"];

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(REPO_ROOT, ".env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── S3/R2 client ──────────────────────────────────────────────────────────────
function makeClient() {
  const endpoint = process.env.AWS_ENDPOINT_URL;
  if (!endpoint) throw new Error("AWS_ENDPOINT_URL is not set (R2 endpoint required)");
  return new S3Client({
    region: process.env.AWS_REGION ?? "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv();

  if (!existsSync(INPUT_DIR)) {
    console.error(`Input directory not found: ${INPUT_DIR}`);
    console.error("Run scripts/generate-living-tree-plates.py first.");
    process.exit(1);
  }

  const files = readdirSync(INPUT_DIR).filter((f) => f.endsWith(".png"));
  if (files.length === 0) {
    console.error("No PNG files found in", INPUT_DIR);
    process.exit(1);
  }

  const bucket = process.env.AWS_BUCKET_NAME;
  if (!bucket && !DRY_RUN) {
    console.error("AWS_BUCKET_NAME is not set.");
    process.exit(1);
  }

  console.log(`\n=== Living Tree R2 upload (${DRY_RUN ? "DRY RUN" : "LIVE"}) ===`);
  console.log(`    ${files.length} files from ${INPUT_DIR}`);
  console.log(`    bucket: ${bucket ?? "(dry run)"}\n`);

  const client = DRY_RUN ? null : makeClient();
  const results = [];

  for (const file of files) {
    const name = basename(file, ".png"); // e.g. "flowering-tree-summer"
    // Validate file name matches expected pattern
    const parts = name.split("-");
    // season is the last segment, stage is everything before
    const season = parts[parts.length - 1];
    const stage = parts.slice(0, -1).join("-");
    if (!VALID_STAGES.includes(stage) || !VALID_SEASONS.includes(season)) {
      console.warn(`  SKIP  ${file}  (unexpected name pattern)`);
      continue;
    }

    const r2Key = `living-tree/${file}`;
    const publicUrl = `https://assets.regencivics.earth/${r2Key}`;

    if (DRY_RUN) {
      console.log(`  WOULD UPLOAD  ${file}  →  ${r2Key}`);
      results.push({ file, r2Key, publicUrl });
      continue;
    }

    try {
      const body = readFileSync(join(INPUT_DIR, file));
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: body,
        ContentType: "image/png",
        CacheControl: "public, max-age=31536000, immutable",
      }));
      console.log(`  ✓  ${file}  →  ${r2Key}`);
      results.push({ file, r2Key, publicUrl });
    } catch (err) {
      console.error(`  ✗  ${file}:  ${err.message}`);
    }
  }

  console.log(`\n=== ${DRY_RUN ? "Dry run" : "Upload"} complete: ${results.length}/${files.length} ===`);
  if (results.length > 0 && !DRY_RUN) {
    console.log("\nProxy URLs (served via /api/img with w=600):");
    for (const r of results) {
      const proxy = `/api/img?url=${encodeURIComponent(r.publicUrl)}&w=600`;
      console.log(`  ${proxy}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
