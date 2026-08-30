/**
 * The door onto the owner's private screenshots.
 *
 * `harvest/shots/` and `harvest/voice/` hold the second brain's attachments,
 * and 134 of the 219 open items are nothing BUT a screenshot, so this route is
 * what makes those items readable on a phone. It is also the only route that
 * reads those prefixes, which makes it the whole attack surface for them.
 *
 * What these tests pin, in the order the failures would hurt:
 *   - a stranger gets nothing (no cookie, wrong bearer, no auth at all)
 *   - a key outside the two private prefixes is refused even WITH valid auth,
 *     so a signed-in owner cannot be tricked into proxying the whole bucket
 *   - traversal is refused, including the percent-encoded shapes
 *   - the bridge bearer works, because the vault pulls screenshots with it
 *   - the route never hands back a public url (storageGet is never called)
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import type { Server } from "http";
import type { AddressInfo } from "net";
import { Readable } from "stream";
import { ENV } from "./_core/env";

const OWNER = 987_654_321;
const TOKEN = "brain-assets-test-token-0123456789abcdef";
const SHOT = `harvest/shots/${OWNER}/113853/photo_971@08-08-2026_10-57-42.jpg`;

const storageStream = vi.fn();
const storageStreamRange = vi.fn();
const storageGet = vi.fn();

vi.mock("./storage", () => ({
  storageStream: (...a: unknown[]) => storageStream(...a),
  storageStreamRange: (...a: unknown[]) => storageStreamRange(...a),
  storageGet: (...a: unknown[]) => storageGet(...a),
  storagePut: vi.fn(),
}));

function fakeObject(bytes = Buffer.from("jpeg-bytes")) {
  return {
    body: Readable.from([bytes]),
    contentType: "image/jpeg",
    contentLength: bytes.length,
  };
}

describe("brain asset route", () => {
  let server: Server;
  let base = "";
  let prevOwner: number;
  let prevToken: string;
  let prevNext: string;

  beforeAll(async () => {
    prevOwner = ENV.ownerUserId;
    prevToken = ENV.harvestBridgeToken;
    prevNext = ENV.harvestBridgeTokenNext;
    (ENV as { ownerUserId: number }).ownerUserId = OWNER;
    (ENV as { harvestBridgeToken: string }).harvestBridgeToken = TOKEN;
    (ENV as { harvestBridgeTokenNext: string }).harvestBridgeTokenNext = "";

    const { registerBrainAssetRoutes } = await import("./webhooks/brain-assets");
    const app = express();
    registerBrainAssetRoutes(app);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    (ENV as { ownerUserId: number }).ownerUserId = prevOwner;
    (ENV as { harvestBridgeToken: string }).harvestBridgeToken = prevToken;
    (ENV as { harvestBridgeTokenNext: string }).harvestBridgeTokenNext = prevNext;
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  });

  const get = (key: string, init: RequestInit = {}) =>
    fetch(`${base}/api/brain/assets/${key}`, init);
  const bearer = (key: string, token = TOKEN) =>
    get(key, { headers: { Authorization: `Bearer ${token}` } });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it("rejects a request with no auth at all", async () => {
    storageStream.mockClear();
    const res = await get(SHOT);
    expect(res.status).toBe(401);
    expect(storageStream).not.toHaveBeenCalled();
  });

  it("rejects a wrong bearer token", async () => {
    storageStream.mockClear();
    const res = await bearer(SHOT, "not-the-token-0123456789abcdefghij");
    expect(res.status).toBe(401);
    expect(storageStream).not.toHaveBeenCalled();
  });

  it("rejects a garbage session cookie", async () => {
    storageStream.mockClear();
    const res = await get(SHOT, { headers: { Cookie: "session=not-a-jwt" } });
    expect(res.status).toBe(401);
    expect(storageStream).not.toHaveBeenCalled();
  });

  it("accepts the bridge bearer and streams the object", async () => {
    storageStream.mockClear();
    storageStream.mockResolvedValueOnce(fakeObject());
    const res = await bearer(SHOT);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("jpeg-bytes");
    expect(storageStream).toHaveBeenCalledWith(SHOT);
    expect(res.headers.get("content-type")).toContain("image/jpeg");
    expect(res.headers.get("cache-control")).toContain("private");
  });

  it("fails closed when the bridge token is not configured", async () => {
    (ENV as { harvestBridgeToken: string }).harvestBridgeToken = "";
    try {
      const res = await bearer(SHOT);
      expect(res.status).toBe(503);
    } finally {
      (ENV as { harvestBridgeToken: string }).harvestBridgeToken = TOKEN;
    }
  });

  it("fails closed when OWNER_USER_ID is not configured", async () => {
    (ENV as { ownerUserId: number }).ownerUserId = 0;
    try {
      const res = await bearer(SHOT);
      expect(res.status).toBe(503);
    } finally {
      (ENV as { ownerUserId: number }).ownerUserId = OWNER;
    }
  });

  // ── Key boundary ──────────────────────────────────────────────────────────

  it("refuses a key outside the private prefixes even with a valid bearer", async () => {
    storageStream.mockClear();
    for (const key of [
      "uploads/campaign-hero.jpg",
      "harvest/ideas/secret.json",
      `harvest/shots/${OWNER + 1}/1/other-owner.jpg`,
      // The owner's id must be a whole path segment: 9876543210 is not 987654321.
      `harvest/shots/${OWNER}0/1/near-miss.jpg`,
    ]) {
      const res = await bearer(key);
      expect(res.status, key).toBe(403);
    }
    expect(storageStream).not.toHaveBeenCalled();
  });

  /**
   * Worth knowing what this does and does not prove: `fetch` collapses dot
   * segments (including the `%2e` spellings) before the request leaves, so
   * some of these are refused by the URL parser and arrive at the route as an
   * ordinary out-of-prefix key. The point stands either way, nothing gets
   * served, and the raw-socket test below plus the `brainAssetKey` suite are
   * what actually exercise the guard.
   */
  it("refuses traversal, plain and encoded", async () => {
    storageStream.mockClear();
    for (const key of [
      `harvest/shots/${OWNER}/../../../uploads/x.jpg`,
      `harvest/shots/${OWNER}/..%2f..%2fuploads%2fx.jpg`,
      `harvest/shots/${OWNER}/..%252f..%252fuploads%252fx.jpg`,
      `harvest/shots/${OWNER}/.%2e/%2e%2e/x.jpg`,
    ]) {
      const res = await bearer(key);
      expect(res.status, key).toBeGreaterThanOrEqual(400);
      expect(res.status, key).toBeLessThan(500);
    }
    expect(storageStream).not.toHaveBeenCalled();
  });

  /**
   * The one that matters: a hand-written request line, sent verbatim, with no
   * client-side normalisation between the attacker and the route.
   */
  it("refuses a traversal that no client normalised on the way in", async () => {
    storageStream.mockClear();
    const { request } = await import("http");
    const status = await new Promise<number>((resolve, reject) => {
      const req = request(
        {
          host: "127.0.0.1",
          port: (server.address() as AddressInfo).port,
          method: "GET",
          path: `/api/brain/assets/harvest/shots/${OWNER}/../../../uploads/x.jpg`,
          headers: { Authorization: `Bearer ${TOKEN}` },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        },
      );
      req.on("error", reject);
      req.end();
    });
    expect(status).toBe(403);
    expect(storageStream).not.toHaveBeenCalled();
  });

  it("refuses a backslash key, which is a traversal on the other platform", async () => {
    storageStream.mockClear();
    const res = await bearer(`harvest/shots/${OWNER}/..%5c..%5cx.jpg`);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(storageStream).not.toHaveBeenCalled();
  });

  it("serves the voice prefix too, since captures land there", async () => {
    storageStream.mockClear();
    storageStream.mockResolvedValueOnce({
      body: Readable.from([Buffer.from("ogg")]),
      contentType: "audio/ogg",
      contentLength: 3,
    });
    const res = await bearer(`harvest/voice/${OWNER}/tg-u1.ogg`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("audio/ogg");
  });

  // ── Behaviour ─────────────────────────────────────────────────────────────

  it("never calls storageGet, which would hand back a public url", async () => {
    storageGet.mockClear();
    storageStream.mockResolvedValueOnce(fakeObject());
    await bearer(SHOT);
    expect(storageGet).not.toHaveBeenCalled();
  });

  it("uses the range-aware stream when the client asks for a range", async () => {
    storageStream.mockClear();
    storageStreamRange.mockClear();
    storageStreamRange.mockResolvedValueOnce({
      body: Readable.from([Buffer.from("par")]),
      contentType: "audio/ogg",
      contentLength: 3,
      contentRange: "bytes 0-2/9",
      statusCode: 206,
    });
    const res = await fetch(`${base}/api/brain/assets/harvest/voice/${OWNER}/tg-u1.ogg`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Range: "bytes=0-2" },
    });
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 0-2/9");
    expect(storageStreamRange).toHaveBeenCalledWith(`harvest/voice/${OWNER}/tg-u1.ogg`, "bytes=0-2");
    expect(storageStream).not.toHaveBeenCalled();
  });

  it("downloads rather than renders a stored type that is not an image or audio", async () => {
    storageStream.mockResolvedValueOnce({
      body: Readable.from([Buffer.from("<script>alert(1)</script>")]),
      contentType: "text/html",
      contentLength: 25,
    });
    const res = await bearer(SHOT);
    expect(res.headers.get("content-type")).toContain("application/octet-stream");
    expect(res.headers.get("content-disposition")).toBe("attachment");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("returns 404 for a key that is not in the bucket", async () => {
    storageStream.mockRejectedValueOnce(Object.assign(new Error("no"), { name: "NoSuchKey" }));
    const res = await bearer(SHOT);
    expect(res.status).toBe(404);
  });
});

describe("brainAssetKey", () => {
  let brainAssetKey: typeof import("./webhooks/brain-assets").brainAssetKey;

  beforeAll(async () => {
    ({ brainAssetKey } = await import("./webhooks/brain-assets"));
  });

  it("accepts the two private prefixes for this owner", () => {
    expect(brainAssetKey(`harvest/shots/7/113853/a.jpg`, 7)).toEqual({
      ok: true,
      key: "harvest/shots/7/113853/a.jpg",
    });
    expect(brainAssetKey(`harvest/voice/7/a.ogg`, 7).ok).toBe(true);
  });

  it("refuses everything else in the bucket", () => {
    expect(brainAssetKey("uploads/a.jpg", 7)).toEqual({
      ok: false,
      reason: "outside_private_prefix",
    });
    expect(brainAssetKey("harvest/shots/8/a.jpg", 7).ok).toBe(false);
  });

  it("refuses an unconfigured owner rather than building a prefix from zero", () => {
    expect(brainAssetKey("harvest/shots/0/a.jpg", 0)).toEqual({
      ok: false,
      reason: "owner_not_configured",
    });
  });

  it("refuses a percent sign instead of trying to work out how many decodes deep it is", () => {
    expect(brainAssetKey("harvest/shots/7/%2e%2e/a.jpg", 7).ok).toBe(false);
  });

  it("refuses empty, absolute, oversized and null-byte keys", () => {
    expect(brainAssetKey("", 7).ok).toBe(false);
    expect(brainAssetKey(undefined, 7).ok).toBe(false);
    expect(brainAssetKey("/harvest/shots/7/a.jpg", 7).ok).toBe(false);
    expect(brainAssetKey(`harvest/shots/7/${"a".repeat(600)}.jpg`, 7).ok).toBe(false);
    expect(brainAssetKey("harvest/shots/7/a\0.jpg", 7).ok).toBe(false);
  });

  it("refuses a dot-dot segment wherever it appears", () => {
    expect(brainAssetKey("harvest/shots/7/../x.jpg", 7)).toEqual({ ok: false, reason: "traversal" });
    expect(brainAssetKey("harvest/shots/7/a/../../x.jpg", 7).ok).toBe(false);
    expect(brainAssetKey("harvest/shots/7//x.jpg", 7)).toEqual({ ok: false, reason: "traversal" });
  });
});
