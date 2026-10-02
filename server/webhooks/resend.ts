/**
 * Resend Webhook Handler
 * Processes email delivery events from Resend
 * 
 * Webhook events:
 * - email.sent: Email was sent
 * - email.delivered: Email was delivered
 * - email.delivery_delayed: Delivery is delayed
 * - email.complained: Recipient marked as spam
 * - email.bounced: Email bounced
 * - email.opened: Email was opened (if using Resend's tracking)
 * - email.clicked: Link was clicked (if using Resend's tracking)
 */

import { Express, Request, Response } from "express";
import crypto from "crypto";
import { recordEmailClick, recordEmailOpen, updateEmailStatus } from "../emailTracking";
import { getDb } from "../db";
import { emailLogs, emailWebhookEvents } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { isDuplicateKeyError } from "@shared/eventAutoReminders";
import { logger } from "../_core/logger";
import { dispatchResendEvent, type ProviderEventAction } from "../lib/resendEvent";

const log = logger("resend-webhook");

// Resend webhook signing secret (set in Resend dashboard)
const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // For bounce events
    bounce?: {
      message: string;
      type: string;
    };
    // For complaint events
    complaint?: {
      feedback_type: string;
    };
  };
}

/**
 * Verify Resend webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  svixId: string | undefined,
  svixTimestamp: string | undefined,
  svixSignature: string | undefined,
): boolean {
  // Empty-string is treated the same as unset (a copy-paste-blank env var
  // would otherwise sign over a predictable empty secret).
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      log.error("WEBHOOK_SECRET not set in production, rejecting");
      return false;
    }
    log.warn("WEBHOOK_SECRET not set (dev only), allowing");
    return true;
  }
  if (!svixId || !svixTimestamp || !svixSignature) {
    log.warn("Missing svix-id/svix-timestamp/svix-signature header, rejecting");
    return false;
  }

  // Reject stale timestamps (>5 min) to blunt replay. Svix sends unix seconds.
  const tsSeconds = Number(svixTimestamp);
  if (!Number.isFinite(tsSeconds) || Math.abs(Date.now() / 1000 - tsSeconds) > 300) {
    log.warn("svix-timestamp out of tolerance, rejecting");
    return false;
  }

  // Resend uses Svix. The signing secret is `whsec_<base64>`; the HMAC key is
  // the base64-decoded portion after the prefix. The signed content is
  // `${svixId}.${svixTimestamp}.${payload}` and the signature is base64.
  const secretKey = WEBHOOK_SECRET.startsWith("whsec_") ? WEBHOOK_SECRET.slice(6) : WEBHOOK_SECRET;
  const secretBytes = Buffer.from(secretKey, "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const expBuf = Buffer.from(expected);

  // The svix-signature header is a space-separated list of `v1,<base64sig>`
  // entries (there can be more than one during secret rotation). Accept if any
  // v1 entry matches, timing-safely.
  return svixSignature.split(" ").some((entry) => {
    const comma = entry.indexOf(",");
    if (comma === -1) return false;
    const version = entry.slice(0, comma);
    const sig = entry.slice(comma + 1);
    if (version !== "v1" || !sig) return false;
    const sigBuf = Buffer.from(sig);
    return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  });
}

function isDuplicate(err: unknown): boolean {
  if (isDuplicateKeyError(err)) return true;
  const cause = (err as { cause?: { code?: string } } | null)?.cause;
  if (cause?.code === "ER_DUP_ENTRY") return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /ER_DUP_ENTRY|duplicate/i.test(msg);
}

/** Exact Resend message id. Never the recipient's latest other letter. */
async function findEmailLogByResendId(resendEmailId: string): Promise<number | null> {
  if (!resendEmailId) return null;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const byId = await db
    .select({ id: emailLogs.id })
    .from(emailLogs)
    .where(eq(emailLogs.resendEmailId, resendEmailId))
    .limit(1);
  return byId[0]?.id ?? null;
}

async function claimWebhookEvent(svixId: string, eventType: string, resendEmailId: string): Promise<"new" | "duplicate"> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.insert(emailWebhookEvents).values({
      svixId: svixId.slice(0, 255),
      eventType: eventType.slice(0, 64),
      resendEmailId: resendEmailId ? resendEmailId.slice(0, 255) : null,
    });
    return "new";
  } catch (err) {
    if (isDuplicate(err)) return "duplicate";
    throw err;
  }
}

async function releaseWebhookEvent(svixId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(emailWebhookEvents).where(eq(emailWebhookEvents.svixId, svixId));
}

async function applyProviderAction(emailLogId: number, action: ProviderEventAction): Promise<void> {
  if (action.kind === "status") {
    await updateEmailStatus(emailLogId, action.status, action.reason);
    return;
  }
  if (action.kind === "open") {
    await recordEmailOpen(emailLogId);
    return;
  }
  if (action.kind === "click") {
    await recordEmailClick(emailLogId);
  }
}

/**
 * Process webhook event
 */
async function processWebhookEvent(event: ResendWebhookEvent, svixId: string): Promise<void> {
  const resendEmailId = event.data?.email_id ?? "";
  const result = await dispatchResendEvent({
    eventType: event.type,
    resendEmailId,
    data: event.data,
    claim: () => claimWebhookEvent(svixId, event.type, resendEmailId),
    release: () => releaseWebhookEvent(svixId),
    findLogId: findEmailLogByResendId,
    apply: applyProviderAction,
  });
  log.info("resend event", { type: event.type, result, resendEmailId: resendEmailId || null });
}

/**
 * Register Resend webhook routes
 */
export function registerResendWebhookRoutes(app: Express): void {
  app.post("/api/webhooks/resend", async (req: Request, res: Response) => {
    try {
      const svixId = req.headers["svix-id"] as string | undefined;
      const signature = req.headers["svix-signature"] as string | undefined;
      const timestamp = req.headers["svix-timestamp"] as string | undefined;
      const payload = (req as any).rawBody ?? JSON.stringify(req.body);

      // Verify signature
      if (!verifyWebhookSignature(payload, svixId, timestamp, signature)) {
        log.error("Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
      }

      const event = req.body as ResendWebhookEvent;
      if (!svixId) {
        return res.status(400).json({ error: "Missing svix-id" });
      }

      // Apply before answering. A 500 asks Resend to retry. The svix-id row
      // is removed on failure so the retry is not treated as a duplicate.
      await processWebhookEvent(event, svixId);
      res.status(200).json({ received: true });
    } catch (error) {
      log.error("Error handling webhook", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Health check endpoint for webhook
  app.get("/api/webhooks/resend/health", (req: Request, res: Response) => {
    res.status(200).json({ 
      status: "ok", 
      webhook: "resend",
      configured: !!WEBHOOK_SECRET 
    });
  });
}
