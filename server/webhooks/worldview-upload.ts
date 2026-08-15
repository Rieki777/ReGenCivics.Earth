/**
 * Worldview Pack upload endpoint (the Mycelium, M1).
 *
 *   POST /api/worldview/upload   body: { manifest, files } (one JSON document)
 *
 * Auth mirrors the Harvest bridge: bearer token compared via timingSafeEqualStr
 * against WORLDVIEW_UPLOAD_TOKEN (NEXT slot accepted for rotation), failures
 * recorded so repeated probing gets blocked, fails closed everywhere when the
 * token is unset. Rate limiting on success and failure paths comes from the
 * same webhook-failure blocker plus the global /api rate limit middleware.
 *
 * Guarantees enforced here:
 *  - size cap (the pack is prompt material, not a data dump)
 *  - every file hash matches the manifest before a byte is stored
 *  - a pack whose manifest.revision is not strictly greater than the stored
 *    one is rejected (no silent rollbacks, no replay)
 *  - the object lands under the PRIVATE worldview prefix, never the public
 *    assets prefix, never served by /api/img
 *
 * Logging: path, ip, version, revision, byte count. Never pack content, never
 * the token.
 */
import type { Express, Request, Response } from "express";
import { ENV } from "../_core/env";
import { timingSafeEqualStr, recordWebhookFailure, isWebhookFailureBlocked } from "../_core/security";
import { storagePut } from "../storage";
import { logger } from "../_core/logger";
import {
  loadWorldviewPack, validatePack, packObjectKey, _clearWorldviewCache,
  type WorldviewPack,
} from "../lib/worldview";

const log = logger("worldview-upload");

/** Hard cap on the serialized pack. Curated prompt material stays small. */
export const MAX_PACK_BYTES = 1_500_000;

async function checkUploadAuth(req: Request, res: Response): Promise<boolean> {
  const ip = req.ip || "unknown";
  if (await isWebhookFailureBlocked(ip, "worldview-upload")) {
    res.status(429).json({ error: "too_many_failures" });
    return false;
  }
  if (!ENV.worldviewUploadToken) {
    res.status(503).json({ error: "unavailable" });
    return false;
  }
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const ok =
    timingSafeEqualStr(token, ENV.worldviewUploadToken) ||
    (Boolean(ENV.worldviewUploadTokenNext) && timingSafeEqualStr(token, ENV.worldviewUploadTokenNext));
  if (!ok) {
    await recordWebhookFailure(ip, "worldview-upload");
    log.warn(`auth failure path=${req.path} ip=${ip}`);
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

export function registerWorldviewUploadRoutes(app: Express) {
  app.post("/api/worldview/upload", async (req: Request, res: Response) => {
    if (!(await checkUploadAuth(req, res))) return;

    const pack = req.body as WorldviewPack;
    const problem = validatePack(pack);
    if (problem) {
      res.status(400).json({ error: `invalid pack: ${problem}` });
      return;
    }

    const serialized = JSON.stringify({ manifest: pack.manifest, files: pack.files });
    if (Buffer.byteLength(serialized, "utf8") > MAX_PACK_BYTES) {
      res.status(413).json({ error: "pack too large" });
      return;
    }

    // Revision must strictly advance past the stored pack.
    try {
      const current = await loadWorldviewPack();
      if (current && pack.manifest.revision <= current.manifest.revision) {
        res.status(409).json({
          error: "stale revision",
          storedRevision: current.manifest.revision,
        });
        return;
      }
    } catch {
      // No stored pack (or unreadable): first upload wins.
    }

    try {
      await storagePut(packObjectKey(), serialized, "application/octet-stream");
      _clearWorldviewCache();
      log.info(
        `pack stored ip=${req.ip} version=${pack.manifest.version} revision=${pack.manifest.revision} bytes=${Buffer.byteLength(serialized, "utf8")}`,
      );
      res.json({ ok: true, version: pack.manifest.version, revision: pack.manifest.revision });
    } catch (err) {
      log.error("pack store failed", err instanceof Error ? err : undefined);
      res.status(500).json({ error: "store_failed" });
    }
  });
}
