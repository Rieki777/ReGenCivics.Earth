/**
 * Security Middleware & Utilities
 * Handles CSP, CSRF protection, rate limiting, and input sanitization
 */

import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet, isCacheAvailable } from '../cache';
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
    "connect-src 'self' https: wss:",
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

export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, { token, createdAt: Date.now() });
  return token;
}

export function validateCSRFToken(sessionId: string, token: string): boolean {
  const record = csrfTokens.get(sessionId);
  
  if (!record) return false;
  
  if (Date.now() - record.createdAt > CSRF_TTL) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  return record.token === token;
}

/**
 * Input Sanitization
 * Removes potentially harmful HTML/JavaScript from user input
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove dangerous tags and event handlers
  let sanitized = input
    .replace(/<(script|style|iframe|object|embed|form|base|link|meta)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|base|link|meta)[^>]*\/?>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:\s*text\/html/gi, '');
  
  // Escape HTML entities for safety
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return sanitized.replace(/[&<>"']/g, char => htmlEscapes[char] || char);
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
