/**
 * Client-side sanitization utilities.
 * Strips dangerous HTML patterns before rendering user-generated content.
 */

export function sanitizeForClient(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    .replace(/href\s*=\s*javascript:[^\s>]*/gi, 'href="#"');
}
