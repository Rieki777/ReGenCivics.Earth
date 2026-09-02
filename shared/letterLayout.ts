/**
 * Letter layouts for admin email + PDF.
 * Markdown stays the source. Layouts are code templates. The writing partner
 * may name a layout; it never emits HTML or PDF bytes.
 */

export const LETTER_LAYOUTS = ["plain", "announcement", "one_pager"] as const;
export type LetterLayout = (typeof LETTER_LAYOUTS)[number];

export const BUILTIN_COMPOSER_KEYS = [
  "follow_up",
  "acceptance",
  "rejection",
  "more_info",
  "schedule_call",
  "land_project_accepted",
  "custom",
] as const;

export type BuiltinComposerKey = (typeof BUILTIN_COMPOSER_KEYS)[number];

export const TEMPLATE_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;

export const LETTER_LOGO_URL =
  "https://regencivics.earth/images/logos/regencivics-logo-dark-transparent-rounded.webp";

export function isLetterLayout(value: unknown): value is LetterLayout {
  return typeof value === "string" && (LETTER_LAYOUTS as readonly string[]).includes(value);
}

export function defaultLayoutForTemplate(key: string): LetterLayout {
  if (key === "land_project_accepted" || key === "schedule_call" || key === "acceptance") {
    return "announcement";
  }
  return "plain";
}

/** Announcement and one-pager HTML already include the forest chrome. */
export function letterSkipsSendWrap(layout: LetterLayout): boolean {
  return layout !== "plain";
}

export function slugifyLetterKey(label: string): string {
  const core = (label ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return `letter_${core || "draft"}`;
}

export function uniqueLetterKey(label: string, existingKeys: Iterable<string>): string {
  const used = new Set(existingKeys);
  const base = slugifyLetterKey(label);
  if (!used.has(base)) return base;
  for (let n = 2; n < 100; n++) {
    const next = `${base}_${n}`.slice(0, 64);
    if (!used.has(next)) return next;
  }
  return `${base}_${Date.now()}`.slice(0, 64);
}

export function isHtmlEmailTemplateRow(row: { bodyFormat?: string | null }): boolean {
  return !row.bodyFormat || row.bodyFormat === "html";
}

export function isMarkdownEmailTemplateRow(row: { bodyFormat?: string | null }): boolean {
  return row.bodyFormat === "markdown";
}

export function letterFilename(subject: string): string {
  const slug = (subject ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || "regen-letter"}.pdf`;
}
