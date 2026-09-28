/**
 * Each mounted rate limiter counts on its own (build spec 2026-09-27,
 * section 7.3, finding F1).
 *
 * rateLimitMiddleware keyed its counter on req.path. Inside
 * app.use('/api/auth/email/request', ...) Express strips the mount, so
 * req.path is '/' on every mounted route: the sign-in link, OAuth, webhooks,
 * newsletter, forum and governance limiters all shared one counter per IP,
 * with whichever window wrote it first. The key is now the full route
 * (req.baseUrl + req.path), lowercased.
 *
 * No Redis in tests, so this runs the in-memory fallback, the same code path
 * production takes when Redis is down. No database.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { rateLimitMiddleware, rateLimitRouteKey } from "./_core/security";

let server: Server;
let base = "";
let ipCounter = 0;
/** A fresh client address per test, so one test's counts never reach another's. */
const nextIp = () => `203.0.113.${++ipCounter}`;

beforeAll(async () => {
  const app = express();
  // The limiter reads req.ip; behind Railway's proxy that is X-Forwarded-For.
  app.set("trust proxy", true);
  app.use("/api/first", rateLimitMiddleware(60 * 1000, 2));
  app.use("/api/second", rateLimitMiddleware(60 * 1000, 2));
  app.use("/api/auth/email/request", rateLimitMiddleware(60 * 1000, 5));
  app.use("/api/oauth", rateLimitMiddleware(60 * 1000, 10));
  const ok = (_req: express.Request, res: express.Response) => { res.json({ ok: true }); };
  app.all("/api/first", ok);
  app.all("/api/second", ok);
  app.post("/api/auth/email/request", ok);
  app.get("/api/oauth/google", ok);
  app.get("/api/oauth/google/callback", ok);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
});

async function hit(path: string, ip: string, method: "GET" | "POST" = "GET"): Promise<number> {
  const res = await fetch(`${base}${path}`, { method, headers: { "X-Forwarded-For": ip } });
  await res.text();
  return res.status;
}

describe("the limiter key", () => {
  it("is the mount plus the path, lowercased", () => {
    expect(rateLimitRouteKey({ baseUrl: "/api/auth/email/request", path: "/" })).toBe("_api_auth_email_request_");
    expect(rateLimitRouteKey({ baseUrl: "/API/Auth/Email/Request", path: "/" })).toBe("_api_auth_email_request_");
    expect(rateLimitRouteKey({ baseUrl: "/api/oauth", path: "/google/callback" })).toBe("_api_oauth_google_callback");
    // Not mounted: the whole path is req.path.
    expect(rateLimitRouteKey({ baseUrl: "", path: "/api/chat/stream" })).toBe("_api_chat_stream");
    // Two mounts never share a key (they all read "_" before the fix).
    expect(rateLimitRouteKey({ baseUrl: "/api/first", path: "/" }))
      .not.toBe(rateLimitRouteKey({ baseUrl: "/api/second", path: "/" }));
  });
});

describe("mounted limiters", () => {
  it("two limiters on two paths keep separate counts", async () => {
    const ip = nextIp();
    expect(await hit("/api/first", ip)).toBe(200);
    expect(await hit("/api/first", ip)).toBe(200);
    expect(await hit("/api/first", ip)).toBe(429);
    // The second route has its own two. Before the fix it shared the first's
    // counter and refused straight away.
    expect(await hit("/api/second", ip)).toBe(200);
    expect(await hit("/api/second", ip)).toBe(200);
    expect(await hit("/api/second", ip)).toBe(429);
  });

  it("the sign-in path still refuses its sixth request in a minute", async () => {
    const ip = nextIp();
    for (let i = 0; i < 5; i++) expect(await hit("/api/auth/email/request", ip, "POST")).toBe(200);
    expect(await hit("/api/auth/email/request", ip, "POST")).toBe(429);
    // Another network still gets through.
    expect(await hit("/api/auth/email/request", nextIp(), "POST")).toBe(200);
  });

  it("a case variant of the path counts on the same counter", async () => {
    const ip = nextIp();
    for (let i = 0; i < 5; i++) expect(await hit("/api/auth/email/request", ip, "POST")).toBe(200);
    expect(await hit("/API/Auth/Email/Request", ip, "POST")).toBe(429);
  });

  it("the sign-in path's count does not use up another route's", async () => {
    const ip = nextIp();
    for (let i = 0; i < 5; i++) await hit("/api/auth/email/request", ip, "POST");
    expect(await hit("/api/auth/email/request", ip, "POST")).toBe(429);
    expect(await hit("/api/oauth/google", ip)).toBe(200);
    expect(await hit("/api/first", ip)).toBe(200);
  });
});
