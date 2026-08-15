/**
 * File storage helpers using Cloudflare R2 / AWS S3
 * Configured via env vars: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 * AWS_BUCKET_NAME, AWS_REGION, AWS_ENDPOINT_URL (R2 endpoint), STORAGE_PUBLIC_URL
 *
 * Includes a storageStream helper so the Express server can proxy R2 objects
 * through /storage/* when the R2 public custom domain is unavailable.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION ?? "auto",
    endpoint: process.env.AWS_ENDPOINT_URL,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });
}

function getBucket(): string {
  const bucket = process.env.AWS_BUCKET_NAME;
  if (!bucket) throw new Error("AWS_BUCKET_NAME is not set");
  return bucket;
}

function publicUrl(key: string): string {
  const base = process.env.STORAGE_PUBLIC_URL;
  if (base) return `${base.replace(/\/$/, "")}/${key}`;
  // Fall back to standard S3 URL pattern
  const bucket = process.env.AWS_BUCKET_NAME ?? "";
  const region = process.env.AWS_REGION ?? "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "application/pdf", "audio/mpeg", "video/mp4",
  // Harvest voice captures (every container MediaRecorder emits across browsers)
  "audio/webm", "audio/mp4", "audio/wav", "audio/ogg", "audio/x-m4a",
  "application/octet-stream", // fallback for unknown
]);

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  // Sanitize key: prevent directory traversal
  let key = relKey.replace(/^\/+/, "").replace(/\.\.\//g, "").replace(/\.\.\\/g, "");
  if (!key || key.includes("..")) throw new Error("Invalid storage key");

  const body = typeof data === "string" ? Buffer.from(data) : data;

  // Size check
  if (body.length > MAX_UPLOAD_SIZE) {
    throw new Error(`File too large: ${(body.length / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_UPLOAD_SIZE / 1024 / 1024}MB limit`);
  }

  // Content type check
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error(`Content type not allowed: ${contentType}`);
  }

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { key, url: publicUrl(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");

  // If there's a public base URL, just return it directly
  if (process.env.STORAGE_PUBLIC_URL) {
    return { key, url: publicUrl(key) };
  }

  // Otherwise generate a presigned URL (valid 1 hour)
  const client = getS3Client();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn: 3600 }
  );
  return { key, url };
}

/**
 * Stream an object directly from R2. Used by the /storage/* proxy route
 * so we don't depend on R2's public custom domain being functional.
 */
export async function storageStream(
  relKey: string
): Promise<{ body: Readable; contentType: string; contentLength: number | undefined }> {
  const key = relKey.replace(/^\/+/, "");
  const client = getS3Client();
  const resp = await client.send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key })
  );
  return {
    body: resp.Body as Readable,
    contentType: resp.ContentType ?? "application/octet-stream",
    contentLength: resp.ContentLength,
  };
}

/**
 * Range-aware stream from R2, so large files (e.g. the PMTiles basemap that
 * protomaps-leaflet reads by HTTP range) can be proxied through the app instead
 * of depending on R2's custom domain serving sub-paths. Pass the request's Range
 * header through verbatim. Returns 206 with Content-Range when a range is served.
 */
export async function storageStreamRange(
  relKey: string,
  range?: string,
): Promise<{
  body: Readable;
  contentType: string;
  contentLength: number | undefined;
  contentRange: string | undefined;
  statusCode: 200 | 206;
}> {
  const key = relKey.replace(/^\/+/, "");
  const client = getS3Client();
  const resp = await client.send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key, ...(range ? { Range: range } : {}) }),
  );
  return {
    body: resp.Body as Readable,
    contentType: resp.ContentType ?? "application/octet-stream",
    contentLength: resp.ContentLength,
    contentRange: resp.ContentRange,
    statusCode: resp.ContentRange ? 206 : 200,
  };
}
