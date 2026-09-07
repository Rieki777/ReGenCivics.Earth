/**
 * Every link that goes into a calendar invite, defined once.
 *
 * The Riverside room URL carries a studio token (`?t=...`). Nobody could tell
 * us on 2026-09-07 whether that token is permanent, and a calendar invite lives
 * on a subscriber's phone for eight months. So invites never carry the raw
 * Riverside URL: they carry `regencivics.earth/join`, which redirects. If the
 * token ever rotates, change RIVERSIDE_ROOM_URL here and every invite already
 * sitting in every calendar keeps working.
 */

export const SITE_ORIGIN = "https://regencivics.earth";

/** The live room. Only the /join redirect and the on-page buttons use this. */
export const RIVERSIDE_ROOM_URL =
  "https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b";

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
