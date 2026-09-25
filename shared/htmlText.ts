/**
 * Plain text in HTML. Pure, shared by server and client.
 *
 * Campaign fields are stored through sanitizeInput, which strips tags and
 * encodes &, < and > as entities. Email templates used to interpolate those
 * values (and a few raw ones, such as a steward's note) straight into HTML.
 * textForEmail() decodes the basic entities once and escapes the result, so
 * an already-encoded value never shows up as "&amp;amp;" and a raw value
 * can never inject markup.
 */

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&#x27;": "'",
};

/** Decode the five XML entities plus &#39; and &#x27;, in one pass (so "&amp;lt;" stays "&lt;"). */
export function decodeBasicEntities(s: string): string {
  return String(s ?? "").replace(/&(?:amp|lt|gt|quot|apos|#39|#x27);/gi, (m) => ENTITY_MAP[m.toLowerCase()] ?? m);
}

export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Safe to drop into email HTML: decoded once, then escaped. */
export function textForEmail(s: string | null | undefined): string {
  return escapeHtml(decodeBasicEntities(s ?? ""));
}
