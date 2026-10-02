/**
 * A check-in link names one event and one email. The shared event token
 * used to accept any address and mint $ReGen for it. A follow-up letter
 * carries this token instead.
 */
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "../_core/env";

const PURPOSE = "event-checkin";
const TTL = "30d";

export type CheckinClaim = {
  eventId: number;
  email: string;
};

function secretBytes(secret?: string): Uint8Array {
  const value = secret ?? ENV.cookieSecret;
  if (!value) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function signCheckinToken(
  eventId: number,
  email: string,
  opts?: { secret?: string },
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  if (!Number.isInteger(eventId) || eventId <= 0) throw new Error("eventId is required");
  if (!normalized.includes("@")) throw new Error("email is required");
  return new SignJWT({ purpose: PURPOSE, eventId, email: normalized })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(TTL)
    .sign(secretBytes(opts?.secret));
}

export async function verifyCheckinToken(
  token: string,
  opts?: { secret?: string },
): Promise<CheckinClaim | null> {
  try {
    const { payload } = await jwtVerify(token, secretBytes(opts?.secret));
    const eventId = payload.eventId;
    const email = payload.email;
    if (payload.purpose !== PURPOSE) return null;
    if (typeof eventId !== "number" || !Number.isInteger(eventId) || eventId <= 0) return null;
    if (typeof email !== "string" || !email.includes("@")) return null;
    return { eventId, email: email.trim().toLowerCase() };
  } catch {
    return null;
  }
}

export function checkinUrlForToken(baseUrl: string, token: string): string {
  const url = new URL("/checkin", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
