/**
 * Email Tracking Utilities
 * Provides open tracking (pixel) and click tracking (URL wrapping) for emails
 *
 * Click-tracking links are HMAC-signed at generation time and verified at
 * redirect time, so /api/track/click cannot be used as an open redirect.
 * Same-origin destinations (regencivics.earth and subdomains, or a relative
 * path) are allowed without a signature so links in already-sent emails keep
 * working; external destinations require a valid signature.
 */

import crypto from "crypto";
import { getDb } from "./db";
import { emailLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ── Click-redirect safety ────────────────────────────────────────────────────

/** Key for signing tracked URLs, derived from JWT_SECRET (fail-fast validated
 * at startup by _core/env.ts). Kept lazy so test runs without a secret still
 * import cleanly; signing/verification simply fail closed without a key. */
function trackingSigningKey(): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return `${secret}:email-click-tracking-v1`;
}

/** HMAC signature binding a destination URL to a specific email log entry. */
export function signTrackedUrl(emailLogId: number, url: string): string | null {
  const key = trackingSigningKey();
  if (!key) return null;
  return crypto.createHmac("sha256", key).update(`${emailLogId}:${url}`).digest("hex").slice(0, 32);
}

/** Timing-safe verification of a tracked-URL signature. Fails closed. */
export function verifyTrackedUrl(emailLogId: number, url: string, sig: string | undefined | null): boolean {
  if (!sig) return false;
  const expected = signTrackedUrl(emailLogId, url);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** True when a redirect target stays on our own surfaces: a relative path
 * (not protocol-relative) or an http(s) URL on regencivics.earth or one of
 * its subdomains (gov., core., assets., ...). These are safe without a
 * signature; anything else needs one. */
export function isInternalRedirectTarget(targetUrl: string): boolean {
  if (targetUrl.startsWith("/") && !targetUrl.startsWith("//")) return true;
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const allowedHosts = new Set<string>();
  for (const base of [process.env.VITE_APP_URL, process.env.APP_URL, "https://regencivics.earth"]) {
    if (!base) continue;
    try {
      allowedHosts.add(new URL(base).hostname.toLowerCase());
    } catch {
      // ignore malformed configured base URLs
    }
  }
  const host = parsed.hostname.toLowerCase();
  if (allowedHosts.has(host)) return true;
  return host === "regencivics.earth" || host.endsWith(".regencivics.earth");
}

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
  const sig = signTrackedUrl(emailLogId, originalUrl);
  const sigParam = sig ? `&sig=${sig}` : "";
  return `${baseUrl}/api/track/click/${emailLogId}?url=${encodedUrl}${sigParam}`;
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
