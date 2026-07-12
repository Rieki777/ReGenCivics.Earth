/**
 * build-ship-basemap.ts — build and publish the self-hosted treasure-map basemap.
 *
 * Extracts a US-Cascadia slice of the Protomaps daily planet build into a single
 * PMTiles archive and uploads it to R2 at assets.regencivics.earth/ship/basemap.pmtiles.
 * The client (client/src/pages/ship/ShipMap.tsx) reads that URL via HTTP range
 * requests through protomaps-leaflet. No OSM tile origin, no CSP widening (ADR-34).
 *
 * WHAT IT DOES
 *   1. Ensures the `pmtiles` (go-pmtiles) binary is available: uses one on PATH,
 *      else downloads a pinned release into scripts/.bin and extracts it.
 *   2. Runs `pmtiles extract <build-url> <out> --bbox=W,S,E,N --maxzoom=15`
 *      against the latest daily build (build.protomaps.com). Expect 1-3 GB.
 *   3. Multipart-uploads the archive to R2 using the process-core-assets.ts S3
 *      credentials (AWS_BUCKET_NAME / AWS_REGION / AWS_ENDPOINT_URL /
 *      AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).
 *
 * USAGE (from repo root)
 *   npx tsx scripts/build-ship-basemap.ts                 # extract + upload
 *   npx tsx scripts/build-ship-basemap.ts --dry-run       # extract only, no upload
 *   npx tsx scripts/build-ship-basemap.ts --skip-extract  # upload an existing file
 *   npx tsx scripts/build-ship-basemap.ts --build-url=https://build.protomaps.com/20260709.pmtiles
 *   npx tsx scripts/build-ship-basemap.ts --file=/path/to/basemap.pmtiles
 *
 * REFRESH CADENCE: re-run quarterly, or when the region needs newer OSM edits.
 * The daily build URL rolls forward; pass --build-url to pin a specific date.
 *
 * If the R2 creds are absent locally, the script extracts (when possible) and
 * then prints the exact upload command for the credential holder to run once.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BIN_DIR = join(REPO_ROOT, "scripts", ".bin");
const SCRATCH = join(REPO_ROOT, "scripts", ".cache");

// US-Cascadia: Cape Mendocino to the Canadian border, coast to the divide.
// Keep in sync with client/src/pages/ship/shipMapConfig.ts CASCADIA_BBOX.
const BBOX = { west: -126.0, south: 39.5, east: -110.5, north: 49.5 };
const MAXZOOM = 15;

// Pinned go-pmtiles release (bump deliberately).
const PMTILES_VERSION = "1.28.1";
const R2_KEY = "ship/basemap.pmtiles";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SKIP_EXTRACT = args.includes("--skip-extract");
const arg = (name: string): string | undefined => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

function yesterdayUTC(): string {
  // The daily build for "today" may not be published yet; yesterday is safe.
  // (Date is used only to construct a default URL; override with --build-url.)
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

const BUILD_URL = arg("build-url") ?? `https://build.protomaps.com/${yesterdayUTC()}.pmtiles`;
const OUT_FILE = arg("file") ?? join(SCRATCH, "ship-basemap.pmtiles");

function platformAsset(): { asset: string; archive: "zip" | "tar.gz"; exe: string } {
  const os = process.platform;
  const arch = process.arch === "arm64" ? "arm64" : "x86_64";
  if (os === "win32") return { asset: `go-pmtiles_${PMTILES_VERSION}_Windows_${arch}.zip`, archive: "zip", exe: "pmtiles.exe" };
  if (os === "darwin") return { asset: `go-pmtiles_${PMTILES_VERSION}_Darwin_${arch}.tar.gz`, archive: "tar.gz", exe: "pmtiles" };
  return { asset: `go-pmtiles_${PMTILES_VERSION}_Linux_${arch}.tar.gz`, archive: "tar.gz", exe: "pmtiles" };
}

function onPath(cmd: string): boolean {
  const probe = spawnSync(cmd, ["version"], { stdio: "ignore" });
  return !probe.error;
}

async function ensurePmtilesBinary(): Promise<string> {
  if (onPath("pmtiles")) return "pmtiles";
  const { asset, archive, exe } = platformAsset();
  const localExe = join(BIN_DIR, exe);
  if (existsSync(localExe)) return localExe;

  mkdirSync(BIN_DIR, { recursive: true });
  const url = `https://github.com/protomaps/go-pmtiles/releases/download/v${PMTILES_VERSION}/${asset}`;
  const archivePath = join(BIN_DIR, asset);
  console.log(`Downloading go-pmtiles ${PMTILES_VERSION} for ${process.platform}/${process.arch}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}. Install go-pmtiles manually and put it on PATH.`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { writeFileSync } = await import("node:fs");
  writeFileSync(archivePath, buf);

  // Extract. On Windows, a GNU `tar` on PATH (e.g. Git Bash) misreads the
  // `C:\...` archive path as a remote host ("Cannot connect to C:"), so use
  // PowerShell's Expand-Archive there. bsdtar handles both .tar.gz and .zip
  // uniformly on macOS/Linux.
  const ex =
    process.platform === "win32"
      ? spawnSync(
          "powershell",
          ["-NoProfile", "-Command", `Expand-Archive -Path "${archivePath}" -DestinationPath "${BIN_DIR}" -Force`],
          { stdio: "inherit" },
        )
      : spawnSync("tar", ["-xf", archivePath, "-C", BIN_DIR], { stdio: "inherit" });
  if (ex.status !== 0) throw new Error(`Failed to extract ${asset}. Extract it manually into ${BIN_DIR}.`);
  if (!existsSync(localExe)) throw new Error(`Extracted archive but ${localExe} not found. Check the release layout.`);
  if (process.platform !== "win32") spawnSync("chmod", ["+x", localExe]);
  return localExe;
}

function s3(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION || "auto",
    ...(process.env.AWS_ENDPOINT_URL ? { endpoint: process.env.AWS_ENDPOINT_URL } : {}),
    // R2 uploads over a home connection can reset mid-part; give the SDK more
    // attempts on top of the manual per-part retry below.
    maxAttempts: 8,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
}

// Smaller parts survive a flaky link far better than 100 MB parts: each PUT is
// shorter, so a reset costs one small part, not a huge one.
const PART_SIZE = 16 * 1024 * 1024; // 16 MB parts

async function multipartUpload(file: string) {
  const client = s3();
  const Bucket = process.env.AWS_BUCKET_NAME!;
  const size = statSync(file).size;
  console.log(`Uploading ${(size / 1e9).toFixed(2)} GB to r2://${Bucket}/${R2_KEY} in ${Math.ceil(size / PART_SIZE)} parts...`);

  const created = await client.send(
    new CreateMultipartUploadCommand({ Bucket, Key: R2_KEY, ContentType: "application/octet-stream", CacheControl: "public, max-age=86400" }),
  );
  const uploadId = created.UploadId!;
  const parts: { ETag: string; PartNumber: number }[] = [];
  try {
    const fd = createReadStream(file, { highWaterMark: PART_SIZE });
    let partNumber = 1;
    let chunks: Buffer[] = [];
    let chunksLen = 0;
    const flush = async () => {
      const body = Buffer.concat(chunks, chunksLen);
      chunks = [];
      chunksLen = 0;
      const thisPart = partNumber;
      // Manual per-part retry: the whole part is in memory, so re-sending the
      // same buffer after an ECONNRESET is safe and idempotent.
      let lastErr: unknown;
      for (let attempt = 1; attempt <= 6; attempt++) {
        try {
          const res = await client.send(new UploadPartCommand({ Bucket, Key: R2_KEY, UploadId: uploadId, PartNumber: thisPart, Body: body }));
          parts.push({ ETag: res.ETag!, PartNumber: thisPart });
          console.log(`  part ${thisPart} (${(body.length / 1e6).toFixed(0)} MB)${attempt > 1 ? ` after ${attempt} tries` : ""}`);
          partNumber++;
          return;
        } catch (err) {
          lastErr = err;
          const wait = Math.min(30000, 1000 * 2 ** (attempt - 1));
          console.warn(`  part ${thisPart} attempt ${attempt} failed (${(err as { code?: string })?.code ?? "error"}); retrying in ${wait / 1000}s`);
          await new Promise((r) => setTimeout(r, wait));
        }
      }
      throw lastErr;
    };
    for await (const chunk of fd) {
      chunks.push(chunk as Buffer);
      chunksLen += (chunk as Buffer).length;
      if (chunksLen >= PART_SIZE) await flush();
    }
    if (chunksLen > 0) await flush();

    await client.send(new CompleteMultipartUploadCommand({ Bucket, Key: R2_KEY, UploadId: uploadId, MultipartUpload: { Parts: parts } }));
    console.log(`Done. Basemap live at https://assets.regencivics.earth/${R2_KEY}`);
  } catch (err) {
    await client.send(new AbortMultipartUploadCommand({ Bucket, Key: R2_KEY, UploadId: uploadId })).catch(() => {});
    throw err;
  }
}

function hasR2Creds(): boolean {
  return Boolean(process.env.AWS_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

async function main() {
  mkdirSync(SCRATCH, { recursive: true });

  if (!SKIP_EXTRACT) {
    const bin = await ensurePmtilesBinary();
    const bboxArg = `${BBOX.west},${BBOX.south},${BBOX.east},${BBOX.north}`;
    console.log(`Extracting Cascadia [${bboxArg}] maxzoom=${MAXZOOM} from ${BUILD_URL}`);
    console.log(`  -> ${OUT_FILE}`);
    const run = spawnSync(bin, ["extract", BUILD_URL, OUT_FILE, `--bbox=${bboxArg}`, `--maxzoom=${MAXZOOM}`], { stdio: "inherit" });
    if (run.status !== 0) {
      console.error("\npmtiles extract failed. If the daily build URL 404s, pass a valid date:");
      console.error("  npx tsx scripts/build-ship-basemap.ts --build-url=https://build.protomaps.com/YYYYMMDD.pmtiles");
      process.exit(1);
    }
  }

  if (!existsSync(OUT_FILE)) {
    console.error(`No basemap file at ${OUT_FILE}. Run without --skip-extract, or pass --file=<path>.`);
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log(`[dry-run] Extracted ${(statSync(OUT_FILE).size / 1e9).toFixed(2)} GB. Skipping upload.`);
    return;
  }

  if (!hasR2Creds()) {
    console.log("\nR2 credentials are not in this environment. The basemap was built but not uploaded.");
    console.log("Run this once where the R2 creds live (Rye's machine), from the repo root:\n");
    console.log(`  npx tsx scripts/build-ship-basemap.ts --skip-extract --file="${OUT_FILE}"\n`);
    console.log("(or re-run the full command there to build + upload in one step.)");
    return;
  }

  await multipartUpload(OUT_FILE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
