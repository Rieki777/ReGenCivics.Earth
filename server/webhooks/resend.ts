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
import { updateEmailStatus } from "../emailTracking";
import { getDb } from "../db";
import { emailLogs } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "../_core/logger";

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

/**
 * Find email log by Resend email ID or recipient
 */
async function findEmailLogByResendId(resendEmailId: string, recipientEmail?: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  
  // emailLogs doesn't store the Resend message id yet, so match by recipient.
  // Order by MOST RECENT send (desc) — the previous ascending order matched the
  // oldest email to the address, so a delivery/bounce event updated the wrong
  // (first-ever) log row. Matching by resendEmailId would need a stored-id
  // column + wiring the send path; tracked as a follow-up.
  void resendEmailId;
  if (recipientEmail) {
    const logs = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.recipientEmail, recipientEmail))
      .orderBy(desc(emailLogs.sentAt))
      .limit(1);

    if (logs.length > 0) {
      return logs[0].id;
    }
  }

  return null;
}

/**
 * Process webhook event
 */
async function processWebhookEvent(event: ResendWebhookEvent): Promise<void> {
  const { type, data } = event;
  const recipientEmail = data.to?.[0];
  
  log.info(`Processing ${type} event for ${recipientEmail}`);

  // Find the email log entry
  const emailLogId = await findEmailLogByResendId(data.email_id, recipientEmail);

  if (!emailLogId) {
    log.warn(`No email log found for ${data.email_id}`);
    return;
  }

  switch (type) {
    case "email.delivered":
      await updateEmailStatus(emailLogId, "delivered");
      log.info(`Marked email ${emailLogId} as delivered`);
      break;

    case "email.bounced":
      const bounceReason = data.bounce?.message || "Unknown bounce reason";
      await updateEmailStatus(emailLogId, "bounced", bounceReason);
      log.info(`Marked email ${emailLogId} as bounced: ${bounceReason}`);
      break;

    case "email.complained":
      const complaintType = data.complaint?.feedback_type || "spam";
      await updateEmailStatus(emailLogId, "failed", `Complaint: ${complaintType}`);
      log.info(`Marked email ${emailLogId} as complained`);
      break;

    case "email.delivery_delayed":
      log.info(`Email ${emailLogId} delivery delayed`);
      // Optionally update status to "delayed" if you add that status
      break;

    default:
      log.info(`Unhandled event type: ${type}`);
  }
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

      // Process the event asynchronously
      processWebhookEvent(event).catch((error) => {
        log.error("Error processing event", error);
      });

      // Always respond quickly to acknowledge receipt
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
