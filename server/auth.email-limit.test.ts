/**
 * The sign-in link is limited per email address (ruling 2026-09-27; build
 * spec 2026-09-27, section 7.2).
 *
 * POST /api/auth/email/request sends at most 3 links to one address in 15
 * minutes, whatever network asks, on top of the per-IP limit mounted in
 * server/_core/index.ts. The fourth gets 429 with Retry-After and a plain
 * message. The key is a SHA-256 of the trimmed, lowercased address, so case
 * and spaces don't make a new address and no address sits in Redis or a log.
 *
 * The token store and the mailer are mocked: the limit is checked before
 * either, so this needs no database and always runs. The real round trip is
 * server/auth.email-return.test.ts (scratch database).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/email", async (orig) => ({
  ...(await orig<typeof import("./_core/email")>()),
  sendEmail: vi.fn().mockResolvedValue({ id: "test-email-id" }),
}));
vi.mock("./db", async (orig) => ({
  ...(await orig<typeof import("./db")>()),
  createEmailToken: vi.fn().mockResolvedValue(undefined),
}));

import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createHash } from "node:crypto";
import * as db from "./db";
import { sendEmail } from "./_core/email";
import {
  EMAIL_LINK_LIMIT,
  EMAIL_LINK_LIMIT_MAX,
  EMAIL_LINK_LIMIT_WINDOW_MS,
  emailLinkLimitKey,
  registerOAuthRoutes,
} from "./_core/oauth";
import { __resetKeyedLimitsForTests, checkKeyedLimit } from "./rate-limit";

let server: Server;
let base = "";
const tokenMock = vi.mocked(db.createEmailToken);
const sendMock = vi.mocked(sendEmail);

async function requestLink(email: string): Promise<{ status: number; retryAfter: string | null; body: any }> {
  const res = await fetch(`${base}/api/auth/email/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, returnTo: "/profile" }),
  });
  return { status: res.status, retryAfter: res.headers.get("retry-after"), body: await res.json().catch(() => null) };
}

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  registerOAuthRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  __resetKeyedLimitsForTests();
});

beforeEach(() => {
  __resetKeyedLimitsForTests();
  tokenMock.mockClear();
  sendMock.mockClear();
});

describe("three sign-in links per email per 15 minutes", () => {
  it("is 3 in 15 minutes", () => {
    expect(EMAIL_LINK_LIMIT_MAX).toBe(3);
    expect(EMAIL_LINK_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000);
  });

  it("three requests pass; the fourth is 429 with Retry-After and the message, and sends nothing", async () => {
    const email = "rosa@limit.example.test";
    for (let i = 0; i < 3; i++) {
      const ok = await requestLink(email);
      expect(ok.status, `request ${i + 1}`).toBe(200);
      expect(ok.body).toEqual({ success: true });
    }
    expect(tokenMock).toHaveBeenCalledTimes(3);
    expect(sendMock).toHaveBeenCalledTimes(3);

    const refused = await requestLink(email);
    expect(refused.status).toBe(429);
    // Seconds until the oldest of the three leaves the window: about 15 minutes.
    const seconds = Number(refused.retryAfter);
    expect(Number.isInteger(seconds)).toBe(true);
    expect(seconds).toBeGreaterThan(14 * 60);
    expect(seconds).toBeLessThanOrEqual(15 * 60);
    expect(refused.body).toEqual({ error: EMAIL_LINK_LIMIT(15) });
    expect(refused.body.error).toBe(
      "We've sent 3 sign-in links to this email in the last 15 minutes. Check your inbox and spam folder for the newest one, or try again in about 15 minutes.",
    );
    // No token was made, so the newest link in their inbox still works.
    expect(tokenMock).toHaveBeenCalledTimes(3);
    expect(sendMock).toHaveBeenCalledTimes(3);
  });

  it("case and space variants count as one address", async () => {
    expect((await requestLink("Kai@Limit.Example.Test")).status).toBe(200);
    expect((await requestLink("  kai@limit.example.test ")).status).toBe(200);
    expect((await requestLink("KAI@LIMIT.EXAMPLE.TEST")).status).toBe(200);
    expect((await requestLink("kai@limit.example.test")).status).toBe(429);
  });

  it("another address still passes", async () => {
    for (let i = 0; i < 3; i++) await requestLink("full@limit.example.test");
    expect((await requestLink("full@limit.example.test")).status).toBe(429);
    expect((await requestLink("other@limit.example.test")).status).toBe(200);
  });

  it("a request the form checks refuse never spends one of the three", async () => {
    const email = "careful@limit.example.test";
    // Refused as a form post (415) before the limit is read.
    const form = await fetch(`${base}/api/auth/email/request`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email }).toString(),
    });
    expect(form.status).toBe(415);
    for (let i = 0; i < 3; i++) expect((await requestLink(email)).status).toBe(200);
    expect((await requestLink(email)).status).toBe(429);
  });
});

describe("the limiter key and the message", () => {
  it("is a SHA-256 of the trimmed, lowercased address, never the address", () => {
    const key = emailLinkLimitKey("  Rosa@Example.Test ");
    expect(key).toBe(`authmail:${createHash("sha256").update("rosa@example.test").digest("hex")}`);
    expect(key).not.toContain("rosa");
    expect(key).not.toContain("@");
    expect(emailLinkLimitKey("ROSA@EXAMPLE.TEST")).toBe(key);
  });

  it("says minute or minutes", () => {
    expect(EMAIL_LINK_LIMIT(1)).toContain("try again in about 1 minute.");
    expect(EMAIL_LINK_LIMIT(7)).toContain("try again in about 7 minutes.");
    for (const m of [1, 7, 15]) expect(EMAIL_LINK_LIMIT(m)).not.toContain(String.fromCharCode(0x2014));
  });
});

describe("checkKeyedLimit", () => {
  it("counts per key, gives how long until one more passes, and resets for tests", async () => {
    const a = await checkKeyedLimit("test:a", 2, 60_000);
    const b = await checkKeyedLimit("test:a", 2, 60_000);
    expect(a).toEqual({ allowed: true, retryAfterMs: 0 });
    expect(b).toEqual({ allowed: true, retryAfterMs: 0 });
    const c = await checkKeyedLimit("test:a", 2, 60_000);
    expect(c.allowed).toBe(false);
    expect(c.retryAfterMs).toBeGreaterThan(55_000);
    expect(c.retryAfterMs).toBeLessThanOrEqual(60_000);
    expect((await checkKeyedLimit("test:b", 2, 60_000)).allowed).toBe(true);
    __resetKeyedLimitsForTests();
    expect((await checkKeyedLimit("test:a", 2, 60_000)).allowed).toBe(true);
  });

  it("lets one more through once the oldest leaves the window", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-09-27T10:00:00Z"));
      for (let i = 0; i < 3; i++) await checkKeyedLimit("test:window", 3, 15 * 60_000);
      vi.setSystemTime(new Date("2026-09-27T10:05:00Z"));
      const refused = await checkKeyedLimit("test:window", 3, 15 * 60_000);
      expect(refused).toEqual({ allowed: false, retryAfterMs: 10 * 60_000 });
      vi.setSystemTime(new Date("2026-09-27T10:15:00Z"));
      expect((await checkKeyedLimit("test:window", 3, 15 * 60_000)).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
