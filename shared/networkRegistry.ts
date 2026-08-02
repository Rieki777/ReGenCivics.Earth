/**
 * The ReGen Civics network of regenerative games: who is in it, and where.
 *
 * This is the other half of the foundation credit (shared/foundationCredit.ts).
 * Each delivered custom game links back to regencivics.earth from its footer;
 * this registry is how regencivics.earth links back out to each game, at
 * /network. Two-way, so the credit is a real network rather than a one-way
 * footer line, and each launch gives answer engines something new to crawl.
 *
 * Deterministic on purpose (STEERING section 11). One game ships per $20k
 * engagement, so a reviewed edit to this file per launch is cheaper and safer
 * than a table plus an admin screen, and it keeps the outbound links auditable
 * in git history. `server/lib/network-feed.ts` enriches these entries at request
 * time from each game's own /api/federation/projects.json (ADR-41) and degrades
 * to exactly what is written here when a game has no feed yet.
 *
 * Rules for adding an entry:
 *  - `listed: true` only with the owner's yes. They own the game outright, so
 *    being named on our site is their call, not ours.
 *  - Facts come from the deployment itself (its config endpoint or its own
 *    pages), never from memory. Every string here is quotable back to us.
 *  - `id` is stable forever: it is the `?ref=` value on that game's credit
 *    links, so changing it breaks referral attribution.
 */

export type NetworkGameStatus = "live" | "building";

export type NetworkGame = {
  /** Stable slug. Also the `?ref=` value on this game's credit links. */
  id: string;
  name: string;
  /** The game itself. Absolute, https, no trailing slash. */
  url: string;
  /** The project's own site, when it has one separate from the game. */
  projectUrl?: string;
  /** Their words, from their deployment. One line. */
  blurb: string;
  location: string;
  /** ISO date the game went live, or the build started. */
  since: string;
  status: NetworkGameStatus;
  /**
   * Path to this deployment's federation feed (ADR-41). Fetched best-effort for
   * a freshness signal and a project count; a 404 costs nothing and the entry
   * still renders from the fields above.
   */
  feedPath: string;
  /** Owner has agreed to be listed on regencivics.earth/network. */
  listed: boolean;
};

export const FEDERATION_FEED_PATH = "/api/federation/projects.json";

export const NETWORK_GAMES: readonly NetworkGame[] = Object.freeze([
  {
    id: "amora",
    name: "Amora",
    url: "https://amora.regencivics.earth",
    projectUrl: "https://amora.cr",
    blurb: "A regenerative village in Costa Rica where all beings belong and thrive.",
    location: "Dominicalito, Costa Rica",
    since: "2026-03-16",
    status: "live",
    feedPath: FEDERATION_FEED_PATH,
    listed: true,
  },
]) as readonly NetworkGame[];

/** What /network renders: listed games only, live first, newest first inside that. */
export function listedGames(games: readonly NetworkGame[] = NETWORK_GAMES): NetworkGame[] {
  return games
    .filter((g) => g.listed)
    .slice()
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "live" ? -1 : 1;
      return b.since.localeCompare(a.since);
    });
}

/**
 * The allowlist the server fetch is bounded by. Only these origins are ever
 * fetched for feed enrichment, so a registry edit is the only way to point the
 * server at a new host (BUILD-PLAYBOOK: no server-side fetch of a URL that did
 * not come from us).
 */
export function feedUrlFor(game: NetworkGame): string | null {
  if (!game.url.startsWith("https://")) return null;
  return `${game.url.replace(/\/$/, "")}${game.feedPath}`;
}
