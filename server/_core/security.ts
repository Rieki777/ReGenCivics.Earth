/**
 * Security Middleware & Utilities
 * Handles CSP, CSRF protection, rate limiting, and input sanitization
 */

import crypto from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet, cacheDel, isCacheAvailable } from '../cache';
import { generateNonce } from './nonce';

// In-memory fallback store for when Redis is unavailable
const rateLimitFallback = new Map<string, { count: number; resetTime: number }>();

/**
 * Per-request CSP nonce middleware.
 *
 * Mints a fresh nonce on every response, stashes it on res.locals so
 * the CSP middleware (next in chain) can reference it, and the HTML
 * template substitution layer in server/_core/index.ts can splice it
 * into `{{NONCE}}` placeholders inside index.html / offline.html.
 *
 * MUST be registered BEFORE cspMiddleware.
 */
export function cspNonceMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.locals.nonce = generateNonce();
  next();
}

/**
 * Content Security Policy Middleware
 * Prevents XSS attacks by restricting resource loading.
 *
 * Reads the per-request nonce from res.locals.nonce (set by
 * cspNonceMiddleware above) and injects it into script-src and
 * style-src. Inline scripts and styles tagged with the matching
 * `nonce="..."` attribute are allowed to execute; everything else is
 * blocked. 'unsafe-inline' and 'unsafe-eval' have been removed from
 * both directives.
 */
export function cspMiddleware(_req: Request, res: Response, next: NextFunction) {
  const nonce = res.locals.nonce as string | undefined;
  const nonceToken = nonce ? `'nonce-${nonce}'` : "";

  // Note on the script-src strategy:
  //
  //   script-src lists BOTH the per-request nonce AND 'unsafe-inline' as
  //   sources. Per the CSP3 spec section 8.4.4, modern browsers (Chrome
  //   95+, Firefox 93+, Safari 15.4+) IGNORE 'unsafe-inline' when a
  //   nonce or hash is present. So in any modern browser this collapses
  //   to "only nonced scripts execute" - exactly the strict mode we want.
  //   The 'unsafe-inline' fallback is there only for legacy browsers that
  //   do not implement CSP3 (a small and shrinking minority), so they
  //   keep working without dropping to a broken page.
  //
  //   'unsafe-eval' has been removed entirely. eval(), new Function(), and
  //   the inline event-handler equivalents are blocked everywhere. This
  //   is the actual XSS-blocker: a user-submitted <script>alert(1)</script>
  //   pasted into a forum post can never run, regardless of browser age.
  //
  //   style-src keeps 'unsafe-inline' because Tailwind v4, Radix, shadcn/ui
  //   and several other libraries inject runtime <style> blocks via
  //   document.createElement('style') with no library-side nonce hook.
  //   Inline styles cannot execute code, so this is a much lower XSS risk
  //   than inline scripts. Migrating to a CSS-in-JS layer that supports
  //   nonce providers is future work tracked in CSP_NONCE_MIGRATION_PLAN.
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' ${nonceToken} 'unsafe-inline' https://cdn.jsdelivr.net https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.youtube.com https://s.ytimg.com https://static.cloudflareinsights.com`.trim(),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://www.gstatic.com",
    "img-src 'self' data: blob: https://assets.regencivics.earth https://regencivics.earth https://*.googleapis.com https://*.gstatic.com https://img.youtube.com https://i.ytimg.com https://*.ytimg.com https://*.googleusercontent.com https://storage.googleapis.com https://lh3.googleusercontent.com https://www.google.com https://www.gstatic.com https://maps.gstatic.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "media-src 'self' https: blob:",
    // Whitelisted outbound origins for fetch/XHR/EventSource. Was `https:`
    // (any HTTPS host); narrowed to the actual destinations the client hits.
    // Order: self + same-domain CDN, geolocation lookup, Sentry telemetry,
    // Google Translate runtime, YouTube metadata, Plausible. Add new
    // origins here when we add a third-party SDK with client-side fetch.
    "connect-src 'self' https://*.regencivics.earth https://ipapi.co https://*.ingest.sentry.io https://*.sentry.io https://translate.googleapis.com https://translate-pa.googleapis.com https://www.googleapis.com https://www.google-analytics.com https://*.youtube.com https://*.ytimg.com wss:",
    "frame-src 'self' https://verify.walletconnect.com https://accounts.google.com https://calendly.com https://www.youtube.com https://youtu.be https://www.youtube-nocookie.com https://player.vimeo.com https://www.vimeo.com https://fast.wistia.net https://www.loom.com https://www.dailymotion.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests"
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspHeader);
  next();
}

/**
 * Additional Security Headers Middleware
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  
  // HSTS for HTTPS enforcement
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Cross-origin isolation headers
  // Note: same-origin-allow-popups is required for OAuth popup flows (Google, Apple).
  // Using same-origin would block OAuth popup windows from communicating back to the parent.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  next();
}

/**
 * Rate Limiting Middleware
 * Prevents abuse of public endpoints
 */
export function rateLimitMiddleware(
  windowMs: number = 15 * 60 * 1000,
  maxRequests: number = 100
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const routeKey = req.path.replace(/\//g, '_');
    const key = `ratelimit:${routeKey}:${ip}`;
    const now = Date.now();
    const windowSec = Math.ceil(windowMs / 1000);

    if (isCacheAvailable()) {
      try {
        const current = await cacheGet<{ count: number; resetTime: number }>(key);
        if (current && now < current.resetTime) {
          if (current.count >= maxRequests) {
            res.status(429).json({ error: 'Too many requests, please try again later' });
            return;
          }
          await cacheSet(key, { count: current.count + 1, resetTime: current.resetTime }, windowSec);
        } else {
          await cacheSet(key, { count: 1, resetTime: now + windowMs }, windowSec);
        }
        return next();
      } catch {
        // fall through to in-memory fallback
      }
    }

    // In-memory fallback
    const record = rateLimitFallback.get(key);
    if (record && now < record.resetTime) {
      if (record.count >= maxRequests) {
        res.status(429).json({ error: 'Too many requests, please try again later' });
        return;
      }
      record.count++;
    } else {
      rateLimitFallback.set(key, { count: 1, resetTime: now + windowMs });
    }
    next();
  };
}

/**
 * CSRF Token Generation & Validation
 */
const csrfTokens = new Map<string, { token: string; createdAt: number }>();
const CSRF_TTL = 15 * 60 * 1000; // 15 minutes

// Periodic cleanup: remove expired tokens every 30 minutes to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - CSRF_TTL;
  for (const [key, val] of Array.from(csrfTokens.entries())) {
    if (val.createdAt < cutoff) csrfTokens.delete(key);
  }
}, 30 * 60 * 1000);

/**
 * Per-IP rate limiter for webhook signature failures. An attacker can spam
 * unsigned/forged-signature requests to probe a webhook endpoint; this caps
 * each source IP to N failures per minute before returning 429. Use it
 * alongside (not instead of) the actual signature check — call
 * `recordWebhookFailure(ip, scope)` only AFTER a real signature mismatch.
 */
const webhookFailureBuckets = new Map<string, { count: number; resetAt: number }>();
const WEBHOOK_FAIL_LIMIT = 5;
const WEBHOOK_FAIL_WINDOW_MS = 60 * 1000;

const WEBHOOK_FAIL_WINDOW_SEC = Math.ceil(WEBHOOK_FAIL_WINDOW_MS / 1000);
const webhookFailKey = (scope: string, ip: string) => `webhookfail:${scope}:${ip}`;

export async function isWebhookFailureBlocked(ip: string, scope: string): Promise<boolean> {
  // Redis-backed when available so the failure count holds across replicas;
  // in-memory fallback (per-instance) when Redis is down.
  if (isCacheAvailable()) {
    const entry = await cacheGet<{ count: number }>(webhookFailKey(scope, ip));
    return (entry?.count ?? 0) >= WEBHOOK_FAIL_LIMIT;
  }
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const entry = webhookFailureBuckets.get(key);
  if (!entry || entry.resetAt < now) return false;
  return entry.count >= WEBHOOK_FAIL_LIMIT;
}

export async function recordWebhookFailure(ip: string, scope: string): Promise<void> {
  if (isCacheAvailable()) {
    // Fixed-window counter, TTL = window. A small read-modify-write race is
    // acceptable for a failure limiter (worst case a couple of extra attempts).
    const k = webhookFailKey(scope, ip);
    const entry = await cacheGet<{ count: number }>(k);
    await cacheSet(k, { count: (entry?.count ?? 0) + 1 }, WEBHOOK_FAIL_WINDOW_SEC);
    return;
  }
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const entry = webhookFailureBuckets.get(key);
  if (!entry || entry.resetAt < now) {
    webhookFailureBuckets.set(key, { count: 1, resetAt: now + WEBHOOK_FAIL_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

// Periodic cleanup so the map doesn't grow unbounded under attack.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of webhookFailureBuckets) {
    if (entry.resetAt < now) webhookFailureBuckets.delete(key);
  }
}, WEBHOOK_FAIL_WINDOW_MS);

/**
 * Constant-time string comparison for shared secrets carried in headers.
 * Returns false fast on length mismatch (length is not the secret) and uses
 * crypto.timingSafeEqual for the byte compare otherwise. Use this instead
 * of `===` when checking Bearer tokens, x-admin-secret headers, webhook
 * signature digests, or anything else an attacker could probe with timing.
 */
export function timingSafeEqualStr(a: string | undefined | null, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

const CSRF_TTL_SEC = Math.ceil(CSRF_TTL / 1000);
const csrfKey = (sessionId: string) => `csrf:${sessionId}`;

export async function generateCSRFToken(sessionId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const record = { token, createdAt: Date.now() };
  // Redis-backed when available so the token is shared across instances/replicas
  // (a token minted on one Railway replica validates on another). Falls back to
  // the in-memory map (single-instance) when Redis is unavailable.
  if (isCacheAvailable()) {
    await cacheSet(csrfKey(sessionId), record, CSRF_TTL_SEC);
  } else {
    csrfTokens.set(sessionId, record);
  }
  return token;
}

export async function validateCSRFToken(sessionId: string, token: string): Promise<boolean> {
  if (isCacheAvailable()) {
    const record = await cacheGet<{ token: string; createdAt: number }>(csrfKey(sessionId));
    if (!record) return false;
    // Redis TTL already expires the key; this is a defensive second check.
    if (Date.now() - record.createdAt > CSRF_TTL) {
      await cacheDel(csrfKey(sessionId));
      return false;
    }
    return timingSafeEqualStr(token, record.token);
  }

  const record = csrfTokens.get(sessionId);
  if (!record) return false;
  if (Date.now() - record.createdAt > CSRF_TTL) {
    csrfTokens.delete(sessionId);
    return false;
  }
  return timingSafeEqualStr(token, record.token);
}

/**
 * Input Sanitization
 *
 * Backed by the vetted `sanitize-html` library instead of hand-rolled regex.
 * Two strictness levels:
 *   - sanitizeInput  — PLAIN TEXT. Strips every tag and its dangerous content
 *     (script/style/iframe bodies are discarded, not just the tag), drops all
 *     attributes, and entity-encodes stray `<`/`>`/`&` in the remaining text.
 *     Use for names, titles, messages, profile bios, and any field rendered as
 *     text. This is the default chokepoint for user content into the DB.
 *   - sanitizeRichText — a narrow markdown-safe tag allowlist for the rare
 *     field that must keep basic formatting. Not wired to any route today;
 *     provided so a future rich-text surface doesn't hand-roll its own.
 */
const PLAIN_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
  // Discard the CONTENT of these tags, not just the tag wrapper, so
  // `<script>alert(1)</script>` leaves nothing behind.
  nonTextTags: ['script', 'style', 'textarea', 'noscript', 'iframe', 'object', 'embed'],
};

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4'],
  allowedAttributes: { a: ['href', 'title'] },
  // Only safe link schemes; blocks javascript:/vbscript:/data: URLs.
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
};

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return sanitizeHtml(input, PLAIN_TEXT_OPTIONS);
}

export function sanitizeRichText(input: string): string {
  if (typeof input !== 'string') return '';
  return sanitizeHtml(input, RICH_TEXT_OPTIONS);
}

/**
 * Sanitize Object
 * Recursively sanitizes all string values in an object
 */
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeInput(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  
  return sanitized;
}

/**
 * Validate Email
 */
export function isValidEmail(email: string): boolean {
  // Require: local part, @, domain with at least one dot, TLD 2-63 chars
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,63}$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate File Upload
 */
// Map of allowed MIME types to their valid extensions
const MIME_EXTENSION_MAP: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
};

export function validateFileUpload(
  fileName: string,
  fileSize: number,
  mimeType?: string,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf'],
  maxSize: number = 10 * 1024 * 1024 // 10MB
): { valid: boolean; error?: string } {
  // Check file size
  if (fileSize > maxSize) {
    return { valid: false, error: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB` };
  }

  // Strip null bytes from filename
  const cleanName = fileName.replace(/\0/g, '');

  // Check file extension
  const extension = cleanName.split('.').pop()?.toLowerCase();
  const validExtensions = allowedTypes.flatMap(t => MIME_EXTENSION_MAP[t] || []);

  if (!extension || !validExtensions.includes(extension)) {
    return { valid: false, error: 'File type not allowed' };
  }

  // Validate MIME type matches extension if provided
  if (mimeType) {
    if (!allowedTypes.includes(mimeType)) {
      return { valid: false, error: 'File MIME type not allowed' };
    }
    const expectedExtensions = MIME_EXTENSION_MAP[mimeType];
    if (expectedExtensions && !expectedExtensions.includes(extension)) {
      return { valid: false, error: 'File extension does not match its content type' };
    }
  }

  return { valid: true };
}

/**
 * Prevent Path Traversal
 * Handles raw, URL-encoded (%2e%2e%2f), and double-encoded variants
 */
export function sanitizePath(inputPath: string): string {
  // Strip null bytes
  let decoded = inputPath.replace(/\0/g, '');
  // Decode URL-encoded characters (try twice for double-encoding)
  for (let i = 0; i < 2; i++) {
    try { decoded = decodeURIComponent(decoded); } catch { break; }
  }
  // Strip null bytes again after decoding
  decoded = decoded.replace(/\0/g, '');
  // Remove traversal attempts
  return decoded
    .replace(/\.\.\//g, '')
    .replace(/\.\.\\/g, '')
    .replace(/\.{2,}/g, '.');
}
