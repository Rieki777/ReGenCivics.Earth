#!/usr/bin/env node
/**
 * generate-thumbnails.mjs
 *
 * Pre-generates resized WebP thumbnails for R2-hosted images.
 * Fetches each source image from R2 via the S3 API, resizes to 240/480/720px
 * widths using sharp, and uploads the variants back to R2.
 *
 * Usage:
 *   node scripts/generate-thumbnails.mjs
 *
 * Requires env vars: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 *   AWS_BUCKET_NAME, AWS_REGION, AWS_ENDPOINT_URL
 *
 * Output: prints the new R2 URLs for each variant so cdnImg() can be updated.
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

// ── Config ──────────────────────────────────────────────────────────────────
const WIDTHS = [240, 480, 720];
const QUALITY = 75;

// All path card images on the homepage (default + activated)
const SOURCE_KEYS = [
  "lbnKFdCSSCxSsgLa.png",
  "ryfVYMtjiLnLKYwN.png",
  "yqqImtZyZVyKlZyO.png",
  "mgXrrAJIIHwfFWah.png",
  "xlNRfxzajiAdMyaP.png",
  "HQpqacLKyIAkXOdS.png",
  "LAizfmKwiZguwYMz.png",
  "qDmGFHBsFPyCECbM.png",
  // Video thumbnail
  "nAJFMAHKUducxpdN.jpg",
];

// ── S3/R2 client ────────────────────────────────────────────────────────────
function getClient() {
  return new S3Client({
    region: process.env.AWS_REGION ?? "auto",
    endpoint: process.env.AWS_ENDPOINT_URL,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });
}

const BUCKET = process.env.AWS_BUCKET_NAME;
if (!BUCKET) {
  console.error("AWS_BUCKET_NAME is required");
  process.exit(1);
}

const client = getClient();

async function fetchFromR2(key) {
  // Try raw key first, then with bucket prefix (legacy layout)
  const keysToTry = [key];
  if (!key.startsWith("regen-civics-assets/")) {
    keysToTry.push(`regen-civics-assets/${key}`);
  }

  for (const k of keysToTry) {
    try {
      const resp = await client.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: k })
      );
      const chunks = [];
      for await (const chunk of resp.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch {
      continue;
    }
  }
  throw new Error(`Not found in R2: ${key}`);
}

async function uploadToR2(key, buffer, contentType) {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Generating thumbnails for ${SOURCE_KEYS.length} images at widths: ${WIDTHS.join(", ")}px\n`);

  const results = [];

  for (const sourceKey of SOURCE_KEYS) {
    console.log(`Processing: ${sourceKey}`);

    let buffer;
    try {
      buffer = await fetchFromR2(sourceKey);
    } catch (err) {
      console.error(`  SKIP: ${err.message}`);
      continue;
    }

    const baseName = sourceKey.replace(/\.[^.]+$/, "");

    for (const width of WIDTHS) {
      const outKey = `thumbnails/${baseName}-${width}w.webp`;
      try {
        const resized = await sharp(buffer)
          .resize(width, undefined, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toBuffer();

        await uploadToR2(outKey, resized, "image/webp");

        const publicBase = process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, "") ?? `https://assets.regencivics.earth`;
        const url = `${publicBase}/${outKey}`;
        results.push({ source: sourceKey, width, key: outKey, url, size: resized.length });
        console.log(`  ${width}w: ${(resized.length / 1024).toFixed(1)}KB -> ${outKey}`);
      } catch (err) {
        console.error(`  ERROR at ${width}w: ${err.message}`);
      }
    }
  }

  console.log("\n── Summary ──────────────────────────────────────────────");
  console.log(`Generated ${results.length} thumbnails\n`);

  // Print a mapping table for updating cdnImg() calls
  console.log("URL mapping (for updating cdnImg references):\n");
  for (const r of results) {
    console.log(`  ${r.source} @ ${r.width}w -> ${r.url}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
