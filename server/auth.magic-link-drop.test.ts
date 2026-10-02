import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

vi.mock("./db", () => ({
  createEmailToken: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
}));

const sendEmail = vi.hoisted(() => vi.fn());
vi.mock("./_core/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

import { registerOAuthRoutes } from "./_core/oauth";

describe("magic link does not report success when Resend returns no id", () => {
  let server: Server;
  let base = "";

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
  });

  it("returns 500 when the provider drops the letter", async () => {
    sendEmail.mockResolvedValueOnce({ id: null, status: "provider_error" });
    const res = await fetch(`${base}/api/auth/email/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "delivered+magic@resend.dev" }),
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to send login email" });
  });
});
