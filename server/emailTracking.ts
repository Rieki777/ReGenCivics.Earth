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
import { and, eq, gte, inArray } from "drizzle-orm";
import {
  SITE_ORIGIN,
  canonicalPublicBaseUrl,
  configuredPublicBaseUrl,
  isLegacyRegenCivicsHost,
  rewriteLegacySiteUrls,
} from "../shared/siteContext";

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
  for (const base of [process.env.VITE_APP_URL, process.env.APP_URL, process.env.APP_BASE_URL, SITE_ORIGIN]) {
    if (!base) continue;
    try {
      allowedHosts.add(new URL(canonicalPublicBaseUrl(base, SITE_ORIGIN)).hostname.toLowerCase());
    } catch {
      // ignore malformed configured base URLs
    }
  }
  const host = parsed.hostname.toLowerCase();
  // Old letters still point at the retired apex. Treat them as ours so the
  // click route can send the reader to .earth instead of dropping the click.
  if (isLegacyRegenCivicsHost(host)) return true;
  if (allowedHosts.has(host)) return true;
  return host === "regencivics.earth" || host.endsWith(".regencivics.earth");
}

/** Where a validated click should land. Retired-domain targets move to .earth. */
export function publicEmailRedirectTarget(targetUrl: string): string {
  return rewriteLegacySiteUrls(targetUrl);
}

function trackingBaseUrl(): string {
  return configuredPublicBaseUrl({
    appBaseUrl: process.env.APP_BASE_URL,
    appUrl: process.env.APP_URL,
    viteAppUrl: process.env.VITE_APP_URL,
  });
}

/**
 * Generate a tracking pixel URL for email open tracking
 * @param emailLogId - The ID of the email log entry
 * @returns URL to the tracking pixel endpoint
 */
export function generateTrackingPixelUrl(emailLogId: number): string {
  return `${trackingBaseUrl()}/api/track/open/${emailLogId}`;
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
  const baseUrl = trackingBaseUrl();
  const destination = rewriteLegacySiteUrls(originalUrl);
  const encodedUrl = encodeURIComponent(destination);
  const sig = signTrackedUrl(emailLogId, destination);
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

    const now = new Date();
    const [row] = await db
      .select({ status: emailLogs.status, deliveredAt: emailLogs.deliveredAt })
      .from(emailLogs)
      .where(eq(emailLogs.id, emailLogId))
      .limit(1);
    const updates: Record<string, unknown> = { openedAt: now };
    // An open proves inbox delivery; promote "sent" so History rates work
    // even when the email.delivered webhook never arrived.
    if (row?.status === "sent") {
      updates.status = "delivered";
      if (!row.deliveredAt) updates.deliveredAt = now;
    }
    await db.update(emailLogs).set(updates).where(eq(emailLogs.id, emailLogId)).execute();
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

    const now = new Date();
    const [row] = await db
      .select({ status: emailLogs.status, deliveredAt: emailLogs.deliveredAt })
      .from(emailLogs)
      .where(eq(emailLogs.id, emailLogId))
      .limit(1);
    const updates: Record<string, unknown> = { clickedAt: now };
    if (row?.status === "sent") {
      updates.status = "delivered";
      if (!row.deliveredAt) updates.deliveredAt = now;
    }
    await db.update(emailLogs).set(updates).where(eq(emailLogs.id, emailLogId)).execute();
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

export type EmailAttemptStatus = "queued" | "sent" | "held" | "blocked" | "failed";

const ACCEPTED_LOG_STATUSES = ["sent", "delivered", "bounced"] as const;

/**
 * Write or update the attempt row for one sendEmail call.
 * Caller-supplied ids are updated in place so a pre-created log is not doubled.
 * Otherwise one row is inserted per recipient.
 * Returns the ids that now reflect this attempt. Empty when the database is down.
 */
export async function writeEmailAttempt(input: {
  emailLogIds?: number[];
  recipients: Array<{ email: string; name?: string }>;
  subject: string;
  template?: string;
  inquiryType?: string;
  inquiryId?: number;
  status: EmailAttemptStatus;
  reason?: string;
  resendEmailId?: string;
}): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const subject = input.subject.slice(0, 500);
  const reason = input.reason ? input.reason.slice(0, 2000) : undefined;
  const patch: Record<string, unknown> = { status: input.status };
  if (reason) patch.bounceReason = reason;
  if (input.resendEmailId) patch.resendEmailId = input.resendEmailId;
  if (input.status === "sent") patch.sentAt = new Date();

  const existing = (input.emailLogIds ?? []).filter((id) => Number.isFinite(id));
  if (existing.length > 0) {
    await db.update(emailLogs).set(patch).where(inArray(emailLogs.id, existing));
    return existing;
  }

  const ids: number[] = [];
  for (const recipient of input.recipients) {
    const email = recipient.email.trim().slice(0, 255);
    if (!email) continue;
    const result = await db.insert(emailLogs).values({
      recipientEmail: email,
      recipientName: recipient.name?.slice(0, 255),
      subject,
      template: input.template?.slice(0, 100),
      inquiryType: input.inquiryType?.slice(0, 50),
      inquiryId: input.inquiryId,
      status: input.status,
      sentAt: new Date(),
      bounceReason: reason,
      resendEmailId: input.resendEmailId,
    });
    ids.push(result[0].insertId);
  }
  return ids;
}

function acceptedEmailSet(rows: Array<{ email: string | null }>): Set<string> {
  return new Set(rows.map((row) => (row.email ?? "").trim().toLowerCase()).filter(Boolean));
}

/** Addresses whose letter for this template was accepted by Resend since `since`. */
export async function emailsAcceptedSince(template: string, since: Date): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  const rows = await db
    .select({ email: emailLogs.recipientEmail })
    .from(emailLogs)
    .where(and(
      eq(emailLogs.template, template),
      gte(emailLogs.sentAt, since),
      inArray(emailLogs.status, [...ACCEPTED_LOG_STATUSES]),
    ));
  return acceptedEmailSet(rows);
}

/** Addresses already accepted for one logical send (event fan-out, recording, and so on). */
export async function emailsAcceptedForInquiry(
  template: string,
  inquiryType: string,
  inquiryId: number,
): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  const rows = await db
    .select({ email: emailLogs.recipientEmail })
    .from(emailLogs)
    .where(and(
      eq(emailLogs.template, template),
      eq(emailLogs.inquiryType, inquiryType),
      eq(emailLogs.inquiryId, inquiryId),
      inArray(emailLogs.status, [...ACCEPTED_LOG_STATUSES]),
    ));
  return acceptedEmailSet(rows);
}
