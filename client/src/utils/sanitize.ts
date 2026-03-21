/**
 * Client-safe HTML sanitizer.
 * Strips script tags, event handlers, and javascript: hrefs from user content
 * before rendering. Defense-in-depth alongside server-side sanitization.
 */
export function sanitizeForClient(input: string): string {
  if (!input) return '';
  return input
    // Remove <script>...</script> blocks (case-insensitive, greedy)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove inline event handlers: onclick=, onmouseover=, onerror=, etc.
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*[^\s>]*/gi, '')
    // Replace javascript: hrefs with #
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    // Remove <iframe> tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove <object> and <embed> tags
    .replace(/<(?:object|embed)\b[^>]*>/gi, '')
    .trim();
}
