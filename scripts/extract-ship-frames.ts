/**
 * extract-ship-frames.ts
 *
 * For every transcribed Ship's-Inventory item that has a sourceVideo +
 * sourceTimestamp, grab that exact frame from the RV walkthrough MOV with
 * ffmpeg, upload it to Cloudflare R2 under ship/frames/<slug>.jpg, and set the
 * row's frameUrl. The detail sub-page (/ship/inventory/:slug) shows these real
 * photos; the overview keeps using the generated iconUrl.
 *
 * Idempotent: rows that already have a frameUrl are skipped (unless --force).
 *
 * Usage:
 *   npx tsx scripts/extract-ship-frames.ts --dry-run   # plan only, no ffmpeg/upload/DB
 *   npx tsx scripts/extract-ship-frames.ts             # extract + upload to R2 + set frameUrl
 *   npx tsx scripts/extract-ship-frames.ts --local     # write to client/public/ship/frames instead of R2
 *   npx tsx scripts/extract-ship-frames.ts --force     # re-extract even if frameUrl is already set
 *
 * Needs the walkthrough MOVs in VIDEO_DIR and (for R2) AWS_* creds in .env.
 * DATABASE_URL is required for the real run.
 */
import mysql from "mysql2/promise";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";
import * as dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();

const isDryRun = process.argv.includes("--dry-run");
const isLocal = process.argv.includes("--local");
const isForce = process.argv.includes("--force");

const VIDEO_DIR = process.env.SHIP_VIDEO_DIR || "C:/Users/taren/Downloads/rv-inventory-work";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const REPO_ROOT = path.resolve(process.cwd());
const PUBLIC_FRAMES_DIR = path.join(REPO_ROOT, "client", "public", "ship", "frames");
const ASSETS_BASE = "https://assets.regencivics.earth";

interface Row {
  id: number;
  slug: string;
  sourceVideo: string | null;
  sourceTimestamp: string | null;
  frameUrl: string | null;
}

/** "MM:SS" or "HH:MM:SS" -> seconds, or -1 if unparseable (never silently 0). */
function toSeconds(ts: string): number {
  const parts = (ts || "").split(":").map((p) => Number(p.trim()));
  if (!parts.length || parts.some((n) => Number.isNaN(n))) return -1;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function makeR2Client(): S3Client {
  const endpoint = process.env.AWS_ENDPOINT_URL;
  if (!endpoint) throw new Error("AWS_ENDPOINT_URL is not set (R2 endpoint required).");
  return new S3Client({
    region: process.env.AWS_REGION ?? "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });
}

/** Grab one frame at `seconds` into `video`, scaled to 640px wide, as a JPG. */
function grabFrame(video: string, seconds: number, outPath: string): boolean {
  const args = [
    "-y", "-ss", String(seconds), "-i", video,
    "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "3", outPath,
  ];
  const run = spawnSync(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });
  if (run.status !== 0) {
    console.warn(`  ! ffmpeg failed (${run.status}) for ${path.basename(video)}@${seconds}s: ${run.stderr?.toString().split("\n").slice(-3).join(" ")}`);
    return false;
  }
  return fs.existsSync(outPath) && fs.statSync(outPath).size > 0;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url && !isDryRun) {
    console.error("ERROR: DATABASE_URL not set (needed for the real run).");
    process.exit(1);
  }

  // Verify the videos exist up front.
  for (const v of ["IMG_1048.MOV", "IMG_1051.MOV", "IMG_1053.MOV"]) {
    if (!fs.existsSync(path.join(VIDEO_DIR, v))) {
      console.warn(`  ! walkthrough video missing: ${path.join(VIDEO_DIR, v)} (rows from it will be skipped)`);
    }
  }

  if (isDryRun) {
    console.log("DRY RUN — no DB, ffmpeg, or upload. Set DATABASE_URL and drop --dry-run to run for real.");
    console.log(`  video dir: ${VIDEO_DIR}`);
    console.log(`  target:    ${isLocal ? PUBLIC_FRAMES_DIR + " (static)" : "R2 " + (process.env.AWS_BUCKET_NAME ?? "(bucket unset)") + " -> " + ASSETS_BASE + "/ship/frames/<slug>.jpg"}`);
    return;
  }

  const conn = await mysql.createConnection(url!);
  const r2 = isLocal ? null : makeR2Client();
  const bucket = process.env.AWS_BUCKET_NAME;
  if (!isLocal && !bucket) { console.error("ERROR: AWS_BUCKET_NAME not set (needed for R2 upload). Use --local to write static files instead."); process.exit(1); }
  if (isLocal) fs.mkdirSync(PUBLIC_FRAMES_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ship-frames-"));

  try {
    const [rows] = (await conn.execute(
      `SELECT id, slug, sourceVideo, sourceTimestamp, frameUrl
         FROM ship_inventory_items
        WHERE provenance = 'transcribed' AND sourceVideo IS NOT NULL AND sourceTimestamp IS NOT NULL`,
    )) as unknown as [Row[]];

    let done = 0, skipped = 0, failed = 0;
    for (const row of rows) {
      if (row.frameUrl && !isForce) { skipped++; continue; }
      const video = path.join(VIDEO_DIR, row.sourceVideo!);
      if (!fs.existsSync(video)) { failed++; continue; }
      const seconds = toSeconds(row.sourceTimestamp!);
      if (seconds < 0) { console.warn(`  ! unparseable timestamp "${row.sourceTimestamp}" for ${row.slug}, skipping`); failed++; continue; }
      const outPath = isLocal
        ? path.join(PUBLIC_FRAMES_DIR, `${row.slug}.jpg`)
        : path.join(tmpDir, `${row.slug}.jpg`);

      if (!grabFrame(video, seconds, outPath)) { failed++; continue; }

      // One bad row (transient R2 error, locked file) must not abort the batch.
      try {
        let frameUrl: string;
        if (isLocal) {
          frameUrl = `/ship/frames/${row.slug}.jpg`;
        } else {
          const key = `ship/frames/${row.slug}.jpg`;
          const body = fs.readFileSync(outPath);
          await r2!.send(new PutObjectCommand({
            Bucket: bucket, Key: key, Body: body, ContentType: "image/jpeg",
            CacheControl: "public, max-age=31536000, immutable",
          }));
          fs.rmSync(outPath, { force: true });
          // On --force the key is unchanged (immutable-cached at the edge), so add a
          // version query to bust caches when replacing a bad frame.
          frameUrl = `${ASSETS_BASE}/${key}${isForce ? `?v=${Date.now()}` : ""}`;
        }
        await conn.execute("UPDATE ship_inventory_items SET frameUrl = ? WHERE id = ?", [frameUrl, row.id]);
        done++;
        if (done % 20 === 0) console.log(`  ...${done} frames done`);
      } catch (e) {
        console.warn(`  ! failed for ${row.slug}: ${e instanceof Error ? e.message : e}`);
        try { fs.rmSync(outPath, { force: true }); } catch { /* best effort */ }
        failed++;
      }
    }

    console.log(`\nFrames: ${done} extracted+set, ${skipped} skipped (already had frameUrl), ${failed} failed.`);
    console.log(isLocal ? `Wrote static frames to ${PUBLIC_FRAMES_DIR}` : `Uploaded to R2 bucket ${bucket} (served at ${ASSETS_BASE}/ship/frames/).`);
  } finally {
    await conn.end();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* temp cleanup best-effort */ }
  }
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
