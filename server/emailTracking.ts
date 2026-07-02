/**
 * Email Tracking Utilities
 * Provides open tracking (pixel) and click tracking (URL wrapping) for emails
 */

import { getDb } from "./db";
import { emailLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Generate a tracking pixel URL for email open tracking
 * @param emailLogId - The ID of the email log entry
 * @returns URL to the tracking pixel endpoint
 */
export function generateTrackingPixelUrl(emailLogId: number): string {
  const baseUrl = process.env.VITE_APP_URL || "https://regencivics.earth";
  return `${baseUrl}/api/track/open/${emailLogId}`;
}

/**
 * Generate HTML for tracking pixel to embed in emails
 * @param emailLogId - The ID of the email log entry
 * @returns HTML string with 1x1 transparent pixel
 */
export function generateTrackingPixelHtml(emailLogId: number): string {
  const pixelUrl = generateTrackingPixelUrl(emailLogId);
  return `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;border:0;outline:none;" />`;
}

/**
 * Wrap a URL with click tracking
 * @param originalUrl - The original destination URL
 * @param emailLogId - The ID of the email log entry
 * @returns Tracking URL that redirects to original
 */
export function wrapUrlWithTracking(originalUrl: string, emailLogId: number): string {
  const baseUrl = process.env.VITE_APP_URL || "https://regencivics.earth";
  const encodedUrl = encodeURIComponent(originalUrl);
  return `${baseUrl}/api/track/click/${emailLogId}?url=${encodedUrl}`;
}

/**
 * Record email open event
 * @param emailLogId - The ID of the email log entry
 */
export async function recordEmailOpen(emailLogId: number): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    
    await db
      .update(emailLogs)
      .set({ openedAt: new Date() })
      .where(eq(emailLogs.id, emailLogId))
      .execute();
  } catch (error) {
    console.error("Failed to record email open:", error);
  }
}

/**
 * Record email click event
 * @param emailLogId - The ID of the email log entry
 */
export async function recordEmailClick(emailLogId: number): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    
    await db
      .update(emailLogs)
      .set({ clickedAt: new Date() })
      .where(eq(emailLogs.id, emailLogId))
      .execute();
  } catch (error) {
    console.error("Failed to record email click:", error);
  }
}

/**
 * Create a new email log entry
 * @param data - Email log data
 * @returns The created email log ID
 */
export async function createEmailLog(data: {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  template?: string;
  inquiryType?: string;
  inquiryId?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(emailLogs).values({
    recipientEmail: data.recipientEmail,
    recipientName: data.recipientName,
    subject: data.subject,
    template: data.template,
    inquiryType: data.inquiryType,
    inquiryId: data.inquiryId,
    status: "sent",
    sentAt: new Date(),
  });
  
  return result[0].insertId;
}

/**
 * Stamp the Resend message id on a log row after a successful send, so the
 * delivery webhook can match the exact row by id instead of by recipient.
 */
export async function setEmailLogResendId(emailLogId: number, resendEmailId: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.update(emailLogs).set({ resendEmailId }).where(eq(emailLogs.id, emailLogId));
  } catch (err) {
    console.error("[emailTracking] setEmailLogResendId failed", err);
  }
}

/**
 * Update email delivery status from Resend webhook
 * @param emailLogId - The ID of the email log entry
 * @param status - The delivery status
 * @param bounceReason - Optional bounce reason
 */
export async function updateEmailStatus(
  emailLogId: number,
  status: "delivered" | "bounced" | "failed",
  bounceReason?: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    
    const updates: any = { status };
    
    if (status === "delivered") {
      updates.deliveredAt = new Date();
    }
    
    if (bounceReason) {
      updates.bounceReason = bounceReason;
    }
    
    await db
      .update(emailLogs)
      .set(updates)
      .where(eq(emailLogs.id, emailLogId))
      .execute();
  } catch (error) {
    console.error("Failed to update email status:", error);
  }
}
