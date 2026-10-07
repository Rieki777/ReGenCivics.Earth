/**
 * Riverside.fm Webhook Handler (secondary, off unless configured)
 *
 * Recordings reach the site through the coordination pipeline
 * (server/jobs/coordinationPipeline.ts), which polls the public YouTube
 * channel feed on a cron, with no third party. This webhook is the older,
 * secondary path: every recording so far (18 of 18 on 2026-09-28) came from
 * the pipeline and none from here. It stays in the code for a future
 * non-YouTube source and is OFF unless RIVERSIDE_WEBHOOK_SECRET is set.
 *
 * When configured, it receives recording-complete events from Riverside, then:
 *  1. Stores the recording in the DB
 *  2. Sends an email summary to all active newsletter subscribers (via Resend)
 *  3. Creates a forum post for the recording (in the "episodes" category)
 *
 * Register the webhook URL in Riverside dashboard:
 *   Settings > Integrations > Webhooks > https://regencivics.earth/api/webhooks/riverside
 *
 * Set RIVERSIDE_WEBHOOK_SECRET in Railway env vars to the secret from Riverside dashboard
 * to turn it on. See checkRiversideAuth below.
 */

import { Express, Request, Response } from "express";
import crypto from "crypto";
import { getDb } from "../db";
import { recordings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { timingSafeEqualStr } from "../_core/security";
import { logger } from "../_core/logger";
import { ENV } from "../_core/env";
import { finalizeRecording } from "../lib/recording-finalize";

const log = logger("riverside-webhook");

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Riverside sends different event types. We handle:
 *  - recording.complete  (primary, fired when upload + processing finishes)
 *  - recording.transcribed  (optional, fired when AI transcript is ready)
 *
 * The exact payload shape may vary. We store rawWebhook for debugging.
 */
interface RiversideWebhookPayload {
  event: string;
  data?: {
    id?: string;
    recording_id?: string;
    title?: string;
    url?: string;
    recording_url?: string;
    youtube_url?: string;
    thumbnail_url?: string;
    duration?: number;
    duration_seconds?: number;
    created_at?: string;
    recorded_at?: string;
    transcript?: string;
    ai_summary?: string;
    summary?: string;
    project?: {
      id?: string;
      name?: string;
    };
  };
  // Some Riverside events flatten data to the top level
  id?: string;
  recording_id?: string;
  title?: string;
  url?: string;
  recording_url?: string;
  youtube_url?: string;
  thumbnail_url?: string;
  duration?: number;
  duration_seconds?: number;
  created_at?: string;
  recorded_at?: string;
  transcript?: string;
  ai_summary?: string;
  summary?: string;
  project?: {
    id?: string;
    name?: string;
  };
}

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  // Riverside uses HMAC-SHA256: "sha256=<hex>"
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Who may call the webhook. This endpoint creates a forum post and emails
 * every active newsletter subscriber (finalizeRecording), so an
 * unauthenticated caller could send a mass mail from our domain.
 *
 * Only a valid x-riverside-signature HMAC over the raw body passes, and only
 * when RIVERSIDE_WEBHOOK_SECRET is set. With no secret it is off everywhere,
 * in every NODE_ENV. It used to skip the check whenever NODE_ENV wasn't
 * "production", and production runs with NODE_ENV unset (measured
 * 2026-09-28), so the live site accepted unsigned calls.
 */
export function checkRiversideAuth(input: {
  rawBody: string;
  signature?: string;
  secret: string;
}): { status: 200 | 401 | 503; error?: string; log?: string } {
  const { rawBody, signature, secret } = input;
  if (!secret) {
    return {
      status: 503,
      error: "Webhook not configured",
      log: "RIVERSIDE_WEBHOOK_SECRET is not set, so the Riverside webhook is off (recordings come from the YouTube pipeline)",
    };
  }
  if (!verifySignature(rawBody, signature, secret)) {
    return { status: 401, error: "Invalid signature", log: "Invalid signature, rejected" };
  }
  return { status: 200 };
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerRiversideWebhookRoutes(app: Express) {
  app.post(
    "/api/webhooks/riverside",
    async (req: Request, res: Response) => {
      // The global express.json({ verify }) in server/_core/index.ts already
      // captured the raw request string as req.rawBody. Verify the HMAC over
      // those exact bytes; JSON.stringify(req.body) would re-serialize the
      // parsed object and never match the signature.
      const rawBody: string = (req as any).rawBody ?? JSON.stringify(req.body);
      const auth = checkRiversideAuth({
        rawBody,
        signature: req.headers["x-riverside-signature"] as string | undefined,
        // Read through ENV (single validated config surface), not process.env.
        secret: ENV.riversideWebhookSecret,
      });
      if (auth.status !== 200) {
        log.warn(auth.log ?? "Riverside webhook rejected");
        return res.status(auth.status).json({ error: auth.error });
      }

      let payload: RiversideWebhookPayload;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return res.status(400).json({ error: "Invalid JSON" });
      }

      log.info(`Event: ${payload.event}`);

      // Acknowledge immediately. Riverside expects a fast 200
      res.status(200).json({ received: true });

      // Process asynchronously so we don't block the response
      processRiversideEvent(payload).catch((err) => {
        log.error("Processing error:", err);
      });
    }
  );

  // Manual trigger: admin can POST to this to resend a recording email
  app.post(
    "/api/webhooks/riverside/resend-email/:recordingId",
    async (req: Request, res: Response) => {
      // Only allow from admin sessions, check x-admin-secret header
      const adminSecret = process.env.ADMIN_WEBHOOK_SECRET;
      if (!adminSecret) {
        log.error("ADMIN_WEBHOOK_SECRET not set");
        return res.status(500).json({ error: "Server misconfigured" });
      }
      const headerSecret = typeof req.headers["x-admin-secret"] === "string" ? req.headers["x-admin-secret"] : "";
      if (!timingSafeEqualStr(headerSecret, adminSecret)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const database = await getDb();
      if (!database) return res.status(503).json({ error: "DB unavailable" });

      const id = parseInt(req.params.recordingId, 10);
      const [rec] = await database.select().from(recordings).where(eq(recordings.id, id)).limit(1);
      if (!rec) return res.status(404).json({ error: "Recording not found" });

      const { deliverSubscriberMail } = await import("../lib/recording-finalize");
      const sent = await deliverSubscriberMail(rec, { resend: true });
      if (sent.kind !== "skip" && sent.dropped === 0) {
        await database.update(recordings).set({ emailSent: 1 }).where(eq(recordings.id, id));
      }
      res.json({ sent: sent.kind !== "skip" && sent.dropped === 0, accepted: sent.accepted, dropped: sent.dropped, kind: sent.kind });
    }
  );
}

// ── Core processing ───────────────────────────────────────────────────────────

async function processRiversideEvent(payload: RiversideWebhookPayload) {
  const database = await getDb();
  if (!database) {
    log.error("Database unavailable");
    return;
  }

  const rawData = payload.data ?? payload;

  // Normalize Zapier-style flat keys (data_title -> title, data_youtube_url -> youtube_url, etc.)
  const d: any = { ...rawData };
  for (const [key, value] of Object.entries(rawData as Record<string, unknown>)) {
    if (key.startsWith('data_')) {
      const normalizedKey = key.replace(/^data_/, '');
      if (!(normalizedKey in d)) {
        d[normalizedKey] = value;
      }
    }
  }

  const riversideId = d.id ?? d.recording_id ?? `webhook-${Date.now()}`;
  const title = d.title ?? "ReGen Civics Recording";
  const youtubeUrl = d.youtube_url ?? null;
  const riversideUrl = d.url ?? d.recording_url ?? null;
  const thumbnailUrl = d.thumbnail_url ?? null;
  const durationSeconds = d.duration ?? d.duration_seconds ?? null;
  const sessionDate = d.created_at ?? d.recorded_at
    ? new Date(d.created_at ?? d.recorded_at!)
    : new Date();
  const transcript = d.transcript ?? null;
  const aiSummary = d.ai_summary ?? d.summary ?? null;

  // ── Drop Zapier test pings ────────────────────────────────────────────────
  // Zapier's "Build your first Zap with Zapier" test fires a sample payload
  // when you set up a webhook trigger. It should never become a real recording.
  // Detect by title, by zapier-hosted asset URLs, or by suspiciously-stale
  // session dates (Zapier's sample uses 2018 timestamps).
  const looksLikeZapierTest =
    title === "Build your first Zap with Zapier" ||
    /^https?:\/\/cdn\.zapier\.com\//i.test(youtubeUrl ?? "") ||
    /^https?:\/\/cdn\.zapier\.com\//i.test(thumbnailUrl ?? "") ||
    /^https?:\/\/cdn\.zapier\.com\//i.test(riversideUrl ?? "") ||
    String(riversideId).startsWith("webhook-") && !d.id && !d.recording_id && title === "Build your first Zap with Zapier";
  const sessionTooStale =
    sessionDate instanceof Date &&
    !isNaN(sessionDate.getTime()) &&
    sessionDate.getTime() < Date.now() - 1000 * 60 * 60 * 24 * 30;

  if (looksLikeZapierTest || sessionTooStale) {
    log.info("Ignoring test/stale payload", {
      title,
      sessionDate: sessionDate.toISOString?.() ?? sessionDate,
      youtubeUrl,
    });
    return;
  }

  // ── 1. Upsert recording in DB ──────────────────────────────────────────────
  const [existing] = await database
    .select()
    .from(recordings)
    .where(eq(recordings.riversideId, riversideId))
    .limit(1);

  let recordingId: number;

  if (existing) {
    // Update with any new fields (transcript/summary may arrive in a later event)
    await database.update(recordings).set({
      title,
      youtubeUrl,
      riversideUrl,
      thumbnailUrl,
      durationSeconds,
      transcript: transcript ?? existing.transcript,
      aiSummary: aiSummary ?? existing.aiSummary,
      rawWebhook: payload as any,
    }).where(eq(recordings.riversideId, riversideId));
    recordingId = existing.id;
    log.info(`Updated recording ${recordingId}`);
  } else {
    const [result] = await database.insert(recordings).values({
      riversideId,
      title,
      youtubeUrl,
      riversideUrl,
      thumbnailUrl,
      durationSeconds,
      sessionDate,
      transcript,
      aiSummary,
      emailSent: 0,
      featured: 0,
      rawWebhook: payload as any,
    });
    recordingId = (result as any).insertId;
    log.info(`Inserted recording ${recordingId}`);
  }

  // Publish to the community + link the matching event. Shared with the
  // YouTube-poll pipeline so a recording is announced exactly once.
  await finalizeRecording(recordingId);
}

