/**
 * The email sign-in link opens where the person started (2026-09-24).
 *
 * POST /api/auth/email/request stores a normalised returnTo next to the token;
 * GET /api/auth/email/verify redirects there. Anything that is not a same-site
 * path falls back to /profile, and a token still works only once.
 *
 * Run against the SCRATCH database, never production.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("./_core/email", async (orig) => ({
  ...(await orig<typeof import("./_core/email")>()),
  sendEmail: vi.fn().mockResolvedValue({ id: "test-email-id" }),
}));

// The contribution link is slowed down on purpose, so a test can tell whether
// verify waited for it before redirecting.
const linkState = vi.hoisted(() => ({ calls: 0, finished: 0 }));
vi.mock("./routes/campaigns", async (orig) => ({
  ...(await orig<typeof import("./routes/campaigns")>()),
  linkAnonymousContributions: vi.fn(async () => {
    linkState.calls++;
    await new Promise((resolve) => setTimeout(resolve, 250));
    linkState.finished++;
    return { linked: 1, livingTreeAdded: 0 };
  }),
}));

import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { and, eq, like } from "drizzle-orm";
import * as db from "./db";
import { emailTokens, users } from "../drizzle/schema";
import { sendEmail } from "./_core/email";
import { registerOAuthRoutes } from "./_core/oauth";

const skipIfNoDb = !process.env.DATABASE_URL;
const DOMAIN = "@email-return.example.test";
const addr = (n: string) => `${n}${DOMAIN}`;

let server: Server;
let base = "";

async function requestLink(email: string, returnTo?: unknown): Promise<string> {
  vi.mocked(sendEmail).mockClear();
  const res = await fetch(`${base}/api/auth/email/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(returnTo === undefined ? { email } : { email, returnTo }),
  });
  expect(res.status).toBe(200);
  const html = String(vi.mocked(sendEmail).mock.calls[0]?.[0]?.html ?? "");
  const token = /\/api\/auth\/email\/verify\?token=([A-Za-z0-9_-]+)/.exec(html)?.[1];
  expect(token, "the email carries the verify link").toBeTruthy();
  // The link carries the token and nothing else.
  expect(html).not.toContain("returnTo");
  return token!;
}

async function verify(token: string): Promise<{ status: number; location: string | null }> {
  const res = await fetch(`${base}/api/auth/email/verify?token=${token}`, { redirect: "manual" });
  return { status: res.status, location: res.headers.get("location") };
}

async function storedReturnTo(token: string): Promise<string | null | undefined> {
  const database = await db.getDb();
  const rows = await database!.select().from(emailTokens).where(eq(emailTokens.token, token)).limit(1);
  return rows[0]?.returnTo;
}

async function cleanup() {
  const database = await db.getDb();
  if (!database) return;
  await database.delete(emailTokens).where(like(emailTokens.email, `%${DOMAIN}`));
  await database.delete(users).where(like(users.openId, `email:%${DOMAIN}`));
}

describe.skipIf(skipIfNoDb)("email sign-in link returns to where the person started", () => {
  beforeAll(async () => {
    await cleanup();
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
    await cleanup();
  });

  it("opens the page the person asked from, hash included", async () => {
    const path = "/project/hill-farm?campaign=3#your-contributions";
    const token = await requestLink(addr("roundtrip"), path);
    expect(await storedReturnTo(token)).toBe(path);
    const out = await verify(token);
    expect(out.status).toBe(302);
    expect(out.location).toBe(path);
  });

  it("will not open the same link twice", async () => {
    const token = await requestLink(addr("replay"), "/profile?tab=tasks");
    expect((await verify(token)).location).toBe("/profile?tab=tasks");
    const again = await verify(token);
    expect(again.status).toBe(302);
    expect(again.location).toBe("/?error=expired_token");
  });

  it.each([
    ["protocol-relative", "//evil.example"],
    ["absolute URL", "https://evil.example"],
    ["backslash", "/\\evil.example"],
    ["encoded slashes", "%2F%2Fevil.example"],
    ["encoded slashes after a slash", "/%2F%2Fevil.example"],
    ["too long", "/" + "a".repeat(600)],
    ["not a string", { path: "/profile" }],
    // A second endpoint chained onto a genuine link would swap the session.
    ["sign-in endpoint", "/api/auth/email/verify?token=someoneelse"],
    ["upper-case endpoint", "/API/auth/email/verify?token=someoneelse"],
    ["dot-segment endpoint", "/profile/../api/auth/email/verify?token=someoneelse"],
    ["OAuth endpoint", "/api/oauth/google?returnTo=/profile"],
  ])("falls back to /profile for a %s returnTo", async (_label, returnTo) => {
    const token = await requestLink(addr(`hostile-${Math.random().toString(36).slice(2, 8)}`), returnTo);
    expect(await storedReturnTo(token)).toBeNull();
    expect((await verify(token)).location).toBe("/profile");
  });

  it("keeps a path whose query holds an encoded percent sign", async () => {
    const path = "/community/search?q=100%25";
    const token = await requestLink(addr("percent"), path);
    expect(await storedReturnTo(token)).toBe(path);
    expect((await verify(token)).location).toBe(path);
  });

  it("stores no secret from the page's query string", async () => {
    const token = await requestLink(addr("secret"), "/blog/my-post?preview=secret123#top");
    expect(await storedReturnTo(token)).toBe("/blog/my-post#top");
  });

  it("refuses a form post, which any other site could send", async () => {
    const email = addr("formpost");
    const res = await fetch(`${base}/api/auth/email/request`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email, returnTo: "/profile" }).toString(),
    });
    expect(res.status).toBe(415);
    const database = await db.getDb();
    const rows = await database!.select().from(emailTokens).where(eq(emailTokens.email, email));
    expect(rows).toHaveLength(0);
  });

  it("refuses a request the browser marks cross-site", async () => {
    const email = addr("crosssite");
    const res = await fetch(`${base}/api/auth/email/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "cross-site" },
      body: JSON.stringify({ email }),
    });
    expect(res.status).toBe(403);
    const database = await db.getDb();
    const rows = await database!.select().from(emailTokens).where(eq(emailTokens.email, email));
    expect(rows).toHaveLength(0);
  });

  it("links the person's offers before it redirects", async () => {
    const token = await requestLink(addr("linkfirst"), "/project/hill-farm#your-contributions");
    const before = linkState.finished;
    const out = await verify(token);
    expect(out.location).toBe("/project/hill-farm#your-contributions");
    expect(linkState.finished).toBe(before + 1);
  });

  it("clears token rows more than a day past their expiry", async () => {
    const database = await db.getDb();
    const oldEmail = addr("old");
    await database!.insert(emailTokens).values({
      email: oldEmail,
      token: `old-${Math.random().toString(36).slice(2, 12)}`,
      expiresAt: new Date(Date.now() - db.EMAIL_TOKEN_RETENTION_MS - 60_000),
      usedAt: new Date(Date.now() - db.EMAIL_TOKEN_RETENTION_MS - 120_000),
      returnTo: "/blog/old",
    });
    const recentEmail = addr("recent");
    const recentToken = `recent-${Math.random().toString(36).slice(2, 12)}`;
    await database!.insert(emailTokens).values({
      email: recentEmail,
      token: recentToken,
      expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      usedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });
    await requestLink(addr("retention"), "/profile");
    expect(await database!.select().from(emailTokens).where(eq(emailTokens.email, oldEmail))).toHaveLength(0);
    // A used row from an hour ago is still inside the day.
    expect(
      await database!
        .select()
        .from(emailTokens)
        .where(and(eq(emailTokens.email, recentEmail), eq(emailTokens.token, recentToken))),
    ).toHaveLength(1);
  });

  it("falls back to /profile when no returnTo was sent", async () => {
    const token = await requestLink(addr("none"));
    expect((await verify(token)).location).toBe("/profile");
  });

  it("re-checks a stored value on the way out", async () => {
    // A row written some other way still cannot send anyone off-site.
    const token = await requestLink(addr("tampered"), "/profile");
    const database = await db.getDb();
    await database!.update(emailTokens).set({ returnTo: "//evil.example" }).where(eq(emailTokens.token, token));
    expect((await verify(token)).location).toBe("/profile");
  });
});
