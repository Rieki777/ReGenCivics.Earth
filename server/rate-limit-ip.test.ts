/**
 * The per-IP limit on tRPC procedures keys on the address Express trusts
 * (security review 2026-09-28).
 *
 * getClientIp read the FIRST X-Forwarded-For entry. The client writes that
 * one, and Railway's edge appends the real address after it, so a caller
 * who changed it on each request got a fresh counter every time: the offer
 * status link's 60 views and 10 writes per 15 minutes, waitlist joins and
 * email follows were all unlimited. It now reads req.ip, which Express
 * works out under `trust proxy` 1 (server/_core/index.ts), the same as
 * rateLimitMiddleware.
 *
 * A real Express app, so req.ip comes from the real proxy handling. No
 * Redis (the in-memory path), no database.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";
import { checkRateLimit, getClientIp } from "./rate-limit";

let server: Server;
let base = "";

beforeAll(async () => {
  const app = express();
  app.set("trust proxy", 1);
  app.get("/ip", (req, res) => {
    res.json({ ip: getClientIp(req) });
  });
  app.post("/limited/:action", async (req, res) => {
    const ctx = { req, res, user: null, authMethod: null } as unknown as TrpcContext;
    try {
      await checkRateLimit(ctx, req.params.action);
      res.json({ ok: true });
    } catch (err) {
      res.status(err instanceof TRPCError && err.code === "TOO_MANY_REQUESTS" ? 429 : 500).json({});
    }
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
});

async function ipFor(xff?: string): Promise<string> {
  const res = await fetch(`${base}/ip`, { headers: xff ? { "X-Forwarded-For": xff } : {} });
  return ((await res.json()) as { ip: string }).ip;
}

describe("getClientIp", () => {
  it("is the entry the edge appended, whatever the client put in front of it", async () => {
    expect(await ipFor("203.0.113.7, 198.51.100.20")).toBe("198.51.100.20");
    expect(await ipFor("1.1.1.1, 198.51.100.20")).toBe("198.51.100.20");
    expect(await ipFor("forged, 2.2.2.2, 198.51.100.20")).toBe("198.51.100.20");
  });

  it("falls back to the socket when no proxy header came", async () => {
    expect(["127.0.0.1", "::ffff:127.0.0.1"]).toContain(await ipFor());
  });

  it("reads a plain object's ip, then its socket, then 'unknown'", () => {
    expect(getClientIp({ ip: "10.0.0.1", headers: {} } as unknown as TrpcContext["req"])).toBe("10.0.0.1");
    expect(getClientIp({ headers: { "x-forwarded-for": "9.9.9.9" }, socket: { remoteAddress: "10.0.0.2" } } as unknown as TrpcContext["req"])).toBe("10.0.0.2");
    expect(getClientIp({ headers: {} } as unknown as TrpcContext["req"])).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  it("a rotating leading X-Forwarded-For entry no longer opens a fresh counter", async () => {
    // offer_status_write allows 10 per 15 minutes.
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await fetch(`${base}/limited/offer_status_write`, {
        method: "POST",
        headers: { "X-Forwarded-For": `203.0.113.${i + 1}, 10.40.0.9` },
      });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it("two real addresses still count apart", async () => {
    for (let i = 0; i < 7; i++) {
      await fetch(`${base}/limited/form_submission`, { method: "POST", headers: { "X-Forwarded-For": "10.50.0.1" } });
    }
    const first = await fetch(`${base}/limited/form_submission`, { method: "POST", headers: { "X-Forwarded-For": "10.50.0.1" } });
    const other = await fetch(`${base}/limited/form_submission`, { method: "POST", headers: { "X-Forwarded-For": "10.50.0.2" } });
    expect(first.status).toBe(429);
    expect(other.status).toBe(200);
  });
});
