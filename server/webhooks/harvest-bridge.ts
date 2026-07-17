/**
 * Harvest bridge endpoints (Phase 1, build item 5).
 *
 * The local second brain pulls new captures over HTTPS and marks them
 * processed once they are safely written to the vault:
 *
 *   GET  /api/harvest/captures?since_id=<n>   -> { captures, latestId }
 *   POST /api/harvest/mark-processed          -> { ok, updated }
 *
 * Auth: Bearer token compared via timingSafeEqualStr against
 * HARVEST_BRIDGE_TOKEN (HARVEST_BRIDGE_TOKEN_NEXT also accepted, for
 * zero-downtime rotation). No cookies are ever accepted here. On mismatch we
 * recordWebhookFailure(ip) and return 401; repeated failures trip
 * isWebhookFailureBlocked and get 429 before any comparison runs. Fails
 * closed everywhere when the token or OWNER_USER_ID is unset.
 *
 * The captures response NEVER includes audio_key or any signed audio URL;
 * voice audio stays in the private R2 prefix, owner-gated.
 *
 * Logging: path, ip, and row count only. Never the token, never note bodies.
 */
import type { Express, Request, Response } from "express";
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { quickNotes, harvestIdeas, harvestRuns, sourceIndex } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { timingSafeEqualStr, recordWebhookFailure, isWebhookFailureBlocked } from "../_core/security";
import { composeRipeness, RIPENESS_THRESHOLD } from "../lib/harvest";
import { logger } from "../_core/logger";

const log = logger("harvest-bridge");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isMissingTableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ER_NO_SUCH_TABLE|doesn't exist|no such table/i.test(msg);
}

/**
 * Returns true when the request may proceed. Writes the failure response
 * itself otherwise. Token check is timing-safe; failures are recorded so
 * repeated probing from one ip gets blocked.
 */
async function checkBridgeAuth(req: Request, res: Response): Promise<boolean> {
  const ip = req.ip || "unknown";
  if (await isWebhookFailureBlocked(ip, "harvest-bridge")) {
    res.status(429).json({ error: "too_many_failures" });
    return false;
  }
  if (!ENV.harvestBridgeToken || !ENV.ownerUserId) {
    // Not configured: fail closed in every environment. Generic body so a
    // prober cannot distinguish "unset" from "wrong token".
    res.status(503).json({ error: "unavailable" });
    return false;
  }
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const ok =
    timingSafeEqualStr(token, ENV.harvestBridgeToken) ||
    (Boolean(ENV.harvestBridgeTokenNext) && timingSafeEqualStr(token, ENV.harvestBridgeTokenNext));
  if (!ok) {
    await recordWebhookFailure(ip, "harvest-bridge");
    log.warn(`auth failure path=${req.path} ip=${ip}`);
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

export function registerHarvestBridgeRoutes(app: Express) {
  app.get("/api/harvest/captures", async (req: Request, res: Response) => {
    if (!(await checkBridgeAuth(req, res))) return;

    const sinceRaw = req.query.since_id;
    const sinceId = Number(Array.isArray(sinceRaw) ? sinceRaw[0] : sinceRaw ?? 0);
    if (!Number.isInteger(sinceId) || sinceId < 0) {
      res.status(400).json({ error: "since_id must be a non-negative integer" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "db_unavailable" });
      return;
    }

    try {
      const rows = await db
        .select({
          id: quickNotes.id,
          capture_id: quickNotes.captureId,
          body: quickNotes.body,
          source: quickNotes.source,
          themes: quickNotes.themes,
          created_at: quickNotes.createdAt,
        })
        .from(quickNotes)
        .where(and(eq(quickNotes.ownerId, ENV.ownerUserId), gt(quickNotes.id, sinceId)))
        .orderBy(asc(quickNotes.id))
        .limit(200);

      log.info(`captures pull ip=${req.ip} since_id=${sinceId} count=${rows.length}`);
      res.json({
        captures: rows,
        latestId: rows.length > 0 ? rows[rows.length - 1].id : sinceId,
      });
    } catch (err) {
      if (isMissingTableError(err)) {
        res.status(503).json({ error: "not_ready" });
        return;
      }
      log.error(`captures pull failed: ${err instanceof Error ? err.message : String(err)}`);
      res.status(500).json({ error: "internal" });
    }
  });

  /**
   * Phase 2: the vault pushes curated ideas (with locally-computed ripeness
   * components) and the raw source rows that back them. Idempotent upserts on
   * (owner, idea_ref) and (owner, ref_id). Body:
   *   { ideas: [{ idea_ref, title, summary, themes, components, why_now,
   *               source_refs }],
   *     sources: [{ ref_id, date, text, links, forwarded_from, media }],
   *     seed?: boolean }
   * Only curated idea text and the raw text needed for provenance display
   * cross the boundary. The server composes the ripeness score and stamps
   * crossed_at when an idea first clears the threshold.
   */
  app.post("/api/harvest/ideas", async (req: Request, res: Response) => {
    if (!(await checkBridgeAuth(req, res))) return;

    const body = req.body as {
      ideas?: Array<{
        idea_ref?: string; title?: string; summary?: string; themes?: unknown;
        components?: { material?: number; recency?: number; cluster?: number; theme_focus?: number };
        why_now?: string; source_refs?: unknown;
      }>;
      sources?: Array<{ ref_id?: string; date?: string; text?: string; links?: unknown; forwarded_from?: string; media?: string }>;
      seed?: boolean;
    };
    const ideas = Array.isArray(body?.ideas) ? body.ideas : [];
    const sources = Array.isArray(body?.sources) ? body.sources : [];
    if (ideas.length === 0 && sources.length === 0) {
      res.status(400).json({ error: "ideas or sources required" });
      return;
    }
    if (ideas.length > 300 || sources.length > 1000) {
      res.status(400).json({ error: "batch too large (max 300 ideas, 1000 sources)" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "db_unavailable" });
      return;
    }

    try {
      let sourcesUpserted = 0;
      for (const s of sources) {
        if (typeof s.ref_id !== "string" || !s.ref_id || s.ref_id.length > 64) continue;
        const values = {
          ownerId: ENV.ownerUserId,
          refId: s.ref_id,
          date: s.date ? new Date(s.date) : null,
          text: typeof s.text === "string" ? s.text.slice(0, 60000) : null,
          links: s.links ?? null,
          forwardedFrom: typeof s.forwarded_from === "string" ? s.forwarded_from.slice(0, 300) : null,
          media: typeof s.media === "string" ? s.media.slice(0, 64) : null,
        };
        await db.insert(sourceIndex).values(values)
          .onDuplicateKeyUpdate({ set: { text: values.text, links: values.links } });
        sourcesUpserted++;
      }

      let ideasUpserted = 0;
      let crossed = 0;
      const now = new Date();
      for (const i of ideas) {
        if (typeof i.idea_ref !== "string" || !i.idea_ref || i.idea_ref.length > 191) continue;
        if (typeof i.title !== "string" || !i.title) continue;
        const ripeness = composeRipeness(i.components);
        const existing = await db
          .select({ id: harvestIdeas.id, ripeness: harvestIdeas.ripeness, crossedAt: harvestIdeas.crossedAt, status: harvestIdeas.status })
          .from(harvestIdeas)
          .where(and(eq(harvestIdeas.ownerId, ENV.ownerUserId), eq(harvestIdeas.ideaRef, i.idea_ref)))
          .limit(1);
        const crossingNow = ripeness >= RIPENESS_THRESHOLD &&
          (existing.length === 0 ? true : existing[0].ripeness < RIPENESS_THRESHOLD && !existing[0].crossedAt);
        if (crossingNow) crossed++;

        if (existing.length > 0) {
          // Never resurrect a suppressed idea, and keep snooze state; refresh
          // the content and score only.
          await db.update(harvestIdeas).set({
            title: i.title.slice(0, 300),
            summary: typeof i.summary === "string" ? i.summary.slice(0, 60000) : null,
            themes: i.themes ?? null,
            ripeness,
            scoreComponents: i.components ?? null,
            whyNow: typeof i.why_now === "string" ? i.why_now.slice(0, 500) : null,
            sourceRefs: i.source_refs ?? null,
            ...(crossingNow ? { crossedAt: now } : {}),
          }).where(eq(harvestIdeas.id, existing[0].id));
        } else {
          await db.insert(harvestIdeas).values({
            ownerId: ENV.ownerUserId,
            ideaRef: i.idea_ref,
            title: i.title.slice(0, 300),
            summary: typeof i.summary === "string" ? i.summary.slice(0, 60000) : null,
            themes: i.themes ?? null,
            ripeness,
            scoreComponents: i.components ?? null,
            whyNow: typeof i.why_now === "string" ? i.why_now.slice(0, 500) : null,
            sourceRefs: i.source_refs ?? null,
            status: "ripe",
            ...(crossingNow ? { crossedAt: now } : {}),
          });
        }
        ideasUpserted++;
      }

      await db.insert(harvestRuns).values({
        kind: body.seed ? "seed" : "bridge",
        stats: { ideas: ideasUpserted, sources: sourcesUpserted, crossed },
      });
      log.info(`ideas push ip=${req.ip} ideas=${ideasUpserted} sources=${sourcesUpserted} crossed=${crossed} seed=${Boolean(body.seed)}`);
      res.json({ ok: true, ideas: ideasUpserted, sources: sourcesUpserted, crossed });
    } catch (err) {
      if (isMissingTableError(err)) {
        res.status(503).json({ error: "not_ready" });
        return;
      }
      log.error(`ideas push failed: ${err instanceof Error ? err.message : String(err)}`);
      res.status(500).json({ error: "internal" });
    }
  });

  /**
   * Phase 3: the pack builder pulls the learned voice rules so
   * build_worldview_pack.py folds the top rules by weight into
   * style_rules.json. Rules are derived form-rules, never edit bodies.
   */
  app.get("/api/harvest/voice-rules", async (req: Request, res: Response) => {
    if (!(await checkBridgeAuth(req, res))) return;
    try {
      const { loadTopRules } = await import("../lib/voice-learning");
      const rules = await loadTopRules(ENV.ownerUserId, 50);
      log.info(`voice-rules pull ip=${req.ip} count=${rules.length}`);
      res.json({ rules });
    } catch (err) {
      if (isMissingTableError(err)) {
        res.json({ rules: [] });
        return;
      }
      log.error(`voice-rules pull failed: ${err instanceof Error ? err.message : String(err)}`);
      res.status(500).json({ error: "internal" });
    }
  });

  app.post("/api/harvest/mark-processed", async (req: Request, res: Response) => {
    if (!(await checkBridgeAuth(req, res))) return;

    const body = req.body as { capture_ids?: unknown };
    const ids = Array.isArray(body?.capture_ids) ? body.capture_ids : null;
    if (!ids || ids.length === 0 || ids.length > 200 || !ids.every((v) => typeof v === "string" && UUID_RE.test(v))) {
      res.status(400).json({ error: "capture_ids must be 1-200 UUID strings" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "db_unavailable" });
      return;
    }

    try {
      // Idempotent: re-marking an already-processed row is a no-op, and
      // processed_at keeps its first value.
      const result = await db
        .update(quickNotes)
        .set({ status: "processed", processedAt: new Date() })
        .where(and(
          eq(quickNotes.ownerId, ENV.ownerUserId),
          inArray(quickNotes.captureId, ids as string[]),
          eq(quickNotes.status, "inbox"),
        ));
      // mysql2 returns { affectedRows } in the result header; drizzle's mysql
      // driver wraps it as result[0].affectedRows (same read as server/db.ts).
      const header = result as unknown as { affectedRows?: number } & Array<{ affectedRows?: number }>;
      const updated = header?.[0]?.affectedRows ?? header?.affectedRows ?? 0;
      log.info(`mark-processed ip=${req.ip} requested=${ids.length} updated=${updated}`);
      res.json({ ok: true, updated });
    } catch (err) {
      if (isMissingTableError(err)) {
        res.status(503).json({ error: "not_ready" });
        return;
      }
      log.error(`mark-processed failed: ${err instanceof Error ? err.message : String(err)}`);
      res.status(500).json({ error: "internal" });
    }
  });
}
