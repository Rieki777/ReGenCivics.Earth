import { describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { registerZeffyWebhookRoutes } from "./webhooks/zeffy";

function makeCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {}, cookies: {} } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

describe("churchDonations.zeffyEnabled", () => {
  it("reports not-live when ZEFFY_EMBED_URL is unset", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.churchDonations.zeffyEnabled()).resolves.toEqual({ enabled: false, embedUrl: null });
  });
});

describe("Zeffy webhook", () => {
  async function withApp(fn: (baseUrl: string) => Promise<void>) {
    const app = express();
    app.use(express.json());
    registerZeffyWebhookRoutes(app);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    try {
      await fn(`http://127.0.0.1:${port}`);
    } finally {
      server.close();
    }
  }

  it("returns 503 when Zeffy is not configured (no ZEFFY_EMBED_URL / token in test env)", async () => {
    await withApp(async (base) => {
      const res = await fetch(`${base}/api/webhooks/zeffy/any-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "payment.completed", payment: { id: "p_1", amount: 1000 } }),
      });
      expect(res.status).toBe(503);
    });
  });
});

describe("Zeffy webhook, configured (env mocked)", () => {
  it("rejects the wrong token with a generic 404 before touching the database", async () => {
    vi.resetModules();
    vi.doMock("./_core/env", () => ({
      ENV: {
        zeffyEmbedUrl: "https://www.zeffy.com/embed/donation-form/fake",
        zeffyWebhookToken: "correct-secret",
      },
    }));
    // getDb must not be called on the wrong-token path; make that loud if it is.
    vi.doMock("./db", () => ({
      getDb: vi.fn(() => {
        throw new Error("getDb should not be called when the webhook token is wrong");
      }),
    }));

    const { registerZeffyWebhookRoutes: registerWithMockedEnv } = await import("./webhooks/zeffy");
    const app = express();
    app.use(express.json());
    registerWithMockedEnv(app);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/zeffy/wrong-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "payment.completed", payment: { id: "p_1", amount: 1000 } }),
      });
      expect(res.status).toBe(404);
    } finally {
      server.close();
      vi.doUnmock("./_core/env");
      vi.doUnmock("./db");
      vi.resetModules();
    }
  });
});
