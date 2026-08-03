/**
 * The network feed behind /network and GET /api/network/games.json.
 *
 * Every delivered custom game credits ReGen Civics in its footer
 * (shared/foundationCredit.ts). This is the return link: regencivics.earth lists
 * each live game and links out to it, so the credit is a two-way network and
 * each launch is a fresh page for answer engines to crawl.
 *
 * Shape of the work: the registry (shared/networkRegistry.ts) is the truth, and
 * every game's own /api/federation/projects.json (ADR-41) is optional enrichment
 * on top of it. A game that has not shipped its feed yet still renders in full
 * from the registry, so /network never depends on someone else's uptime.
 *
 * Bounded by construction: only registry origins are ever fetched, each fetch
 * gets a short timeout and a response size cap, and the whole thing is cached.
 * A failing member costs one log line, never a broken page.
 */
import { logger } from "../_core/logger";
import { assertSafeExternalUrl } from "../_core/ssrf";
import {
  NETWORK_GAMES,
  feedUrlFor,
  listedGames,
  type NetworkGame,
} from "@shared/networkRegistry";

const log = logger("network-feed");

/** What a member's federation feed contributes, when it serves one. */
export type NetworkGameFeed = {
  projectCount: number;
  description: string | null;
  generatedAt: string | null;
};

export type NetworkGameView = NetworkGame & { feed: NetworkGameFeed | null };

export type NetworkFeed = {
  network: string;
  description: string;
  generatedAt: string;
  games: NetworkGameView[];
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;
const MAX_FEED_BYTES = 512 * 1024;

let cache: { at: number; value: NetworkFeed } | null = null;

/**
 * Fetch one member's federation feed. Returns null for anything less than a
 * clean answer: a 404 (the common case today, since a fork adds the endpoint
 * when it is ready), a timeout, a body that is too large, or JSON that does not
 * carry the ADR-41 shape.
 */
async function fetchMemberFeed(game: NetworkGame): Promise<NetworkGameFeed | null> {
  const url = feedUrlFor(game);
  if (!url) return null;

  try {
    // The URL comes from our own registry, so this is belt and braces rather
    // than the primary gate. It still catches a registry entry whose host has
    // started resolving somewhere it should not.
    await assertSafeExternalUrl(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        redirect: "error",
        headers: { accept: "application/json", "user-agent": "ReGenCivicsNetwork/1.0" },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) return null;

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_FEED_BYTES) return null;
    const text = await res.text();
    if (text.length > MAX_FEED_BYTES) return null;

    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    const body = parsed as Record<string, unknown>;

    const projects = Array.isArray(body.projects) ? body.projects : null;
    if (!projects) return null;

    return {
      projectCount: projects.length,
      description: typeof body.description === "string" ? body.description.slice(0, 500) : null,
      generatedAt: typeof body.generatedAt === "string" ? body.generatedAt.slice(0, 40) : null,
    };
  } catch (err) {
    // One line, then carry on. A member being down is not our outage.
    log.info(`feed unavailable for ${game.id}: ${(err as Error)?.message ?? "unknown"}`);
    return null;
  }
}

/**
 * The network as /network and the JSON endpoint render it. Cached for ten
 * minutes; a launch shows up on the next refresh.
 */
export async function getNetworkFeed(
  games: readonly NetworkGame[] = NETWORK_GAMES,
): Promise<NetworkFeed> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;

  const listed = listedGames(games);
  const feeds = await Promise.all(
    listed.map((g) => (g.status === "live" ? fetchMemberFeed(g) : Promise.resolve(null))),
  );

  const value: NetworkFeed = {
    network: "ReGen Civics network of regenerative games",
    description:
      "Land projects running their own coordination game, built with ReGen Civics. Each game is owned outright by the project running it.",
    generatedAt: new Date().toISOString(),
    games: listed.map((g, i) => ({ ...g, feed: feeds[i] })),
  };

  cache = { at: Date.now(), value };
  return value;
}

/** Drops the cache. Used by tests and by anything that edits the registry. */
export function clearNetworkFeedCache(): void {
  cache = null;
}
