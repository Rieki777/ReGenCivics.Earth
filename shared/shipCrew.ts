/**
 * The crew's door: how /ship reaches the ReGen Pirates village
 * (SHIP_UNIFIED_GAME_PLAN.md, lane U1).
 *
 * The village lives on its own Village OS instance with its own accounts. This
 * site never signs anyone in there and never sends it member data. It only links.
 *
 * The door stays shut until PIRATES_VILLAGE_URL is set, so the links turn on
 * the moment the village is up, with no code change. Only a clean https origin
 * is ever shown: no credentials, no query, no fragment, no path.
 */

/** Paths on the village that the door links to (Village OS public routes). */
export const CREW_VILLAGE_PATHS = {
  /** The village's public welcome. */
  welcome: "/",
  /** Asking to come aboard without an invitation link. */
  hail: "/request-membership",
} as const;

/** A clean https origin for the village, or null when the door is shut. */
export function cleanCrewDoorUrl(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.search || url.hash) return null;
  if (url.pathname !== "/" && url.pathname !== "") return null;
  return url.origin;
}

/** A link into the village, or null when the door is shut. */
export function crewDoorLink(origin: string | null, path: keyof typeof CREW_VILLAGE_PATHS): string | null {
  if (!origin) return null;
  const p = CREW_VILLAGE_PATHS[path];
  return p === "/" ? `${origin}/` : `${origin}${p}`;
}
