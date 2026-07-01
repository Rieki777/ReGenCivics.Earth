/**
 * Tests for CSRF token generation and validation.
 * Tests the security module functions directly without importing appRouter
 * to avoid module-level side effects (Resend API key requirement).
 *
 * generateCSRFToken / validateCSRFToken are async (Redis-backed when REDIS_URL
 * is set, in-memory fallback otherwise). With no REDIS_URL in the test env they
 * run against the in-memory store, so behavior matches the pre-Redis contract.
 */

import { describe, it, expect } from "vitest";
import { generateCSRFToken, validateCSRFToken } from "./_core/security";

describe("CSRF Token Generation and Validation", () => {
  it("generates a token for a session", async () => {
    const sessionId = "test-session-gen";
    const token = await generateCSRFToken(sessionId);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("validates a correct token", async () => {
    const sessionId = "test-session-valid";
    const token = await generateCSRFToken(sessionId);
    expect(await validateCSRFToken(sessionId, token)).toBe(true);
  });

  it("rejects a wrong token for a valid session", async () => {
    const sessionId = "test-session-wrong";
    await generateCSRFToken(sessionId);
    expect(await validateCSRFToken(sessionId, "wrong-token-value")).toBe(false);
  });

  it("rejects validation when no token has been generated for session", async () => {
    const sessionId = "no-token-session-xyz";
    expect(await validateCSRFToken(sessionId, "any-token")).toBe(false);
  });

  it("generates unique tokens for different sessions", async () => {
    const token1 = await generateCSRFToken("session-a");
    const token2 = await generateCSRFToken("session-b");
    expect(token1).not.toBe(token2);
  });

  it("regenerates a different token on each call for the same session", async () => {
    const sessionId = "session-regen";
    const token1 = await generateCSRFToken(sessionId);
    const token2 = await generateCSRFToken(sessionId);
    // Tokens are different (new random bytes each time)
    expect(token1).not.toBe(token2);
    // Latest token is valid
    expect(await validateCSRFToken(sessionId, token2)).toBe(true);
    // Old token is no longer valid (overwritten)
    expect(await validateCSRFToken(sessionId, token1)).toBe(false);
  });
});

describe("CSRF Middleware logic (unit)", () => {
  it("confirms that a mutation without a matching token would be rejected", async () => {
    const sessionId = "middleware-test-session";
    const validToken = await generateCSRFToken(sessionId);

    // Simulate what the middleware does:
    // - No header provided
    expect(await validateCSRFToken(sessionId, "")).toBe(false);
    // - Wrong header
    expect(await validateCSRFToken(sessionId, "garbage")).toBe(false);
    // - Correct header
    expect(await validateCSRFToken(sessionId, validToken)).toBe(true);
  });

  it("rejects when session_id is missing (empty)", async () => {
    const validToken = await generateCSRFToken("real-session");
    // No session ID means no record found
    expect(await validateCSRFToken("", validToken)).toBe(false);
  });
});
