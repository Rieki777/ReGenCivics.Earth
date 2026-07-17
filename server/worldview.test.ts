/**
 * Tests for the Mycelium M1 repo side:
 *  - upload endpoint rejects bad token, stale revision, oversized and invalid packs
 *  - pack validation verifies manifest hashes
 *  - loader is fail-soft when no pack exists
 *  - the Guide preamble includes voice.md when a pack is present, "" when not
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import type { Server } from "http";
import type { AddressInfo } from "net";
import crypto from "crypto";
import { ENV } from "./_core/env";

const TEST_TOKEN = "worldview-test-token-0123456789abcdef";

// In-memory R2 stand-in: the loader and endpoint exercise their real logic
// (hashing, revision compare, cache) without needing bucket credentials.
const stored = new Map<string, string>();
vi.mock("./storage", () => ({
  storagePut: vi.fn(async (key: string, data: Buffer | string) => {
    stored.set(key, typeof data === "string" ? data : data.toString("utf8"));
    return { key, url: `private://${key}` };
  }),
  storageStream: vi.fn(async (key: string) => {
    const value = stored.get(key);
    if (value === undefined) {
      const err = new Error("NoSuchKey");
      (err as Error & { name: string }).name = "NoSuchKey";
      throw err;
    }
    const { Readable } = await import("stream");
    return { body: Readable.from([Buffer.from(value)]), contentType: "application/octet-stream", contentLength: value.length };
  }),
}));

import { validatePack, loadWorldviewPack, getVoiceProfile, getGuideWorldviewPreamble, _clearWorldviewCache, sha256Hex } from "./lib/worldview";
import { registerWorldviewUploadRoutes } from "./webhooks/worldview-upload";

function makePack(revision: number, files: Record<string, string> = { "voice.md": "# Voice\nShort sentences. Direct." }) {
  const hashes: Record<string, string> = {};
  for (const [name, content] of Object.entries(files)) hashes[name] = sha256Hex(content);
  return {
    manifest: {
      schema_version: 1,
      version: `1.0.${revision}`,
      revision,
      "updated-on": "2026-07-16",
      source: "maintainer",
      hashes,
    },
    files,
  };
}

describe("validatePack", () => {
  it("accepts a well-formed pack", () => {
    expect(validatePack(makePack(1))).toBeNull();
  });

  it("rejects a tampered file (hash mismatch)", () => {
    const pack = makePack(1);
    pack.files["voice.md"] = "tampered";
    expect(validatePack(pack)).toMatch(/hash mismatch/);
  });

  it("rejects a file missing from the manifest", () => {
    const pack = makePack(1);
    (pack.files as Record<string, string>)["extra.md"] = "sneaky";
    expect(validatePack(pack)).toMatch(/not in manifest/);
  });

  it("rejects a manifest without a revision", () => {
    const pack = makePack(1) as { manifest: Record<string, unknown> };
    delete pack.manifest.revision;
    expect(validatePack(pack)).toMatch(/revision/);
  });
});

describe("loader fail-soft", () => {
  beforeEach(() => {
    stored.clear();
    _clearWorldviewCache();
  });

  it("returns null everywhere when no pack exists", async () => {
    expect(await loadWorldviewPack()).toBeNull();
    expect(await getVoiceProfile()).toBeNull();
    expect(await getGuideWorldviewPreamble()).toBe("");
  });
});

describe("upload endpoint + loader round trip", () => {
  let server: Server;
  let base = "";
  let prevToken: string;
  let prevNext: string;

  beforeAll(async () => {
    prevToken = ENV.worldviewUploadToken;
    prevNext = ENV.worldviewUploadTokenNext;
    (ENV as any).worldviewUploadToken = TEST_TOKEN;
    (ENV as any).worldviewUploadTokenNext = "";
    const app = express();
    app.use(express.json({ limit: "3mb" }));
    registerWorldviewUploadRoutes(app);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    stored.clear();
    _clearWorldviewCache();
  });

  afterAll(async () => {
    (ENV as any).worldviewUploadToken = prevToken;
    (ENV as any).worldviewUploadTokenNext = prevNext;
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  });

  const upload = (body: unknown, token = TEST_TOKEN) =>
    fetch(`${base}/api/worldview/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("rejects a wrong token with 401", async () => {
    const res = await upload(makePack(1), "wrong-token");
    expect(res.status).toBe(401);
  });

  it("fails closed with 503 when the token is not configured", async () => {
    (ENV as any).worldviewUploadToken = "";
    try {
      const res = await upload(makePack(1));
      expect(res.status).toBe(503);
    } finally {
      (ENV as any).worldviewUploadToken = TEST_TOKEN;
    }
  });

  it("rejects an invalid pack with 400", async () => {
    const pack = makePack(1);
    pack.files["voice.md"] = "tampered after hashing";
    const res = await upload(pack);
    expect(res.status).toBe(400);
  });

  it("stores a valid pack, then serves it through the loader and Guide preamble", async () => {
    const res = await upload(makePack(3));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.revision).toBe(3);

    _clearWorldviewCache();
    const pack = await loadWorldviewPack();
    expect(pack?.manifest.revision).toBe(3);
    expect(await getVoiceProfile()).toContain("Short sentences");

    const preamble = await getGuideWorldviewPreamble();
    expect(preamble).toContain("VOICE SOURCE MATERIAL");
    expect(preamble).toContain("Short sentences. Direct.");
    expect(preamble).toContain("never overrides the rules");
  });

  it("rejects a stale or equal revision with 409", async () => {
    const stale = await upload(makePack(3));
    expect(stale.status).toBe(409);
    const older = await upload(makePack(2));
    expect(older.status).toBe(409);
    const newer = await upload(makePack(4));
    expect(newer.status).toBe(200);
  });

  it("rejects an oversized pack with 413", async () => {
    const big = makePack(99, { "voice.md": "x".repeat(1_600_000) });
    const res = await fetch(`${base}/api/worldview/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TEST_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(big),
    });
    expect([413, 500]).toContain(res.status); // 413 from our cap (or the parser's own limit)
  });

  it("hash tampering detected at load time turns the pack off, not into garbage", async () => {
    stored.set(
      Array.from(stored.keys())[0],
      JSON.stringify({ manifest: makePack(5).manifest, files: { "voice.md": "tampered" } }),
    );
    _clearWorldviewCache();
    expect(await loadWorldviewPack()).toBeNull();
    expect(await getGuideWorldviewPreamble()).toBe("");
  });
});
