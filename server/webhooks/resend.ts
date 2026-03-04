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
import { eq } from "drizzle-orm";

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
  signature: string | undefined,
  timestamp: string | undefined
): boolean {
  if (!WEBHOOK_SECRET || !signature || !timestamp) {
    console.warn("[Resend Webhook] Missing secret or signature, skipping verification");
    return true; // Allow in development without secret
  }
  
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(signedPayload)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Find email log by Resend email ID or recipient
 */
async function findEmailLogByResendId(resendEmailId: string, recipientEmail?: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  
  // First try to find by resend_id if we stored it
  // For now, we'll match by recipient email and recent timestamp
  if (recipientEmail) {
    const logs = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.recipientEmail, recipientEmail))
      .orderBy(emailLogs.sentAt)
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
  
  console.log(`[Resend Webhook] Processing ${type} event for ${recipientEmail}`);
  
  // Find the email log entry
  const emailLogId = await findEmailLogByResendId(data.email_id, recipientEmail);
  
  if (!emailLogId) {
    console.warn(`[Resend Webhook] No email log found for ${data.email_id}`);
    return;
  }
  
  switch (type) {
    case "email.delivered":
      await updateEmailStatus(emailLogId, "delivered");
      console.log(`[Resend Webhook] Marked email ${emailLogId} as delivered`);
      break;
      
    case "email.bounced":
      const bounceReason = data.bounce?.message || "Unknown bounce reason";
      await updateEmailStatus(emailLogId, "bounced", bounceReason);
      console.log(`[Resend Webhook] Marked email ${emailLogId} as bounced: ${bounceReason}`);
      break;
      
    case "email.complained":
      const complaintType = data.complaint?.feedback_type || "spam";
      await updateEmailStatus(emailLogId, "failed", `Complaint: ${complaintType}`);
      console.log(`[Resend Webhook] Marked email ${emailLogId} as complained`);
      break;
      
    case "email.delivery_delayed":
      console.log(`[Resend Webhook] Email ${emailLogId} delivery delayed`);
      // Optionally update status to "delayed" if you add that status
      break;
      
    default:
      console.log(`[Resend Webhook] Unhandled event type: ${type}`);
  }
}

/**
 * Register Resend webhook routes
 */
export function registerResendWebhookRoutes(app: Express): void {
  app.post("/api/webhooks/resend", async (req: Request, res: Response) => {
    try {
      const signature = req.headers["svix-signature"] as string | undefined;
      const timestamp = req.headers["svix-timestamp"] as string | undefined;
      const payload = JSON.stringify(req.body);
      
      // Verify signature
      if (!verifyWebhookSignature(payload, signature, timestamp)) {
        console.error("[Resend Webhook] Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
      
      const event = req.body as ResendWebhookEvent;
      
      // Process the event asynchronously
      processWebhookEvent(event).catch((error) => {
        console.error("[Resend Webhook] Error processing event:", error);
      });
      
      // Always respond quickly to acknowledge receipt
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("[Resend Webhook] Error handling webhook:", error);
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
