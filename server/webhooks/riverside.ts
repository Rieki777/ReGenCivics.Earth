/**
 * Riverside.fm Webhook Handler
 *
 * Receives recording-complete events from Riverside, then:
 *  1. Stores the recording in the DB
 *  2. Sends an email summary to all active newsletter subscribers (via Resend)
 *  3. Creates a forum post for the recording (in the "episodes" category)
 *
 * Register the webhook URL in Riverside dashboard:
 *   Settings > Integrations > Webhooks > https://regencivics.earth/api/webhooks/riverside
 *
 * Set RIVERSIDE_WEBHOOK_SECRET in Railway env vars to the secret from Riverside dashboard,
 * or, for a sender that cannot sign (a Zapier webhook step), set RIVERSIDE_WEBHOOK_TOKEN and
 * send it as the x-webhook-token header. See checkRiversideAuth below.
 */

import { Express, Request, Response } from "express";
import crypto from "crypto";
import { getDb } from "../db";
import { recordings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { timingSafeEqualStr } from "../_core/security";
import { logger } from "../_core/logger";
import { ENV } from "../_core/env";
import { finalizeRecording, sendRecordingEmail } from "../lib/recording-finalize";

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
 * - RIVERSIDE_WEBHOOK_SECRET set: a valid x-riverside-signature HMAC passes.
 * - RIVERSIDE_WEBHOOK_TOKEN set: an x-webhook-token header equal to it passes.
 *   This is for senders that cannot sign, such as a Zapier webhook step.
 * - Either set: a request must pass one of them.
 * - Neither set: rejected when NODE_ENV is production. Production runs
 *   `node dist/index.js` with NODE_ENV unset (measured 2026-09-28), so a
 *   deployed server is spotted by RAILWAY_ENVIRONMENT_NAME and every unsigned
 *   call there is logged as an error until one of the two is set. It is still
 *   accepted, because the live recording pipeline sends unsigned today;
 *   rejecting it is Rye's call once the Zap carries the token.
 */
export function checkRiversideAuth(input: {
  rawBody: string;
  signature?: string;
  token?: string;
  secret: string;
  expectedToken: string;
  nodeEnv?: string;
  deployed: boolean;
}): { status: 200 | 401 | 503; error?: string; log?: string } {
  const { rawBody, signature, token, secret, expectedToken, nodeEnv, deployed } = input;
  if (secret || expectedToken) {
    const signed = Boolean(secret) && verifySignature(rawBody, signature, secret);
    const tokened = Boolean(expectedToken) && typeof token === "string" && timingSafeEqualStr(token, expectedToken);
    if (signed || tokened) return { status: 200 };
    return { status: 401, error: "Unauthorized", log: "Missing or invalid signature and token, rejected" };
  }
  if (nodeEnv === "production") {
    return { status: 503, error: "Webhook not configured", log: "Neither RIVERSIDE_WEBHOOK_SECRET nor RIVERSIDE_WEBHOOK_TOKEN is set in production, rejecting" };
  }
  if (deployed) {
    return { status: 200, log: "Unsigned Riverside webhook accepted on a deployed server: set RIVERSIDE_WEBHOOK_TOKEN (and add it to the Zap as x-webhook-token) to close this" };
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
        token: req.headers["x-webhook-token"] as string | undefined,
        // Read through ENV (single validated config surface), not process.env.
        secret: ENV.riversideWebhookSecret,
        expectedToken: ENV.riversideWebhookToken,
        nodeEnv: process.env.NODE_ENV,
        deployed: Boolean(process.env.RAILWAY_ENVIRONMENT_NAME),
      });
      if (auth.status !== 200) {
        log.warn(auth.log ?? "Riverside webhook rejected");
        return res.status(auth.status).json({ error: auth.error });
      }
      if (auth.log) log.error(auth.log);

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

      await sendRecordingEmail(rec);
      await database.update(recordings).set({ emailSent: 1 }).where(eq(recordings.id, id));
      res.json({ sent: true });
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

