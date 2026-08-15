/**
 * Bearer-token check for the cron endpoints.
 *
 * Lives in its own module so it can be unit-tested. The bug it replaces was
 * copied verbatim into twelve endpoints and could not be tested anywhere,
 * because it was twelve inline expressions inside route handlers:
 *
 *   auth.length === expected.length &&                                 // UTF-16 units
 *   crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(expected))   // UTF-8 bytes
 *
 * `String.length` counts UTF-16 code units; `Buffer.from` counts UTF-8
 * bytes. A header carrying a multi-byte character can therefore pass the
 * length guard and still hand two different-sized buffers to
 * `timingSafeEqual`, which THROWS on unequal lengths. The throw sat outside
 * each handler's try block, Express 4 does not catch async handler
 * rejections, and Node terminates the process on an unhandled rejection: an
 * unauthenticated POST with a crafted Authorization header took the server
 * down. Every cron endpoint was exposed.
 *
 * Comparing the buffers is the whole fix. Length is compared in BYTES, on
 * the same values that get compared, so the two can never disagree.
 */
import crypto from "crypto";

/**
 * True when `authHeader` is exactly `Bearer <secret>`.
 *
 * NEVER throws, whatever the header contains. A caller with no secret
 * configured is a caller that cannot authenticate anybody, so it answers
 * false rather than letting an empty secret match an empty header.
 *
 * The byte-length comparison short-circuits before the constant-time
 * compare, which reveals the length of the expected token and nothing else.
 * That is the standard trade and the reason timingSafeEqual demands equal
 * lengths in the first place.
 */
export function cronAuthOk(authHeader: unknown, secret: string | undefined): boolean {
  if (typeof authHeader !== "string" || !secret) return false;
  const given = Buffer.from(authHeader, "utf8");
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(given, expected);
}
