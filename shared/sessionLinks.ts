/**
 * Every link that goes into a calendar invite, defined once.
 *
 * Invites carry `regencivics.earth/join`. A calendar invite lives on a
 * subscriber's phone for months. GET /join serves the on-site join page
 * unless that event has a stored room on another host.
 *
 * Open Access Sessions and all thirteen Season Two episodes share this one room
 * on purpose (Rye, 2026-09-14). There is no second room.
 */

export const SITE_ORIGIN = "https://regencivics.earth";

/**
 * Guest invite for the live studio. The /join button opens this URL.
 * Change it here. Nothing reads a Railway env var for the room.
 */
export const RIVERSIDE_ROOM_URL =
  "https://riverside.com/studio/rieki-cordon-riekis-studio/wvhy-zyit";

/**
 * True for the guest invite and for older stored copies of this same studio
 * (the path without the room code, or a `?t=` token). A different room returns false.
 */
export function isDefaultRoomUrl(url: string | null | undefined): boolean {
  const value = url?.trim().toLowerCase().replace(/^http:/, "https:");
  if (!value) return false;
  const guest = RIVERSIDE_ROOM_URL.toLowerCase();
  const studio = guest.replace(/\/[^/]+$/, "");
  return (
    value === guest ||
    value === studio ||
    value.startsWith(`${studio}/`) ||
    value.startsWith(`${studio}?`)
  );
}

/** The durable link. This is what goes in calendar invites and emails. */
export const JOIN_PATH = "/join";
export const JOIN_URL = `${SITE_ORIGIN}${JOIN_PATH}`;

/**
 * Site join href for UI and emails. With a positive event id → `/join?e=<id>`
 * so GET /join can route to that event's stored room. Without → plain `/join`.
 * Never returns a raw Riverside/Zoom/Holos URL.
 */
export function siteJoinUrl(eventId?: number | null): string {
  if (typeof eventId === "number" && Number.isInteger(eventId) && eventId > 0) {
    return `${JOIN_URL}?e=${eventId}`;
  }
  return JOIN_URL;
}

/** SEEDS carries the livestream and the reruns for every season. */
export const SEEDS_YOUTUBE_URL = "https://www.youtube.com/@SEEDSRegenerativeEconomies";
/** Opens YouTube with the subscribe confirmation dialog already up. */
export const SEEDS_YOUTUBE_SUBSCRIBE_URL = `${SEEDS_YOUTUBE_URL}?sub_confirmation=1`;

export const RIVERSIDE_INFO = {
  topic: "ReGen Civics Season 2",
  description:
    "Join ReGen Civics in Season 2. Helping land projects evolve to the next stage of their regenerative paths.",
  roomUrl: RIVERSIDE_ROOM_URL,
} as const;
