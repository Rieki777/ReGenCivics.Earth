/**
 * Email Service using Resend
 * Provides direct email sending functionality with tracking and branded templates
 * Domain: regencivics.earth (verified)
 */

import { Resend } from 'resend';
import { logger } from './logger';
import { signTrackedUrl } from '../emailTracking';
import { COOP } from '../../shared/fund';
import { decodeBasicEntities, textForEmail } from '../../shared/htmlText';
import {
  WHATSAPP_COMMUNITY_URL,
  DISCORD_INVITE_URL,
  YOUTUBE_CHANNEL_URL,
  HYLO_SEEDS_URL,
  HOLOS_REGEN_CIVICS_URL,
} from '../../shared/communityLinks';

const log = logger('email');

// Lazy Resend client initialization, avoids crashing at module load when key is missing
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    // Use empty string as fallback so the constructor doesn't crash in test environments
    // where the module is mocked. In production, RESEND_API_KEY must be set for emails to work.
    _resend = new Resend(process.env.RESEND_API_KEY || '');
  }
  return _resend;
}

// Verified sender email
const SENDER_EMAIL = 'ReGen Civics <team@regencivics.earth>';
const SENDER_NOREPLY = 'ReGen Civics <noreply@regencivics.earth>';

// Base URL for tracking (use environment variable in production)
const BASE_URL = process.env.VITE_APP_URL || 'https://regencivics.earth';

/**
 * Public base URL used when constructing deep links in notification emails.
 * Set APP_BASE_URL in your environment to override the default.
 *
 * Usage: `import { APP_BASE_URL } from '../_core/email'`
 * Then embed links as: `${APP_BASE_URL}/community/post/123`
 */
export const APP_BASE_URL =
  process.env.APP_BASE_URL || 'https://regencivics.earth';

/**
 * Prepend APP_BASE_URL to a relative path if it is not already an absolute URL.
 * Absolute URLs (starting with http:// or https://) are returned unchanged.
 *
 * @param path - A relative path like `/community/post/123` or an absolute URL.
 * @returns A full URL string.
 */
export function toAbsoluteUrl(path: string, utmParams?: { campaign?: string; medium?: string }): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = APP_BASE_URL.replace(/\/$/, '');
  const url = new URL(path, base);
  url.searchParams.set('utm_source', 'email');
  url.searchParams.set('utm_medium', utmParams?.medium ?? 'transactional');
  if (utmParams?.campaign) url.searchParams.set('utm_campaign', utmParams.campaign);
  return url.toString();
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  /**
   * @deprecated Reply-To is intentionally never set. We don't accept email
   * replies; recipients are routed through the Connect form on the site.
   * Kept on the type only so older call sites compile during cleanup; new
   * code should not pass this. Will be removed once all call sites stop
   * setting it.
   */
  replyTo?: string;
  // Tracking metadata
  template?: string;
  inquiryType?: string;
  inquiryId?: number;
  recipientName?: string;
  // Email log ID for tracking (if pre-created)
  emailLogId?: number;
  /**
   * Announcement and one-pager HTML already include forest chrome.
   * Skip the generic branded wrap so the letter header is not doubled.
   */
  skipBrandedWrap?: boolean;
  /**
   * 'auth' (sign-in links) draws on its own hourly budget, so campaign
   * notices and list mail can never use up the shared 50-an-hour cap and
   * leave people unable to sign in. See checkRateLimits.
   */
  budget?: 'auth';
}

/**
 * Generate branded email header
 */
function getEmailHeader(): string {
  return `
    <div style="background-color: #1a472a; background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: #7dd87d; margin: 0; font-family: 'Quicksand', sans-serif; font-size: 24px;">ReGen Civics</h1>
      <p style="color: #a8e6a8; margin: 5px 0 0 0; font-size: 12px;">An Infinite Game for the ReGenerative Renaissance</p>
    </div>
  `;
}

/**
 * Generate branded email footer with social links and no-reply notice
 */
function getEmailFooter(): string {
  return `
    <div style="background: #f0f7f0; padding: 25px 20px; margin-top: 30px; border-radius: 0 0 8px 8px; border-top: 3px solid #7dd87d;">
      <div style="text-align: center; margin-bottom: 20px;">
        <p style="color: #1a472a; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Connect With Us</p>
        <div style="margin: 15px 0;">
          <a href="${HYLO_SEEDS_URL}" style="display: inline-block; margin: 0 8px; color: #2d6a4f; text-decoration: none; font-size: 14px; font-weight: bold;">
            Hylo
          </a>
          <a href="${HOLOS_REGEN_CIVICS_URL}" style="display: inline-block; margin: 0 8px; color: #6b5b95; text-decoration: none; font-size: 14px; font-weight: bold;">
            Holos
          </a>
          <a href="${WHATSAPP_COMMUNITY_URL}" style="display: inline-block; margin: 0 8px; color: #25D366; text-decoration: none; font-size: 14px; font-weight: bold;">
            &#x1F4AC; WhatsApp
          </a>
          <a href="${DISCORD_INVITE_URL}" style="display: inline-block; margin: 0 8px; color: #5865F2; text-decoration: none; font-size: 14px; font-weight: bold;">
            &#x1F3AE; Discord
          </a>
          <a href="${YOUTUBE_CHANNEL_URL}" style="display: inline-block; margin: 0 8px; color: #FF0000; text-decoration: none; font-size: 14px; font-weight: bold;">
            &#x25B6; YouTube
          </a>
        </div>
      </div>
      
      <div style="background: #f0f7f0; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <p style="color: #1a472a; font-size: 13px; margin: 0 0 10px 0; text-align: center;">
          <strong>Questions or want to engage?</strong>
        </p>
        <p style="color: #4a7c59; font-size: 13px; margin: 0 0 10px 0; text-align: center;">
          We don't respond to emails directly. To reach us, fill out the
          short form on our Connect page and we'll route it to the right
          person.
        </p>
        <p style="text-align: center; margin: 0;">
          <a href="https://regencivics.earth/connect?path=something_else" style="display: inline-block; background: #1a472a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: bold;">
            Open the Connect form
          </a>
        </p>
        <p style="color: #4a7c59; font-size: 12px; margin: 12px 0 0 0; text-align: center;">
          We also gather on
          <a href="${HYLO_SEEDS_URL}" style="color: #2d6a4f;">Hylo</a>,
          <a href="${HOLOS_REGEN_CIVICS_URL}" style="color: #6b5b95;">Holos</a>,
          <a href="${WHATSAPP_COMMUNITY_URL}" style="color: #25D366;">WhatsApp</a>
          and
          <a href="${DISCORD_INVITE_URL}" style="color: #5865F2;">Discord</a>.
        </p>
      </div>
      
      <div style="text-align: center; border-top: 1px solid #c8e6c9; padding-top: 15px;">
        <p style="color: #4a7c59; font-size: 12px; margin: 0;">
          <a href="https://regencivics.earth" style="color: #4a7c59;">regencivics.earth</a>
        </p>
        <p style="color: #888; font-size: 11px; margin: 10px 0 0 0;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;
}

/**
 * Wrap email content with branded template
 */
function wrapWithBrandedTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ReGen Civics</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Nunito', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        ${getEmailHeader()}
        <div style="padding: 30px 25px;">
          ${content}
        </div>
        ${getEmailFooter()}
      </div>
    </body>
    </html>
  `;
}

/**
 * Add tracking pixel to email HTML
 */
function addTrackingPixel(html: string, emailLogId?: number): string {
  if (!emailLogId) return html;
  
  const trackingPixelUrl = `${BASE_URL}/api/track/open/${emailLogId}`;
  return html + `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
}

/**
 * A private offer status link (`/offer#<token>`, server/lib/offer-status.ts).
 * Its token lives in the fragment so no server ever sees it; the click
 * wrapper below would copy it into a query string (and the click log), so
 * these links are never wrapped.
 */
export function isPrivateOfferLink(url: string): boolean {
  return /\/offer#/.test(url);
}

/**
 * Wrap links with click tracking
 */
export function wrapLinksWithTracking(html: string, emailLogId?: number): string {
  if (!emailLogId) return html;

  // Replace href links with tracked versions (except mailto and tel links).
  // Each link is HMAC-signed so the click endpoint can verify the destination
  // was stamped by us (open-redirect guard, see server/emailTracking.ts).
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (match, url) => {
      if (isPrivateOfferLink(url)) return match;
      const sig = signTrackedUrl(emailLogId, url);
      const sigParam = sig ? `&sig=${sig}` : "";
      const trackedUrl = `${BASE_URL}/api/track/click/${emailLogId}?url=${encodeURIComponent(url)}${sigParam}`;
      return `href="${trackedUrl}"`;
    }
  );
}

// ── Email Rate Limiter ────────────────────────────────────────────────────────
// Two-layer protection against accidental spam:
//
//  1. STARTUP BURST BLOCK: For the first 120s after the process starts, max 5
//     total recipients. Catches the "digest fires on restart" class of bug even
//     if the digest job's own guard fails. Configurable via STARTUP_EMAIL_LIMIT.
//
//  2. ROLLING HOURLY RATE LIMIT: Sliding 1-hour window. Default 50 recipients/hr.
//     Set EMAIL_RATE_LIMIT_PER_HOUR to override. Use a high value (e.g. 500) to
//     effectively disable it for bulk sends you've consciously triggered.
//
//  3. SIGN-IN BUDGET: sign-in links (budget: 'auth') skip both guards above
//     and count against their own rolling hour instead (default 200 recipients,
//     AUTH_EMAIL_RATE_LIMIT_PER_HOUR). Anything that fans out (campaign
//     notices, digests, Outbound) can then never lock people out of signing
//     in. The request route has its own per-IP limit (5 a minute).
//
// These are in-memory and reset on restart. They supplement EMAIL_HOLD, not replace it.
// ─────────────────────────────────────────────────────────────────────────────

const SERVER_START_TIME = Date.now();
const STARTUP_WINDOW_MS = 120_000; // 2 minutes
const STARTUP_LIMIT = parseInt(process.env.STARTUP_EMAIL_LIMIT ?? "5", 10);
let startupEmailCount = 0;

const HOUR_MS = 60 * 60 * 1000;
const HOURLY_LIMIT = parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR ?? "50", 10);
// Sliding window: timestamps of each recipient send in the last hour
const sendTimestamps: number[] = [];
const AUTH_HOURLY_LIMIT = parseInt(process.env.AUTH_EMAIL_RATE_LIMIT_PER_HOUR ?? "200", 10);
const authSendTimestamps: number[] = [];

function checkRateLimits(recipientCount: number, subject: string, budget?: 'auth'): { blocked: boolean; reason: string } {
  const now = Date.now();

  if (budget === 'auth') {
    const windowStart = now - HOUR_MS;
    while (authSendTimestamps.length > 0 && authSendTimestamps[0] < windowStart) authSendTimestamps.shift();
    if (authSendTimestamps.length + recipientCount > AUTH_HOURLY_LIMIT) {
      return {
        blocked: true,
        reason: `AUTH_HOURLY_RATE_LIMIT, ${authSendTimestamps.length} sign-in emails already sent this hour (limit ${AUTH_HOURLY_LIMIT}). Set AUTH_EMAIL_RATE_LIMIT_PER_HOUR to raise this.`,
      };
    }
    return { blocked: false, reason: "" };
  }

  // ── Guard 1: startup burst ──
  const ageMs = now - SERVER_START_TIME;
  if (ageMs < STARTUP_WINDOW_MS) {
    if (startupEmailCount + recipientCount > STARTUP_LIMIT) {
      return {
        blocked: true,
        reason: `STARTUP_BURST_BLOCK, ${startupEmailCount + recipientCount} recipients would exceed the ${STARTUP_LIMIT}-recipient startup limit (${Math.round(ageMs / 1000)}s since start). Set STARTUP_EMAIL_LIMIT env var to raise this. Subject: "${subject}"`,
      };
    }
  }

  // ── Guard 2: rolling hourly window ──
  const windowStart = now - HOUR_MS;
  // Purge timestamps older than 1 hour
  while (sendTimestamps.length > 0 && sendTimestamps[0] < windowStart) sendTimestamps.shift();
  const sentThisHour = sendTimestamps.length;
  if (sentThisHour + recipientCount > HOURLY_LIMIT) {
    return {
      blocked: true,
      reason: `HOURLY_RATE_LIMIT, ${sentThisHour} already sent this hour, ${recipientCount} more would exceed the ${HOURLY_LIMIT}-recipient/hr limit. Set EMAIL_RATE_LIMIT_PER_HOUR env var to raise this. Subject: "${subject}"`,
    };
  }

  return { blocked: false, reason: "" };
}

function recordSend(recipientCount: number, budget?: 'auth'): void {
  const now = Date.now();
  if (budget === 'auth') {
    for (let i = 0; i < recipientCount; i++) authSendTimestamps.push(now);
    return;
  }
  const ageMs = now - SERVER_START_TIME;
  if (ageMs < STARTUP_WINDOW_MS) startupEmailCount += recipientCount;
  for (let i = 0; i < recipientCount; i++) sendTimestamps.push(now);
}

/** Test hook for the in-memory limiter (server/campaign-notification-prefs.test.ts). */
export const __emailRateLimitsForTests = { check: checkRateLimits, record: recordSend };

/**
 * Send an email using Resend with tracking
 * @param params Email parameters
 * @returns Email ID if successful, null if failed
 */
export async function sendEmail(params: SendEmailParams): Promise<{ id: string | null; trackingData?: any }> {
  // ── EMAIL HOLD ────────────────────────────────────────────────────────────
  // Set EMAIL_HOLD=true in Railway env vars to pause ALL outbound email.
  // Use this while testing flows or after accidental spam. Remove / set to false
  // to re-enable. Emails that hit this gate are logged but never sent.
  if (process.env.EMAIL_HOLD === "true") {
    const recipients = Array.isArray(params.to) ? params.to.join(", ") : params.to;
    log.info(`HELD (EMAIL_HOLD=true), would have sent "${params.subject}" to: ${recipients}`);
    return { id: null };
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── RATE LIMIT CHECK ──────────────────────────────────────────────────────
  const toList = Array.isArray(params.to) ? params.to : [params.to];
  const recipientCount = toList.length;
  const { blocked, reason } = checkRateLimits(recipientCount, params.subject, params.budget);
  if (blocked) {
    log.error(`BLOCKED by rate limiter, ${reason}`);
    // In production, this would ideally fire a Sentry alert or admin notification.
    try { const Sentry = await import("@sentry/node"); Sentry.captureMessage(`Email rate limit hit: ${reason}`, "error"); } catch {}
    return { id: null };
  }
  // Record send before dispatching (optimistic, prevents races)
  recordSend(recipientCount, params.budget);
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const {
      to,
      subject,
      html,
      from = SENDER_NOREPLY,
      template,
      inquiryType,
      inquiryId,
      recipientName,
      emailLogId,
      skipBrandedWrap = false,
    } = params;
    // params.replyTo is intentionally ignored. All replies route through
    // the Connect form on the site instead of into a personal inbox.
    void params.replyTo;
    
    // Wrap content with branded template unless the caller already did.
    let processedHtml = skipBrandedWrap ? html : wrapWithBrandedTemplate(html);
    
    // Add tracking if emailLogId is provided
    if (emailLogId) {
      processedHtml = wrapLinksWithTracking(processedHtml, emailLogId);
      processedHtml = addTrackingPixel(processedHtml, emailLogId);
    }
    
    const response = await getResend().emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: processedHtml,
      // Reply-To is deliberately omitted. Replies route through the
      // Connect form (https://regencivics.earth/connect) so they land
      // in admin as form submissions, not as inbox emails.
    });
    
    if (response.error) {
      log.error('Failed to send', undefined, { responseError: response.error });
      return { id: null };
    }
    
    log.info('Sent successfully', { messageId: response.data?.id });

    // If the caller pre-created a log row, stamp the Resend message id on it so
    // the delivery webhook can match the exact row later.
    if (emailLogId && response.data?.id) {
      const { setEmailLogResendId } = await import("../emailTracking");
      void setEmailLogResendId(emailLogId, response.data.id);
    }

    // Return tracking data for logging
    return {
      id: response.data?.id || null,
      trackingData: {
        recipientEmail: Array.isArray(to) ? to[0] : to,
        recipientName,
        subject,
        template,
        inquiryType,
        inquiryId,
        emailLogId,
      },
    };
  } catch (error) {
    log.error('Error sending email', error);
    return { id: null };
  }
}

/**
 * Test email connection
 * @returns true if connection is successful
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    log.info('Testing connection with API key', { apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10) + '...' });
    
    // Send a test email to verify the API key works
    const response = await getResend().emails.send({
      from: SENDER_NOREPLY,
      to: ['delivered@resend.dev'], // Resend's test email address
      subject: 'Test Email - ReGen Civics',
      html: wrapWithBrandedTemplate('<p>This is a test email to verify Resend integration.</p>'),
    });
    
    log.debug('Response', { response });
    
    if (response.error) {
      log.error('Response error', undefined, { responseError: response.error });
      return false;
    }
    
    return true;
  } catch (error) {
    log.error('Connection test failed', error);
    return false;
  }
}

/**
 * Email templates for common scenarios
 * All templates include no-reply messaging and social links in footer
 */
/** Arguments for the three contribution-status emails. */
export type ContributionEmailArgs = {
  recipientName: string;
  contributionTitle: string;
  campaignTitle: string;
  projectName: string;
  /** Absolute URL of the project page. */
  projectUrl: string;
  ownerNotes?: string | null;
  hoursPerWeek?: number | null;
  roleTitle?: string | null;
  /** Absolute /sign-in?returnTo=... URL. Never carries the email address. */
  signUpUrl: string;
  /** Absolute /campaigns URL for the declined email's button. */
  browseUrl?: string;
  /**
   * Accepted and declined: a fresh private link to this one offer
   * (server/lib/offer-status.ts, `/offer#<token>`). Left out when issuing
   * it failed; the email goes without it.
   */
  statusUrl?: string | null;
  /**
   * Accepted: the arrival note's set fields as labelled lines, in order
   * (arrivalNoteLines in shared/offerStatus.ts). Empty or missing: no block.
   */
  arrivalLines?: Array<{ label: string; text: string }>;
};

export type CampaignCancelledEmailArgs = {
  recipientName: string;
  campaignTitle: string;
  projectName: string;
  message?: string | null;
  suggestions: Array<{ title: string; place?: string | null; url: string }>;
  browseUrl: string;
  signUpUrl: string;
  /**
   * Who cancelled: the project's stewards, or the ReGen Civics team (an
   * admin who is not a steward). Unknown (null) reads neutrally.
   */
  cancelledBy?: 'stewards' | 'team' | null;
  /**
   * Why the campaign ended (build spec 2026-09-27, section 9.5). The close
   * reuses this one email, so people without an account still get only the
   * three fixed emails plus this one:
   *   - 'cancelled' (the default): today's words, unchanged;
   *   - 'closed': the close date passed and it didn't complete;
   *   - 'completed_unanswered': it completed at the close date while their
   *     offer was still waiting.
   */
  reason?: 'cancelled' | 'closed' | 'completed_unanswered';
  /** 'closed': the person's own lines (closeLinesFor), one paragraph each. */
  lines?: string[];
  /** 'closed': the day it closed, "21 March 2027". */
  closedOn?: string | null;
};

/**
 * The project page, sign-in and browse links for a campaign email. The
 * sign-in link returns to the project page and never carries the email
 * address.
 */
export function contributionEmailLinks(projectPath: string): { projectUrl: string; signUpUrl: string; browseUrl: string } {
  const utm = { campaign: 'contribution-status' };
  return {
    projectUrl: toAbsoluteUrl(projectPath, utm),
    signUpUrl: toAbsoluteUrl(`/sign-in?returnTo=${encodeURIComponent(projectPath)}`, utm),
    browseUrl: toAbsoluteUrl('/campaigns', utm),
  };
}

/** Sample arguments for the admin email previews (server/routes/newsletter.ts). */
export function sampleContributionEmailArgs(recipientName: string, contributionTitle: string, campaignTitle: string): ContributionEmailArgs {
  return {
    recipientName,
    contributionTitle,
    campaignTitle,
    projectName: campaignTitle,
    ownerNotes: null,
    ...contributionEmailLinks("/campaigns"),
  };
}

function emailButton(url: string, label: string): string {
  return `<div style="text-align: center; margin: 25px 0;">
        <a href="${textForEmail(url)}" style="display: inline-block; background: #4a7c59; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">${textForEmail(label)}</a>
      </div>`;
}

function stewardNoteBlock(heading: string, note?: string | null): string {
  const text = (note ?? '').trim();
  if (!text) return '';
  return `<div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #4a7c59; font-weight: bold; margin: 0 0 10px 0;">${textForEmail(heading)}</p>
        <p style="color: #333; margin: 0; white-space: pre-wrap;">${textForEmail(text)}</p>
      </div>`;
}

/** "Before you arrive" and the arrival note's labelled lines. Empty when there are none. */
function arrivalBlock(lines: Array<{ label: string; text: string }> | undefined): string {
  const set = (lines ?? []).filter((l) => l && l.text && l.text.trim());
  if (set.length === 0) return '';
  return `<div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #4a7c59; font-weight: bold; margin: 0 0 10px 0;">Before you arrive</p>
        ${set.map((l) => `<p style="color: #333; margin: 0 0 8px 0; white-space: pre-wrap;"><strong>${textForEmail(l.label)}:</strong> ${textForEmail(l.text)}</p>`).join('\n        ')}
      </div>`;
}

function accountNudgeBlock(signUpUrl: string): string {
  return `<div style="background: #fffaf0; padding: 18px 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #d4a574;">
        <p style="color: #333; margin: 0 0 10px 0; line-height: 1.6;">Make a free account with this email address and you'll hear every answer from the stewards in your notifications. Your offers show on each project's page whenever you're signed in.</p>
        <a href="${textForEmail(signUpUrl)}" style="color: #1a472a; font-weight: bold;">Make your account</a>
      </div>`;
}

function teamSignoff(): string {
  return `<div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #4a7c59; font-weight: bold; margin-bottom: 5px;">The ReGen Civics Team</p>
      </div>`;
}

/**
 * The one email an inquiry about the old fund gets now: a short note built
 * from COOP (shared/fund.ts). No deck, no terms, no amounts, no schedule.
 *
 * Until 2026-09-27 the reply was a deck link and a drip of four follow-ups
 * that described a fund with proposed terms and a distribution schedule. The
 * fund is now a cooperative in design that accepts no money, and a purchasing
 * cooperative keeps its "bought for use" footing only while nothing in the
 * funnel prices upside. The note fits inside the branded wrapper sendEmail
 * adds, so it carries the standard footer. The name is escaped: it comes
 * straight from a public form.
 */
function coopNote(recipientName: string): { subject: string; html: string } {
  const name = textForEmail(recipientName).trim();
  return {
    subject: 'Thanks for getting in touch with ReGen Civics',
    html: `
      <h2 style="color: #1a472a; margin-top: 0;">Thank you${name ? `, ${name}` : ''}</h2>
      <p style="color: #333; line-height: 1.6;">We received your note. Here is where the cooperative stands.</p>
      <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #1a472a; font-weight: bold; margin: 0 0 8px 0;">${textForEmail(COOP.name)}: ${textForEmail(COOP.statusLabel)}</p>
        <p style="color: #333; margin: 0; line-height: 1.6;">${textForEmail(COOP.statement)}</p>
      </div>
      <p style="color: #333; line-height: 1.6;">${textForEmail(COOP.interestPromise)}</p>
      <p style="color: #333; line-height: 1.6;">If you'd like to tell us which of the nine forms of capital you might bring, the interest form takes a couple of minutes.</p>
      ${emailButton(toAbsoluteUrl('/loi', { campaign: 'coop-interest' }), "Tell us you're interested")}
      <p style="color: #666; font-size: 12px; line-height: 1.6;">${textForEmail(COOP.notAnOffer)}</p>
      ${teamSignoff()}
    `,
  };
}

export const emailTemplates = {
  landProjectAccepted: (projectName: string, recipientName: string) => ({
    subject: `Congratulations! ${projectName} Passed Our Quality Check`,
    html: `
      <h2 style="color: #1a472a; margin-top: 0;">Great News, ${recipientName}!</h2>
      <p style="color: #333; line-height: 1.6;">We're excited to inform you that <strong>${projectName}</strong> has passed our initial quality check for ReGen Civics Season 2.</p>
      
      <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #4a7c59; margin-top: 0;">What This Means</h3>
        <p style="color: #333; margin-bottom: 0;">Your project meets our criteria for regenerative land stewardship and community building. However, final participation in Season 2 depends on our community governance process.</p>
      </div>
      
      <h3 style="color: #4a7c59;">Next Steps</h3>
      <ul style="color: #333; line-height: 1.8;">
        <li><strong>Community Governance:</strong> Your application will be reviewed by our community through a participatory voting process</li>
        <li><strong>Follow the Journey:</strong> We highly encourage you to stay engaged regardless of the final selection outcome</li>
        <li><strong>Alliance Eligibility:</strong> If you complete all the steps, you may still be eligible for joining the ReGen Civics Alliance even if not selected for Season 2</li>
      </ul>
      
      <p style="color: #333;">We'll keep you updated on the governance process and next steps.</p>
      
      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #4a7c59; font-weight: bold; margin-bottom: 5px;">The ReGen Civics Team</p>
      </div>
    `,
  }),
  
  followUp: (recipientName: string) => ({
    subject: 'Following Up on Your ReGen Civics Inquiry',
    html: `
      <h2 style="color: #1a472a; margin-top: 0;">Hello ${recipientName},</h2>
      <p style="color: #333; line-height: 1.6;">Thank you for your interest in ReGen Civics. We wanted to follow up on your inquiry and let you know we've received it.</p>
      
      <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #333; margin: 0;">We're here to support you on your regenerative journey. If you have questions or want to learn more, join our community channels where our team and community members are active!</p>
      </div>
      
      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #4a7c59; font-weight: bold; margin-bottom: 5px;">The ReGen Civics Team</p>
      </div>
    `,
  }),
  
  requestMoreInfo: (recipientName: string, questions: string) => ({
    subject: 'Additional Information Needed for Your Application',
    html: `
      <h2 style="color: #1a472a; margin-top: 0;">Hello ${recipientName},</h2>
      <p style="color: #333; line-height: 1.6;">Thank you for your application to ReGen Civics. To move forward with your review, we need some additional information:</p>
      
      <div style="background: #fff3e0; padding: 20px; border-left: 4px solid #d4a574; margin: 20px 0; border-radius: 0 8px 8px 0;">
        ${questions}
      </div>
      
      <p style="color: #333;">Please provide this information through our community channels or by updating your application.</p>
      
      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #4a7c59; font-weight: bold; margin-bottom: 5px;">The ReGen Civics Team</p>
      </div>
    `,
  }),
  
  applicationReceived: (projectName: string, recipientName: string) => ({
    subject: `Application Received: ${projectName}`,
    html: `
      <h2 style="color: #1a472a; margin-top: 0;">Thank You, ${recipientName}!</h2>
      <p style="color: #333; line-height: 1.6;">We've received your application for <strong>${projectName}</strong> to join ReGen Civics.</p>
      
      <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="color: #1a472a; font-size: 18px; margin: 0;">Your application is now in our review queue</p>
      </div>
      
      <h3 style="color: #4a7c59;">What Happens Next?</h3>
      <ol style="color: #333; line-height: 1.8;">
        <li>Our team will review your application within 5-7 business days</li>
        <li>You'll receive an email update on your application status</li>
        <li>If selected, you'll be invited to join our onboarding process</li>
      </ol>
      
      <p style="color: #333;">In the meantime, we encourage you to join our community and connect with other regenerative projects!</p>
      
      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #4a7c59; font-weight: bold; margin-bottom: 5px;">The ReGen Civics Team</p>
      </div>
    `,
  }),
  
  /**
   * Sent once, in reply to the old investor form (server/routes/investors.ts),
   * and offered as an admin template (server/routes/newsletter.ts). It is the
   * cooperative note now. The second argument stays so those callers compile,
   * and it is never rendered: echoing a stated investment range back to
   * someone is a pledge amount, which no surface may carry.
   */
  investorWelcome: (recipientName: string, _investmentRange?: string) => coopNote(recipientName),

  /** The same note, for any legacy form that still reaches the server (the old /loi pledge route). */
  coopInterestNote: (recipientName: string) => coopNote(recipientName),

  newsletterWelcome: (recipientName: string) => ({
    subject: 'Welcome to the ReGen Civics Newsletter!',
    html: `
      <h2 style="color: #1a472a; margin-top: 0;">Welcome to the Journey, ${recipientName || 'Friend'}!</h2>
      <p style="color: #333; line-height: 1.6;">You're now part of the ReGen Civics community. Get ready for updates on regenerative land projects, community events, and the infinite game of building a better world.</p>
      
      <div style="background-color: #f0f7f0; background: linear-gradient(135deg, #f0f7f0 0%, #f0f7f0 100%); padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="color: #1a472a; font-size: 18px; margin: 0 0 10px 0; font-weight: bold;">What to Expect</p>
        <p style="color: #4a7c59; margin: 0;">Monthly updates, project spotlights, community stories, and invitations to participate in the ReGenerative Renaissance.</p>
      </div>
      
      <p style="color: #333;">While you wait for our next newsletter, join our community to connect with fellow regenerators!</p>
      
      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #4a7c59; font-weight: bold; margin-bottom: 5px;">The ReGen Civics Team</p>
      </div>
    `,
  }),
  
  // ── Retired: the investor drip ──────────────────────────────────────────────
  // Nothing schedules these any more. server/routes/investors.ts stopped the
  // Day 3 / 7 / 14 / 30 sequence on 2026-09-27: it described the fund's
  // proposed terms and a distribution schedule, and it went out with no
  // unsubscribe link and no postal address. The four keys survive only because
  // scripts/fund-drip-refresh.ts still calls them to re-render rows already
  // queued in scheduled_emails. Those rows should be cancelled rather than
  // re-rendered; once they are, delete these keys together with that script.
  /** @deprecated Retired 2026-09-27; renders the cooperative note. */
  investorDripDay3: (recipientName: string) => coopNote(recipientName),
  /** @deprecated Retired 2026-09-27; renders the cooperative note. */
  investorDripDay7: (recipientName: string) => coopNote(recipientName),
  /** @deprecated Retired 2026-09-27; renders the cooperative note. */
  investorDripDay14: (recipientName: string) => coopNote(recipientName),
  /** @deprecated Retired 2026-09-27; renders the cooperative note. */
  investorDripDay30: (recipientName: string) => coopNote(recipientName),

  // ── Crowdpool contributions (people who contributed WITHOUT an account) ────
  // Account holders hear about these through the notification spine instead
  // (server/lib/campaign-notify.ts). Every interpolated value goes through
  // textForEmail: campaign fields are stored sanitized (entities), and a
  // steward's note or a contributor's name must never inject markup.
  contributionAccepted: (a: ContributionEmailArgs) => {
    const hours = a.hoursPerWeek && a.roleTitle
      ? `<p style="color: #333; line-height: 1.6;">You're in for ${Number(a.hoursPerWeek)} hours a week as ${textForEmail(a.roleTitle)}.</p>`
      : '';
    // The arrival note rides inside this email (ruling 2026-09-27, question 3).
    const arrival = arrivalBlock(a.arrivalLines);
    return {
      subject: `${decodeBasicEntities(a.projectName)} accepted your offer`,
      html: `
      <h2 style="color: #1a472a; margin-top: 0;">Good news, ${textForEmail(a.recipientName)}</h2>
      <p style="color: #333; line-height: 1.6;">The stewards of ${textForEmail(a.projectName)} accepted <strong>"${textForEmail(a.contributionTitle)}"</strong> for ${textForEmail(a.campaignTitle)}.</p>
      ${hours}
      ${arrival
        ? `<p style="color: #333; line-height: 1.6;">Here's what the stewards want you to know before you arrive.</p>
      ${arrival}`
        : ''}
      ${stewardNoteBlock('A note from the stewards', a.ownerNotes)}
      ${arrival ? '' : '<p style="color: #333; line-height: 1.6;">The stewards will reach out to sort out the details.</p>'}
      ${a.statusUrl ? emailButton(a.statusUrl, 'Check your offer') : ''}
      ${emailButton(a.projectUrl, 'See the project')}
      ${accountNudgeBlock(a.signUpUrl)}
      ${teamSignoff()}
    `,
    };
  },

  contributionRejected: (a: ContributionEmailArgs) => ({
    subject: `An update on your offer to ${decodeBasicEntities(a.projectName)}`,
    html: `
      <h2 style="color: #1a472a; margin-top: 0;">Hello ${textForEmail(a.recipientName)},</h2>
      <p style="color: #333; line-height: 1.6;">The stewards of ${textForEmail(a.projectName)} can't take <strong>"${textForEmail(a.contributionTitle)}"</strong> right now.</p>
      ${stewardNoteBlock('A note from the stewards', a.ownerNotes)}
      ${a.statusUrl
        ? `<p style="color: #333; line-height: 1.6;">Check this offer any time: <a href="${textForEmail(a.statusUrl)}" style="color: #1a472a; font-weight: bold;">Check your offer</a></p>`
        : ''}
      <p style="color: #333; line-height: 1.6;">Plenty of land projects need what you offered. Have a look at the live campaigns.</p>
      ${emailButton(a.browseUrl ?? toAbsoluteUrl('/campaigns', { campaign: 'contribution-status' }), 'Browse campaigns')}
      ${accountNudgeBlock(a.signUpUrl)}
      ${teamSignoff()}
    `,
  }),

  contributionFulfilled: (a: ContributionEmailArgs) => ({
    subject: `Your contribution to ${decodeBasicEntities(a.projectName)} is delivered`,
    html: `
      <h2 style="color: #1a472a; margin-top: 0;">Thank you, ${textForEmail(a.recipientName)}</h2>
      <p style="color: #333; line-height: 1.6;"><strong>"${textForEmail(a.contributionTitle)}"</strong> is marked delivered. Thank you for showing up for this land.</p>
      ${stewardNoteBlock('A note from the stewards', a.ownerNotes)}
      ${emailButton(a.projectUrl, 'See the project')}
      ${accountNudgeBlock(a.signUpUrl)}
      ${teamSignoff()}
    `,
  }),

  campaignCancelled: (a: CampaignCancelledEmailArgs) => {
    const suggestions = (a.suggestions ?? []).slice(0, 3);
    const reason = a.reason ?? 'cancelled';
    if (reason !== 'cancelled') {
      // The close (closed, or completed while the offer waited). The
      // suggestions are other open needs: title, project as the place, link.
      const needList = suggestions.length > 0
        ? `<p style="color: #333; line-height: 1.6;">These could use your help now:</p>
      <ul style="color: #333; line-height: 1.8; padding-left: 20px;">
        ${suggestions.map((s) => `<li><a href="${textForEmail(s.url)}" style="color: #1a472a; font-weight: bold;">${textForEmail(s.title)}</a>${s.place ? `, ${textForEmail(s.place)}` : ''}</li>`).join('')}
      </ul>`
        : `<p style="color: #333; line-height: 1.6;">Have a look at the live campaigns.</p>`;
      const campaign = textForEmail(a.campaignTitle);
      const project = textForEmail(a.projectName);
      const lead = reason === 'closed'
        ? `Crowdpooling for ${campaign} from ${project} closed${a.closedOn ? ` on ${textForEmail(a.closedOn)}` : ''} without completing.`
        : `${campaign} from ${project} completed before the stewards answered your offer, so it's closed with our thanks.`;
      const lines = reason === 'closed'
        ? (a.lines ?? []).filter((l) => l && l.trim()).map((l) => `<p style="color: #333; line-height: 1.6;">${textForEmail(l)}</p>`).join('\n      ')
        : '';
      return {
        subject: reason === 'closed'
          ? `${decodeBasicEntities(a.campaignTitle)} closed without completing`
          : `${decodeBasicEntities(a.campaignTitle)} is complete`,
        html: `
      <h2 style="color: #1a472a; margin-top: 0;">Hello ${textForEmail(a.recipientName)},</h2>
      <p style="color: #333; line-height: 1.6;">${lead}</p>
      ${lines}
      ${needList}
      ${emailButton(a.browseUrl, 'Browse campaigns')}
      ${accountNudgeBlock(a.signUpUrl)}
      ${teamSignoff()}
    `,
      };
    }
    const list = suggestions.length > 0
      ? `<p style="color: #333; line-height: 1.6;">These campaigns could use your energy right now:</p>
      <ul style="color: #333; line-height: 1.8; padding-left: 20px;">
        ${suggestions.map((s) => `<li><a href="${textForEmail(s.url)}" style="color: #1a472a; font-weight: bold;">${textForEmail(s.title)}</a>${s.place ? `, ${textForEmail(s.place)}` : ''}</li>`).join('')}
      </ul>`
      : `<p style="color: #333; line-height: 1.6;">Have a look at the live campaigns.</p>`;
    return {
      subject: `${decodeBasicEntities(a.campaignTitle)} has been cancelled`,
      html: `
      <h2 style="color: #1a472a; margin-top: 0;">Hello ${textForEmail(a.recipientName)},</h2>
      <p style="color: #333; line-height: 1.6;">${a.cancelledBy === 'stewards'
        ? `The stewards of ${textForEmail(a.projectName)} have cancelled ${textForEmail(a.campaignTitle)}.`
        : `${textForEmail(a.campaignTitle)} from ${textForEmail(a.projectName)} has been cancelled.`} Anything you offered that was still waiting or accepted is closed, and nothing more is expected from you.</p>
      ${stewardNoteBlock(a.cancelledBy === 'team' ? 'From the ReGen Civics team' : 'From the stewards', a.message)}
      ${list}
      ${emailButton(a.browseUrl, 'Browse campaigns')}
      ${accountNudgeBlock(a.signUpUrl)}
      ${teamSignoff()}
    `,
    };
  },
};
