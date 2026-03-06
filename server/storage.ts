/**
 * File storage helpers using Cloudflare R2 / AWS S3
 * Configured via env vars: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 * AWS_BUCKET_NAME, AWS_REGION, AWS_ENDPOINT_URL (R2 endpoint), STORAGE_PUBLIC_URL
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

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

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  const body = typeof data === "string" ? Buffer.from(data) : data;

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
