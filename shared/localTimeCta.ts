/**
 * "Your local time" converter links for event/call emails.
 *
 * Emails show Pacific wall time (canonical session clock). Recipients abroad
 * need one click to see that absolute start in their own zone. We use
 * timeanddate's Event Time Announcer with the instant expressed in UTC
 * (p1=1440), which converts worldwide including the reader's locale.
 */

/** timeanddate location id for UTC. */
export const TIMEANDDATE_UTC_LOCATION_ID = "1440";

export const LOCAL_TIME_CTA_LABEL = "Your local time";

const FIXED_TIME_BASE = "https://www.timeanddate.com/worldclock/fixedtime.html";

/** Max length for the optional event title on the converter page. */
const MSG_MAX = 80;

/**
 * Compact UTC stamp for timeanddate `iso=` (minute precision).
 * 2026-09-26T18:00:00.000Z -> 20260926T1800
 */
export function utcCompactIsoMinute(start: Date): string {
  if (Number.isNaN(start.getTime())) {
    throw new RangeError("utcCompactIsoMinute requires a valid Date");
  }
  const y = start.getUTCFullYear();
  const m = String(start.getUTCMonth() + 1).padStart(2, "0");
  const d = String(start.getUTCDate()).padStart(2, "0");
  const h = String(start.getUTCHours()).padStart(2, "0");
  const min = String(start.getUTCMinutes()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}`;
}

export type LocalTimeUrlOpts = {
  /** Shown as the announcement title on timeanddate. */
  title?: string | null;
  /** Optional duration in whole hours (`ah=`). */
  durationHours?: number;
};

/**
 * Absolute "see this instant in your timezone" URL.
 * Pass any absolute Date (UTC or otherwise); the link always encodes UTC.
 */
export function buildLocalTimeUrl(start: Date, opts: LocalTimeUrlOpts = {}): string {
  if (Number.isNaN(start.getTime())) {
    throw new RangeError("buildLocalTimeUrl requires a valid Date");
  }
  const params = new URLSearchParams();
  params.set("iso", utcCompactIsoMinute(start));
  params.set("p1", TIMEANDDATE_UTC_LOCATION_ID);
  const title = (opts.title ?? "").trim();
  if (title) {
    params.set("msg", title.length > MSG_MAX ? `${title.slice(0, MSG_MAX - 1)}…` : title);
  }
  if (opts.durationHours != null && Number.isFinite(opts.durationHours) && opts.durationHours > 0) {
    params.set("ah", String(Math.round(opts.durationHours)));
  }
  return `${FIXED_TIME_BASE}?${params.toString()}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export type LocalTimeCtaHtmlOpts = LocalTimeUrlOpts & {
  label?: string;
};

/**
 * Compact pill button/link for email HTML, placed next to the displayed time.
 * Returns empty string for invalid dates so callers can concatenate safely.
 */
export function localTimeCtaHtml(start: Date, opts: LocalTimeCtaHtmlOpts = {}): string {
  if (Number.isNaN(start.getTime())) return "";
  const url = escapeAttr(buildLocalTimeUrl(start, opts));
  const label = escapeHtml((opts.label ?? LOCAL_TIME_CTA_LABEL).trim() || LOCAL_TIME_CTA_LABEL);
  return (
    `<a href="${url}" ` +
    `style="display:inline-block;margin-left:10px;padding:4px 12px;border-radius:6px;` +
    `border:1px solid #7dd87d;color:#1a472a;background:#f0f7f0;text-decoration:none;` +
    `font-size:13px;font-weight:bold;vertical-align:middle;line-height:1.4;" ` +
    `target="_blank" rel="noopener noreferrer">${label}</a>`
  );
}
