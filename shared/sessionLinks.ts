/**
 * Every link that goes into a calendar invite, defined once.
 *
 * Invites never carry a Riverside studio URL: they carry
 * `regencivics.earth/join`, which redirects. A calendar invite lives on a
 * subscriber's phone for months, so if the room link ever changes, change
 * RIVERSIDE_ROOM_URL here and every invite already sitting in every calendar
 * keeps working.
 *
 * Open Access Sessions and all thirteen Season Two episodes share this one room
 * on purpose (Rye, 2026-09-14). There is no second room.
 */

export const SITE_ORIGIN = "https://regencivics.earth";

/**
 * The live room. Only the /join redirect uses this directly.
 *
 * Changed 2026-09-14 from the token link
 * (`rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b`) to the room link Rye
 * named as the correct one. The token link is still what riversideRoomUrl holds
 * on every events row, which is why isDefaultRoomUrl matches the studio rather
 * than this one exact string.
 */
export const RIVERSIDE_ROOM_URL =
  "https://riverside.com/studio/rieki-cordon-riekis-studio/wvhy-zyit";

const STUDIO_URL = "https://riverside.com/studio/rieki-cordon-riekis-studio";

/**
 * True for any link into our one studio, in any form it has been stored.
 *
 * An exact comparison against RIVERSIDE_ROOM_URL breaks the moment the constant
 * changes: every row still holding the old token link would read as "a
 * different per-event room" and pass that old link straight into invites and
 * join buttons. Matching the studio path means every stored variant resolves to
 * /join, while a genuinely different room (another studio, a Zoom link) still
 * passes through.
 */
export function isDefaultRoomUrl(url: string | null | undefined): boolean {
  const value = url?.trim().toLowerCase().replace(/^http:/, "https:");
  if (!value) return false;
  return (
    value === STUDIO_URL ||
    value.startsWith(`${STUDIO_URL}/`) ||
    value.startsWith(`${STUDIO_URL}?`)
  );
}

/** The durable link. This is what goes in calendar invites and emails. */
export const JOIN_PATH = "/join";
export const JOIN_URL = `${SITE_ORIGIN}${JOIN_PATH}`;

/** SEEDS carries the livestream and the reruns for every season. */
export const SEEDS_YOUTUBE_URL = "https://www.youtube.com/@SEEDSRegenerativeEconomies";
/** Opens YouTube with the subscribe confirmation dialog already up. */
export const SEEDS_YOUTUBE_SUBSCRIBE_URL = `${SEEDS_YOUTUBE_URL}?sub_confirmation=1`;

export const RIVERSIDE_INFO = {
  topic: "ReGen Civics Season 2",
  description:
    "Join ReGen Civics in Season 2! Helping land projects evolve to the next stage of their regenerative journeys.",
  roomUrl: RIVERSIDE_ROOM_URL,
} as const;
