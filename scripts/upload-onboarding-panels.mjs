#!/usr/bin/env node
/**
 * upload-onboarding-panels.mjs
 *
 * Uploads the four QuestGameIntro panel images from generated/onboarding/ to
 * Cloudflare R2 under the key  generated/onboarding/panel-{1..4}.webp
 *
 * After uploading, images are served via the /api/img proxy, which is what
 * cdnImg() in client/src/lib/utils.ts produces:
 *   /api/img?url=https://assets.regencivics.earth/generated/onboarding/panel-1.webp&w=800
 *
 * Usage:
 *   node scripts/upload-onboarding-panels.mjs [--dry-run]
 *
 * Reads env from .env at repo root (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 * AWS_BUCKET_NAME, AWS_ENDPOINT_URL, AWS_REGION).
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const INPUT_DIR = join(REPO_ROOT, "generated", "onboarding");
const DRY_RUN = process.argv.includes("--dry-run");

const PANELS = ["panel-1.webp", "panel-2.webp", "panel-3.webp", "panel-4.webp"];

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(REPO_ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
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
    process.exit(1);
  }

  const bucket = process.env.AWS_BUCKET_NAME;
  if (!bucket && !DRY_RUN) {
    console.error("AWS_BUCKET_NAME is not set.");
    process.exit(1);
  }

  console.log(`\n=== Onboarding panel R2 upload (${DRY_RUN ? "DRY RUN" : "LIVE"}) ===`);
  console.log(`    bucket: ${bucket ?? "(dry run)"}\n`);

  const client = DRY_RUN ? null : makeClient();
  let failed = 0;

  for (const file of PANELS) {
    const path = join(INPUT_DIR, file);
    if (!existsSync(path)) {
      console.error(`  MISSING  ${file}`);
      failed++;
      continue;
    }

    const r2Key = `generated/onboarding/${file}`;

    if (DRY_RUN) {
      console.log(`  WOULD UPLOAD  ${file}  →  ${r2Key}`);
      continue;
    }

    try {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: readFileSync(path),
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }));
      console.log(`  ok  ${file}  →  https://assets.regencivics.earth/${r2Key}`);
    } catch (err) {
      console.error(`  FAIL  ${file}: ${err.message}`);
      failed++;
    }
  }

  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}

main();
