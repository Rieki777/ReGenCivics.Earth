/**
 * The /campaign/:id 301 over real HTTP (build spec 2026-09-25, section 8.7).
 *
 * The project page is the campaign page now. Old links, emails, the embed
 * code and indexed urls all depend on this hop keeping ?ref= and landing on
 * the right campaign, so the status line and the Location header are what
 * this asserts, on a real request with a stub loader (no database), like
 * server/redirects.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { campaignRedirectMiddleware, type RedirectableCampaign } from "./lib/campaign-redirect";

const CAMPAIGNS: Record<number, RedirectableCampaign> = {
  12: { id: 12, applicationId: null, projectName: "Hill Farm", title: "Plant 400 trees", status: "active", startedAt: new Date("2026-09-01"), publishedAt: null },
  13: { id: 13, applicationId: 42, projectName: "Harmony Valley", title: "Season 2", status: "completed", startedAt: new Date("2026-01-01"), publishedAt: null },
  // Unpublished: its project name must never reach a Location header.
  20: { id: 20, applicationId: null, projectName: "Secret Ridge", title: "Draft", status: "draft", startedAt: null, publishedAt: null },
  21: { id: 21, applicationId: null, projectName: "Quiet Hollow", title: "In review", status: "pending_review", startedAt: null, publishedAt: null },
  // Cancelled before it ever went live: not public either.
  22: { id: 22, applicationId: null, projectName: "Never Opened", title: "Gone", status: "cancelled", startedAt: null, publishedAt: null },
};

let server: Server;
let base: string;
const loaded: number[] = [];

beforeAll(async () => {
  const app = express();
  app.use(campaignRedirectMiddleware(async (id) => {
    loaded.push(id);
    if (id === 99) throw new Error("database down");
    return CAMPAIGNS[id] ?? null;
  }));
  app.use((_req, res) => res.status(200).send("fell through"));
  await new Promise<void>((done) => {
    server = app.listen(0, "127.0.0.1", () => done());
  });
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
});

afterAll(async () => {
  if (server) await new Promise<void>((done) => server.close(() => done()));
});

const get = (path: string, method = "GET") => fetch(`${base}${path}`, { redirect: "manual", method });

describe("/campaign/:id answers a 301 to the project page", () => {
  it("a public campaign moves to /project/...?campaign=12 and keeps ?ref=", async () => {
    const res = await get("/campaign/12?ref=abc");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/project/c12-hill-farm?campaign=12&ref=abc");
  });

  it("keeps utm parameters and drops a stale campaign parameter", async () => {
    const res = await get("/campaign/12?campaign=7&utm_source=mail");
    expect(res.headers.get("location")).toBe("/project/c12-hill-farm?campaign=12&utm_source=mail");
  });

  it("a campaign with an application lands on the application's page", async () => {
    const res = await get("/campaign/13");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/project/42-harmony-valley?campaign=13");
  });

  it("HEAD redirects too", async () => {
    const res = await get("/campaign/12", "HEAD");
    expect(res.status).toBe(301);
  });

  it("an unpublished or never-opened campaign falls through, so its name never leaks", async () => {
    for (const id of [20, 21, 22]) {
      const res = await get(`/campaign/${id}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
      expect(await res.text()).toBe("fell through");
    }
  });

  it("a missing campaign falls through", async () => {
    const res = await get("/campaign/404");
    expect(res.status).toBe(200);
  });

  it("a loader failure falls through to the client redirect", async () => {
    const res = await get("/campaign/99");
    expect(res.status).toBe(200);
  });

  it("/campaign/12/manage and /campaign/12/analytics fall through without a lookup", async () => {
    loaded.length = 0;
    for (const path of ["/campaign/12/manage", "/campaign/12/analytics", "/campaign/abc", "/campaigns"]) {
      const res = await get(path);
      expect(res.status).toBe(200);
    }
    expect(loaded).toEqual([]);
  });

  it("POST falls through", async () => {
    loaded.length = 0;
    const res = await get("/campaign/12", "POST");
    expect(res.status).toBe(200);
    expect(loaded).toEqual([]);
  });
});
