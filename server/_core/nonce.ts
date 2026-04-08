/**
 * Per-request CSP nonce generator.
 *
 * Used by cspNonceMiddleware in security.ts to mint a fresh
 * cryptographically random token for each HTTP response. The token is
 * embedded into the Content-Security-Policy header AND into the
 * inline `<script nonce="...">` and `<style nonce="...">` elements
 * the HTML template emits.
 *
 * 16 bytes of randomness encoded as base64url is the OWASP-recommended
 * minimum for nonces (~96 bits of entropy).
 */
import crypto from "node:crypto";

export function generateNonce(length = 16): string {
  return crypto.randomBytes(length).toString("base64url");
}
