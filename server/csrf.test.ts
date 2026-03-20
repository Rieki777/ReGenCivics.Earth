/**
 * Tests for CSRF token generation and validation.
 * Tests the security module functions directly without importing appRouter
 * to avoid module-level side effects (Resend API key requirement).
 */

import { describe, it, expect } from "vitest";
import { generateCSRFToken, validateCSRFToken } from "./_core/security";

describe("CSRF Token Generation and Validation", () => {
  it("generates a token for a session", () => {
    const sessionId = "test-session-gen";
    const token = generateCSRFToken(sessionId);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("validates a correct token", () => {
    const sessionId = "test-session-valid";
    const token = generateCSRFToken(sessionId);
    expect(validateCSRFToken(sessionId, token)).toBe(true);
  });

  it("rejects a wrong token for a valid session", () => {
    const sessionId = "test-session-wrong";
    generateCSRFToken(sessionId);
    expect(validateCSRFToken(sessionId, "wrong-token-value")).toBe(false);
  });

  it("rejects validation when no token has been generated for session", () => {
    const sessionId = "no-token-session-xyz";
    expect(validateCSRFToken(sessionId, "any-token")).toBe(false);
  });

  it("generates unique tokens for different sessions", () => {
    const token1 = generateCSRFToken("session-a");
    const token2 = generateCSRFToken("session-b");
    expect(token1).not.toBe(token2);
  });

  it("regenerates a different token on each call for the same session", () => {
    const sessionId = "session-regen";
    const token1 = generateCSRFToken(sessionId);
    const token2 = generateCSRFToken(sessionId);
    // Tokens are different (new random bytes each time)
    expect(token1).not.toBe(token2);
    // Latest token is valid
    expect(validateCSRFToken(sessionId, token2)).toBe(true);
    // Old token is no longer valid (overwritten)
    expect(validateCSRFToken(sessionId, token1)).toBe(false);
  });
});

describe("CSRF Middleware logic (unit)", () => {
  it("confirms that a mutation without a matching token would be rejected", () => {
    const sessionId = "middleware-test-session";
    const validToken = generateCSRFToken(sessionId);

    // Simulate what the middleware does:
    // - No header provided
    expect(validateCSRFToken(sessionId, "")).toBe(false);
    // - Wrong header
    expect(validateCSRFToken(sessionId, "garbage")).toBe(false);
    // - Correct header
    expect(validateCSRFToken(sessionId, validToken)).toBe(true);
  });

  it("rejects when session_id is missing (empty)", () => {
    const validToken = generateCSRFToken("real-session");
    // No session ID means no record found
    expect(validateCSRFToken("", validToken)).toBe(false);
  });
});
