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

/**
 * Decode the five HTML entities the server-side plain-text sanitizer emits
 * (`sanitizeInput` → sanitize-html encodes & < > " '). Plain-text fields like
 * forum titles are stored encoded, which renders fine inside HTML bodies but
 * shows raw entities (e.g. "Each Other&#39;s Work") when React prints them as
 * text. Decode at render for those spots. Regex-only, so it is SSR-safe and
 * never touches the DOM. `&amp;` is decoded last to avoid double-decoding.
 */
export function decodeEntities(input?: string | null): string {
  if (!input) return '';
  return input
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
