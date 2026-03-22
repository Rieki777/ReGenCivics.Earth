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
 * Set RIVERSIDE_WEBHOOK_SECRET in Railway env vars to the secret from Riverside dashboard.
 * If the secret is not set, signature verification is skipped (dev only).
 */

import { Express, Request, Response } from "express";
import crypto from "crypto";
import { getDb } from "../db";
import { recordings, newsletterSubscribers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendEmail, APP_BASE_URL } from "../_core/email";
import { notifyRecordingReady } from "../_core/notify";
import * as db from "../db";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Riverside sends different event types. We handle:
 *  - recording.complete  (primary — fired when upload + processing finishes)
 *  - recording.transcribed  (optional — fired when AI transcript is ready)
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
  youtube_url?: string;
  duration?: number;
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

// ── Email template ────────────────────────────────────────────────────────────

function buildEmailHtml(opts: {
  title: string;
  sessionDate: string;
  youtubeUrl?: string | null;
  riversideUrl?: string | null;
  aiSummary?: string | null;
  forumUrl?: string | null;
}): string {
  const watchBtn = opts.youtubeUrl
    ? `<a href="${opts.youtubeUrl}" style="display:inline-block;background:#FF0000;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:0 8px 8px 0;">▶ Watch Recording</a>`
    : "";
  const forumBtn = opts.forumUrl
    ? `<a href="${opts.forumUrl}" style="display:inline-block;background:#1a472a;color:#7dd87d;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;border:2px solid #7dd87d;margin:0 8px 8px 0;">💬 Join the Discussion</a>`
    : "";
  const summaryBlock = opts.aiSummary
    ? `<div style="background:#f0f7f0;border-left:4px solid #7dd87d;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;">
        <p style="color:#1a472a;font-weight:bold;margin:0 0 8px 0;">What we covered</p>
        <p style="color:#2d5a3d;margin:0;line-height:1.7;">${opts.aiSummary}</p>
       </div>`
    : "";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #7dd87d; margin: 0; font-size: 22px;">ReGen Civics</h1>
        <p style="color: #a8e6a8; margin: 6px 0 0 0; font-size: 12px;">Recording ready</p>
      </div>

      <div style="padding: 30px 24px; background: #fff; border: 1px solid #e0e0e0; border-top: none;">
        <h2 style="color: #1a472a; margin: 0 0 6px 0; font-size: 20px;">${opts.title}</h2>
        <p style="color: #888; font-size: 13px; margin: 0 0 20px 0;">${opts.sessionDate}</p>

        ${summaryBlock}

        <p style="color: #444; line-height: 1.7; margin: 20px 0;">
          The recording from our latest community session is ready. Watch it back, share it, or drop a reply in the forum.
        </p>

        <div style="margin: 24px 0;">
          ${watchBtn}
          ${forumBtn}
        </div>
      </div>

      <div style="background: #f0f7f0; padding: 20px 24px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          You're receiving this because you subscribed to ReGen Civics updates.<br/>
          <a href="${APP_BASE_URL}/newsletter/unsubscribe" style="color: #7dd87d;">Unsubscribe</a>
        </p>
      </div>
    </div>
  `;
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerRiversideWebhookRoutes(app: Express) {
  // Raw body parser needed for signature verification
  app.post(
    "/api/webhooks/riverside",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : JSON.stringify(req.body);
      const signature = req.headers["x-riverside-signature"] as string | undefined;
      const secret = process.env.RIVERSIDE_WEBHOOK_SECRET;

      // Verify signature if secret is configured
      if (secret) {
        if (!verifySignature(rawBody, signature, secret)) {
          console.warn("[riverside-webhook] Invalid signature — rejected");
          return res.status(401).json({ error: "Invalid signature" });
        }
      } else {
        console.warn("[riverside-webhook] RIVERSIDE_WEBHOOK_SECRET not set — skipping signature check");
      }

      let payload: RiversideWebhookPayload;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return res.status(400).json({ error: "Invalid JSON" });
      }

      console.log(`[riverside-webhook] Event: ${payload.event}`);

      // Acknowledge immediately — Riverside expects a fast 200
      res.status(200).json({ received: true });

      // Process asynchronously so we don't block the response
      processRiversideEvent(payload).catch((err) => {
        console.error("[riverside-webhook] Processing error:", err);
      });
    }
  );

  // Manual trigger: admin can POST to this to resend a recording email
  app.post(
    "/api/webhooks/riverside/resend-email/:recordingId",
    async (req: Request, res: Response) => {
      // Only allow from admin sessions — check x-admin-secret header
      const adminSecret = process.env.ADMIN_WEBHOOK_SECRET || process.env.JWT_SECRET;
      if (req.headers["x-admin-secret"] !== adminSecret) {
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
    console.error("[riverside-webhook] Database unavailable");
    return;
  }

  const data = payload.data ?? payload;
  const riversideId = data.id ?? data.recording_id ?? `webhook-${Date.now()}`;
  const title = data.title ?? "ReGen Civics Recording";
  const youtubeUrl = data.youtube_url ?? null;
  const riversideUrl = data.url ?? data.recording_url ?? null;
  const thumbnailUrl = data.thumbnail_url ?? null;
  const durationSeconds = data.duration ?? data.duration_seconds ?? null;
  const sessionDate = data.created_at ?? data.recorded_at
    ? new Date(data.created_at ?? data.recorded_at!)
    : new Date();
  const transcript = data.transcript ?? null;
  const aiSummary = data.ai_summary ?? data.summary ?? null;

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
    console.log(`[riverside-webhook] Updated recording ${recordingId}`);
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
    console.log(`[riverside-webhook] Inserted recording ${recordingId}`);
  }

  // Re-fetch updated row
  const [recording] = await database
    .select()
    .from(recordings)
    .where(eq(recordings.id, recordingId))
    .limit(1);
  if (!recording) return;

  // ── 2. Create forum post or reply to existing event thread ────────────────
  if (!recording.forumPostId) {
    try {
      // #6 — Try to match this recording to a pre-existing event forum thread
      const { events: eventsTable } = await import("../../drizzle/schema");
      const { gte: gteOp, lte: lteOp, isNotNull: isNotNullOp, and: andOp } = await import("drizzle-orm");
      const recordingTime = sessionDate instanceof Date ? sessionDate : new Date();
      const windowStart = new Date(recordingTime.getTime() - 4 * 3600000);
      const windowEnd = new Date(recordingTime.getTime() + 4 * 3600000);

      const [matchedEvent] = await database.select({ forumThreadId: eventsTable.forumThreadId, id: eventsTable.id })
        .from(eventsTable)
        .where(andOp(
          gteOp(eventsTable.startTime, windowStart),
          lteOp(eventsTable.startTime, windowEnd),
          isNotNullOp(eventsTable.forumThreadId)
        ))
        .limit(1);

      let forumPostId: number | null = null;

      if (matchedEvent?.forumThreadId) {
        // Reply to the pre-event thread with the recording link
        const sessionDateStr = recording.sessionDate
          ? recording.sessionDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
          : "Recent session";
        const watchLink = recording.youtubeUrl
          ? `**[Watch the recording on YouTube](${recording.youtubeUrl})**`
          : recording.riversideUrl
          ? `**[Watch the recording](${recording.riversideUrl})**`
          : "";
        const summarySection = recording.aiSummary ? `\n\n**What we covered**\n\n${recording.aiSummary}` : "";
        const replyContent = `The recording from ${sessionDateStr} is ready.\n\n${watchLink}${summarySection}\n\nDrop any follow-up thoughts below.`;

        const replyId = await db.createForumReply({
          postId: matchedEvent.forumThreadId,
          authorId: 1,
          content: replyContent,
        }).catch(() => null);

        // Link this recording to the event's thread for the email forum button
        forumPostId = matchedEvent.forumThreadId;
        if (replyId) console.log(`[riverside-webhook] Replied to forum thread ${matchedEvent.forumThreadId} for recording ${recordingId}`);
      } else {
        // No matching event thread — create a fresh forum post
        forumPostId = await createRecordingForumPost(recording);
      }

      if (forumPostId) {
        await database.update(recordings)
          .set({ forumPostId })
          .where(eq(recordings.id, recordingId));
        recording.forumPostId = forumPostId;
        console.log(`[riverside-webhook] Forum post/reply set to ${forumPostId} for recording ${recordingId}`);
      }
    } catch (err) {
      console.error("[riverside-webhook] Forum post creation failed:", err);
    }
  }

  // ── 3. Send email summary (once per recording) ─────────────────────────────
  // Guard: skip if the recording is older than 72 hours — prevents Zapier test
  // runs (which use real but old sample video data) from firing real emails.
  const publishedDate = recording.sessionDate instanceof Date ? recording.sessionDate : null;
  const ageHours = publishedDate ? (Date.now() - publishedDate.getTime()) / 3600000 : 0;
  const isFreshEnough = !publishedDate || ageHours <= 72;

  if (!isFreshEnough) {
    console.log(`[riverside-webhook] Recording is ${Math.round(ageHours)}h old — skipping email (likely Zapier test data)`);
  }

  if (!recording.emailSent && (youtubeUrl || riversideUrl) && isFreshEnough) {
    try {
      await sendRecordingEmail(recording);
      await database.update(recordings)
        .set({ emailSent: 1 })
        .where(eq(recordings.id, recordingId));
      console.log(`[riverside-webhook] Email sent for recording ${recordingId}`);
    } catch (err) {
      console.error("[riverside-webhook] Email send failed:", err);
    }
  }

  // ── 4. Channel announcements (Telegram + WhatsApp) — fire-and-forget ────────
  notifyRecordingReady({
    title: recording.title,
    youtubeUrl: recording.youtubeUrl,
    riversideUrl: recording.riversideUrl,
    forumPostId: recording.forumPostId,
  }).catch(err => console.error("[riverside-webhook] notify error:", err));
}

// ── Forum post creation ───────────────────────────────────────────────────────

async function createRecordingForumPost(recording: {
  id: number;
  title: string;
  sessionDate: Date | null;
  youtubeUrl: string | null;
  riversideUrl: string | null;
  aiSummary: string | null;
  durationSeconds: number | null;
}): Promise<number | null> {
  // System author ID — use 1 (admin) as fallback; update if you have a dedicated bot user
  const SYSTEM_AUTHOR_ID = 1;

  // Look up the "episodes" forum category
  const database = await getDb();
  if (!database) return null;

  const { forumCategories } = await import("../../drizzle/schema");
  const { eq: eqFn, like } = await import("drizzle-orm");
  const [episodesCategory] = await database
    .select()
    .from(forumCategories)
    .where(like(forumCategories.name, "%episode%"))
    .limit(1);

  // Fall back to category 1 (General) if episodes category doesn't exist yet
  const categoryId = episodesCategory?.id ?? 1;

  const sessionDateStr = recording.sessionDate
    ? recording.sessionDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "Recent session";

  const durationStr = recording.durationSeconds
    ? `${Math.floor(recording.durationSeconds / 60)} min`
    : "";

  const watchLink = recording.youtubeUrl
    ? `\n\n**[Watch the recording on YouTube](${recording.youtubeUrl})**`
    : recording.riversideUrl
    ? `\n\n**[Watch the recording](${recording.riversideUrl})**`
    : "";

  const summarySection = recording.aiSummary
    ? `\n\n## What we covered\n\n${recording.aiSummary}`
    : "";

  const content = `Recording from ${sessionDateStr}${durationStr ? ` (${durationStr})` : ""}.${watchLink}${summarySection}\n\nWhat stood out to you? What questions came up? Drop your thoughts below.`;

  const postId = await db.createForumPost({
    categoryId,
    authorId: SYSTEM_AUTHOR_ID,
    title: recording.title,
    content,
    tags: ["recording", "episode"],
    postType: "discussion",
  });

  return postId ?? null;
}

// ── Email sending ─────────────────────────────────────────────────────────────

async function sendRecordingEmail(recording: {
  title: string;
  sessionDate: Date | null;
  youtubeUrl: string | null;
  riversideUrl: string | null;
  aiSummary: string | null;
  forumPostId: number | null;
}) {
  const subscribers = await db.getActiveNewsletterSubscribers();
  if (!subscribers.length) {
    console.log("[riverside-webhook] No active subscribers — skipping email");
    return;
  }

  const sessionDateStr = recording.sessionDate
    ? recording.sessionDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "Recent session";

  const forumUrl = recording.forumPostId
    ? `${APP_BASE_URL}/community/post/${recording.forumPostId}`
    : null;

  const html = buildEmailHtml({
    title: recording.title,
    sessionDate: sessionDateStr,
    youtubeUrl: recording.youtubeUrl,
    riversideUrl: recording.riversideUrl,
    aiSummary: recording.aiSummary,
    forumUrl,
  });

  // Send individually so recipients cannot see each other's addresses
  const emails = subscribers.map((s) => s.email);
  for (const email of emails) {
    await sendEmail({
      to: email,
      subject: `Recording ready: ${recording.title}`,
      html,
      template: "recording_summary",
    });
  }
  console.log(`[riverside-webhook] Sent recording email to ${emails.length} subscriber(s)`);
}

// Need express for the raw body parser in the route handler
import express from "express";
