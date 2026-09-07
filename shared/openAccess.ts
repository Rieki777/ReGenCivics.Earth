/**
 * The monthly Open Access Sessions: what they are, and what each one is about.
 *
 * Moved here from client/src/lib/seasonEvents.ts on 2026-09-07. It was
 * client-only, which meant the calendar feed could say when a session was but
 * never what it was about. A subscriber holding "ReGen Civics Open Access
 * Session" and a time has no reason to show up; a subscriber holding "we're
 * talking through the whole season, how selection works, and the crowdpooling
 * launch" does.
 */

/** One-line standing pitch for the monthly session. Used on /season2 and /schedule. */
export const OPEN_ACCESS_PITCH =
  "A monthly session for anyone and everyone interested in what we're doing. Free, no commitment, no pitch required. Come meet the people building this and ask us anything.";

/** The body of an Open Access calendar invite, before links are appended. */
export const OPEN_ACCESS_DESCRIPTION =
  "Our monthly session for anyone and everyone interested in what we are doing. Free, no commitment, no pitch required. Come meet the people building this, ask us anything, and keep learning alongside the land projects as they go.";

/**
 * Per-session topics, keyed by session date.
 *
 * Set one whenever a session has a specific draw, so the page and the calendar
 * can say what the session is actually about instead of only when it is. Dates
 * that are not listed fall back to the standing pitch.
 */
export type SessionTopic = {
  headline: string;
  body: string;
  /** Lower-case fragment for mid-sentence use in banners. */
  short: string;
};

export const SESSION_TOPICS: Record<string, SessionTopic> = {
  "2026-09-10": {
    headline: "All things Season Two",
    body: "We're talking through the whole season: what projects get, how selection works, what the accelerator covers, and how the shared crowdpooling launch works. Come ask your questions and meet some of the cohort. More of them show up on selection day.",
    short: "all things Season Two",
  },
};

/** Topic for a given session date, or null when it is a standard open session. */
export function sessionTopic(date: string): SessionTopic | null {
  return SESSION_TOPICS[date] ?? null;
}

/**
 * The calendar body for one Open Access session.
 *
 * A dated session with a topic leads with the topic, because that is the reason
 * somebody would come. The standing description follows so a first-time reader
 * still learns what these sessions are.
 */
export function openAccessDescription(date: string | null): string {
  const topic = date ? sessionTopic(date) : null;
  if (!topic) return OPEN_ACCESS_DESCRIPTION;
  return `${topic.headline}. ${topic.body}\n\n${OPEN_ACCESS_DESCRIPTION}`;
}
