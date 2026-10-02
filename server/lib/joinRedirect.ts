/**
 * Pure helpers for GET /join. Emails and calendar invites link here so the
 * meeting place can change in one file.
 *
 * Plain /join, and any event whose stored room is missing or on the old
 * studio host, answers with a page on this site. A stored http(s) room on
 * another host still redirects.
 */

import { HOLOS_REGEN_CIVICS_URL, HYLO_SEEDS_URL } from "@shared/communityLinks";
import { SEEDS_YOUTUBE_URL, SITE_ORIGIN } from "@shared/sessionLinks";

/** Positive integer event id from `?e=`, or null if missing/invalid. */
export function parseJoinEventId(raw: unknown): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Accept only absolute http(s) URLs. Rejects javascript:, data:, relative
 * paths, and malformed strings — prevents open redirects via stored fields.
 */
export function safeExternalHttpUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return trimmed;
}

export type JoinRedirectEventFields = {
  riversideRoomUrl?: string | null;
  zoomUrl?: string | null;
};

/** True when the URL's host is the old studio. Those links stay off the public redirect. */
export function hostIsOldStudio(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes("riverside");
  } catch {
    return false;
  }
}

/**
 * Where GET /join should 302, or null when the response should be the on-site page.
 *
 * No event, a missing row, or no safe stored URL → null.
 * A stored room on the old studio host is skipped. The next safe http(s) URL
 * (the backup meeting link) is used. Otherwise null.
 */
export function resolveJoinRedirectTarget(
  event: JoinRedirectEventFields | null,
): string | null {
  if (!event) return null;
  for (const raw of [event.riversideRoomUrl, event.zoomUrl]) {
    const safe = safeExternalHttpUrl(raw);
    if (safe && !hostIsOldStudio(safe)) return safe;
  }
  return null;
}

/** On-site join page. Names the community gather places. Does not name the old studio. */
export function joinLandingHtml(): string {
  const schedule = `${SITE_ORIGIN}/schedule`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Join the call</title>
<style>
  body { margin: 0; background: #f6f3ea; color: #142416; font-family: Georgia, "Times New Roman", serif; }
  main { max-width: 36rem; margin: 0 auto; padding: 4rem 1.25rem; }
  h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 1rem; }
  p { font-size: 1.125rem; line-height: 1.5; }
  ul { padding-left: 1.25rem; }
  li { margin: 0.5rem 0; }
  a { color: #1a472a; font-weight: 700; }
</style>
</head>
<body>
<main>
  <h1>Join the call</h1>
  <p>Meet the community on Holos or Hylo. Session recordings are on YouTube.</p>
  <ul>
    <li><a href="${HOLOS_REGEN_CIVICS_URL}">Holos</a></li>
    <li><a href="${HYLO_SEEDS_URL}">Hylo</a></li>
    <li><a href="${SEEDS_YOUTUBE_URL}">Watch on YouTube</a></li>
    <li><a href="${schedule}">Session schedule</a></li>
  </ul>
</main>
</body>
</html>
`;
}
