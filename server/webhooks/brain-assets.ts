/**
 * Serve second-brain attachments from the PRIVATE R2 prefixes, behind auth.
 *
 *   GET /api/brain/assets/harvest/shots/<ownerId>/<taskId>/<name>
 *   GET /api/brain/assets/harvest/voice/<ownerId>/<name>
 *
 * Why this route exists at all: 134 of the 219 open items are a screenshot
 * with a one-line caption (response doc 17.6). The importer puts those files
 * in R2 under `harvest/shots/`, which is private, so the item sheet needs a
 * door. This is the door, and it is the only one.
 *
 * It streams with `storageStream` and NEVER calls `storageGet`. `storageGet`
 * returns a PUBLIC url the moment `STORAGE_PUBLIC_URL` is set, which it is
 * (assets.regencivics.earth), so a single storageGet here would turn the
 * owner's private screenshots into unauthenticated links. The Range-aware
 * variant from the same module handles the seek requests iOS Safari sends for
 * voice captures; a request with no Range header takes the plain stream.
 *
 * Auth, either of:
 *   - the owner's session cookie (the phone, the web item sheet), or
 *   - `Authorization: Bearer <HARVEST_BRIDGE_TOKEN>` (the vault pulling
 *     screenshots into a session's working directory).
 * Fails closed when OWNER_USER_ID is unset, because without it there is no
 * private prefix to check a key against. Fails closed for the bearer path when
 * HARVEST_BRIDGE_TOKEN is unset, the same way harvest-bridge does.
 *
 * The key is attacker-controlled. `brainAssetKey` is the whole trust boundary:
 * it refuses traversal, refuses percent-encoding rather than trying to unpick
 * it, and requires one of the two private prefixes for THIS owner.
 *
 * Logging: path, ip, key and byte count. Never the token, never the cookie.
 */
import type { Express, Request, Response } from "express";
import { ENV } from "../_core/env";
import { sdk } from "../_core/sdk";
import {
  isWebhookFailureBlocked,
  recordWebhookFailure,
  timingSafeEqualStr,
} from "../_core/security";
import { logger } from "../_core/logger";
import { storageStream, storageStreamRange } from "../storage";

const log = logger("brain-assets");

const SCOPE = "brain-assets";

/** Content types safe to render inline on our own origin. Everything else downloads. */
const INLINE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "video/mp4",
]);

export type KeyCheck = { ok: true; key: string } | { ok: false; reason: string };

/**
 * The trust boundary. Returns the R2 key only when it is unambiguously inside
 * one of this owner's two private prefixes.
 *
 * Percent signs are refused outright instead of decoded. Express has already
 * decoded the wildcard once, so a `%` surviving into here means the caller
 * double-encoded something, and the only reason to double-encode a key made of
 * `[A-Za-z0-9._@/-]` is to get a second decode out of somebody. Refusing is
 * cheaper than reasoning about how many decodes deep the payload is.
 */
export function brainAssetKey(raw: string | undefined, ownerId: number): KeyCheck {
  if (!ownerId) return { ok: false, reason: "owner_not_configured" };
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) {
    return { ok: false, reason: "bad_key" };
  }
  if (raw.includes("\0") || raw.includes("\\") || raw.includes("%")) {
    return { ok: false, reason: "bad_key" };
  }
  if (!/^[A-Za-z0-9._@/-]+$/.test(raw)) return { ok: false, reason: "bad_key" };
  if (raw.startsWith("/")) return { ok: false, reason: "bad_key" };
  for (const segment of raw.split("/")) {
    if (segment === "" || segment === "." || segment === "..") {
      return { ok: false, reason: "traversal" };
    }
  }
  const allowed = [`harvest/shots/${ownerId}/`, `harvest/voice/${ownerId}/`];
  if (!allowed.some((prefix) => raw.startsWith(prefix))) {
    return { ok: false, reason: "outside_private_prefix" };
  }
  return { ok: true, key: raw };
}

/**
 * True when the caller proved it is the owner. Writes the failure response
 * itself otherwise, so the handler can `if (!(await authorize(...))) return;`.
 *
 * A bearer header short-circuits the session path: a request that presents a
 * token is asking to be judged on that token, and falling back to the cookie
 * would let a bad token succeed on a browser that happens to be signed in.
 */
async function authorize(req: Request, res: Response): Promise<boolean> {
  const ip = req.ip || "unknown";
  if (await isWebhookFailureBlocked(ip, SCOPE)) {
    res.status(429).json({ error: "too_many_failures" });
    return false;
  }
  if (!ENV.ownerUserId) {
    // No owner means no private prefix, so there is nothing this route could
    // safely serve. Generic body: a prober learns nothing from it.
    res.status(503).json({ error: "unavailable" });
    return false;
  }

  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    if (!ENV.harvestBridgeToken) {
      res.status(503).json({ error: "unavailable" });
      return false;
    }
    const token = header.slice(7).trim();
    const ok =
      timingSafeEqualStr(token, ENV.harvestBridgeToken) ||
      (Boolean(ENV.harvestBridgeTokenNext) &&
        timingSafeEqualStr(token, ENV.harvestBridgeTokenNext));
    if (!ok) {
      await recordWebhookFailure(ip, SCOPE);
      log.warn(`auth failure (bearer) path=${req.path} ip=${ip}`);
      res.status(401).json({ error: "unauthorized" });
      return false;
    }
    return true;
  }

  try {
    const user = await sdk.authenticateRequest(req);
    if (user?.id === ENV.ownerUserId) return true;
  } catch {
    // No cookie, bad cookie, or no such user. All of them are "not the owner".
  }
  await recordWebhookFailure(ip, SCOPE);
  log.warn(`auth failure (session) path=${req.path} ip=${ip}`);
  res.status(401).json({ error: "unauthorized" });
  return false;
}

function isMissingObject(err: unknown): boolean {
  const e = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e?.name === "NoSuchKey" ||
    e?.name === "NotFound" ||
    e?.Code === "NoSuchKey" ||
    e?.$metadata?.httpStatusCode === 404
  );
}

export function registerBrainAssetRoutes(app: Express) {
  app.get("/api/brain/assets/*", async (req: Request, res: Response) => {
    if (!(await authorize(req, res))) return;

    // Express has already URL-decoded the wildcard capture. Do not decode it
    // again: a second decode is how `..%252f..` becomes a traversal.
    const raw = (req.params as Record<string, string>)[0];
    const check = brainAssetKey(raw, ENV.ownerUserId);
    if (!check.ok) {
      log.warn(`key rejected reason=${check.reason} ip=${req.ip || "unknown"}`);
      res.status(403).json({ error: check.reason });
      return;
    }

    try {
      const range = typeof req.headers.range === "string" ? req.headers.range : undefined;
      const obj = range
        ? await storageStreamRange(check.key, range)
        : { ...(await storageStream(check.key)), contentRange: undefined, statusCode: 200 as const };

      const type = INLINE_TYPES.has(obj.contentType) ? obj.contentType : "application/octet-stream";
      res.setHeader("Content-Type", type);
      res.setHeader(
        "Content-Disposition",
        INLINE_TYPES.has(obj.contentType) ? "inline" : "attachment",
      );
      // `private` keeps this out of every shared cache between here and the
      // phone; `Vary` keeps a bearer response from being handed to a cookie
      // request out of the browser's own cache.
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.setHeader("Vary", "Authorization, Cookie");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Accept-Ranges", "bytes");
      if (obj.contentLength !== undefined) {
        res.setHeader("Content-Length", String(obj.contentLength));
      }
      if (obj.contentRange) res.setHeader("Content-Range", obj.contentRange);
      res.status(obj.statusCode);

      log.info(`serve key=${check.key} bytes=${obj.contentLength ?? "?"} ip=${req.ip}`);
      obj.body.on("error", (err: unknown) => {
        log.error(`stream aborted key=${check.key}: ${err instanceof Error ? err.message : String(err)}`);
        res.destroy();
      });
      obj.body.pipe(res);
    } catch (err) {
      if (isMissingObject(err)) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      log.error(`serve failed key=${check.key}: ${err instanceof Error ? err.message : String(err)}`);
      res.status(500).json({ error: "internal" });
    }
  });
}
