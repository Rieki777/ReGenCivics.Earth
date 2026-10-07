/**
 * Pure helpers for GET /join. Emails and calendar invites link here so the
 * meeting place can change in one file.
 *
 * Plain /join, and any event whose stored room is missing or on the old
 * studio host, answers with a page on this site. A stored http(s) room on
 * another host still redirects.
 */

import { HOLOS_REGEN_CIVICS_URL, HYLO_SEEDS_URL } from "@shared/communityLinks";
import { RIVERSIDE_ROOM_URL, SEEDS_YOUTUBE_URL, SITE_ORIGIN } from "@shared/sessionLinks";

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

/**
 * On-site join page. The primary action opens the shared studio.
 * The page does not redirect. Holos, Hylo, YouTube, and the schedule stay below.
 *
 * Button colors: white #ffffff on forest #1a472a (about 10.5:1).
 * Focus ring #111111 on the page cream #f6f3ea (about 16:1).
 */
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
  main { max-width: 40rem; margin: 0 auto; padding: 2.5rem 1rem 4rem; }
  h1 { font-size: 1.5rem; line-height: 1.2; margin: 0 0 1rem; font-weight: 700; }
  .join-call {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    min-height: 72px;
    margin: 0 0 0.75rem;
    padding: 1rem 1.25rem;
    background: #1a472a;
    color: #ffffff;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
    text-decoration: none;
    border: 3px solid #1a472a;
    border-radius: 0.75rem;
  }
  .join-call:visited { color: #ffffff; background: #1a472a; }
  .join-call:hover { background: #143d24; border-color: #143d24; color: #ffffff; }
  .join-call:focus { outline: 3px solid #111111; outline-offset: 4px; }
  .vote-times {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    min-height: 64px;
    margin: 0 0 1.75rem;
    padding: 0.75rem 1.25rem;
    background: transparent;
    color: #1a472a;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.375rem;
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
    text-decoration: none;
    border: 3px solid #1a472a;
    border-radius: 0.75rem;
  }
  .vote-times:visited { color: #1a472a; background: transparent; }
  .vote-times:hover { background: #1a472a; color: #ffffff; }
  .vote-times:focus { outline: 3px solid #111111; outline-offset: 4px; }
  p { font-size: 1.125rem; line-height: 1.5; }
  ul { padding-left: 1.25rem; }
  li { margin: 0.5rem 0; }
  .more a { color: #1a472a; font-weight: 700; }
  .more a:focus { outline: 3px solid #111111; outline-offset: 3px; }
  @media (max-width: 640px) {
    main { padding: 1.25rem 0.75rem 3rem; }
    .join-call { min-height: 64px; font-size: 1.5rem; }
    .vote-times { min-height: 64px; font-size: 1.25rem; }
  }
</style>
</head>
<body>
<main>
  <h1>Join the call</h1>
  <a class="join-call" href="${RIVERSIDE_ROOM_URL}">Join the call</a>
  <a class="vote-times" href="${SITE_ORIGIN}/season-schedule">Vote on call times here</a>
  <p>Meet the community on Holos or Hylo. Session recordings are on YouTube.</p>
  <ul class="more">
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
