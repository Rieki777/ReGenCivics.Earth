/**
 * Signs preference, unsubscribe, and newsletter-confirm links.
 *
 * New links use EMAIL_LINK_SECRET when it is set. Verification still accepts
 * JWT_SECRET, so a footer already sent keeps working until that token expires
 * (preference links are 365 days, confirm links are 24 hours).
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { ENV } from "../_core/env";

function encode(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function dedicatedSecret(): string {
  return process.env.EMAIL_LINK_SECRET?.trim() ?? "";
}

/** Key used for new links. Falls back to JWT_SECRET until EMAIL_LINK_SECRET is set. */
export function emailLinkSigningKey(): Uint8Array {
  const dedicated = dedicatedSecret();
  if (dedicated) return encode(dedicated);
  const legacy = ENV.cookieSecret?.trim();
  if (!legacy) throw new Error("JWT_SECRET is required to sign email links");
  return encode(legacy);
}

/** Dedicated secret first, then JWT_SECRET. Duplicate values are tried once. */
export function emailLinkVerifyKeys(): Uint8Array[] {
  const keys: Uint8Array[] = [];
  const seen = new Set<string>();
  for (const value of [dedicatedSecret(), ENV.cookieSecret?.trim() ?? ""]) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    keys.push(encode(value));
  }
  return keys;
}

export async function signEmailLink(claims: JWTPayload, expiresIn: string): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(emailLinkSigningKey());
}

export async function verifyEmailLink(token: string): Promise<JWTPayload | null> {
  for (const key of emailLinkVerifyKeys()) {
    try {
      const { payload } = await jwtVerify(token, key);
      return payload;
    } catch {
      continue;
    }
  }
  return null;
}
