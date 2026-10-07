/**
 * Seal a server-only secret before it is written to the database.
 * The key is a server secret (JWT_SECRET). Ciphertext is not a log line.
 */
import crypto from "node:crypto";

export function sealSecret(plain: string, keyMaterial: string): string {
  const key = crypto.createHash("sha256").update(keyMaterial).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function openSecret(sealed: string, keyMaterial: string): string {
  const [version, ivPart, tagPart, dataPart] = sealed.split(".");
  if (version !== "v1" || !ivPart || !tagPart || !dataPart) {
    throw new Error("stored secret could not be read");
  }
  try {
    const key = crypto.createHash("sha256").update(keyMaterial).digest();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]);
    return plain.toString("utf8");
  } catch {
    throw new Error("stored secret could not be read");
  }
}
