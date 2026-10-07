/**
 * Open Graph cards for Season 2 URLs.
 *
 * WhatsApp, Telegram, Slack, and iMessage read the first HTML response and
 * do not run the React app. These sentences and image URLs are what
 * server/_core/vite.ts writes into the shell, and what /join writes into
 * its own document.
 *
 * Dates are the published Saturday anchors in SEASON2_EPISODE_DATES. A later
 * vote can move the live clock; the card keeps the catalog date.
 */

import { SEASON2_CURRICULUM } from "./season2Curriculum";
import { SEASON2_EPISODE_DATES } from "./sessionClock";
import { SITE_ORIGIN } from "./sessionLinks";

export type Season2Preview = {
  path: string;
  title: string;
  description: string;
  /** Absolute og:image URL. */
  image: string;
  /** File under client/public/og/s2/. */
  file: string;
  /** Large text on the card image. */
  imageTitle: string;
  /** Small line above that title. */
  kicker: string;
  /** Absolute, encoded og:url. */
  url: string;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function monthDay(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

function urlFor(path: string): string {
  const encoded = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${SITE_ORIGIN}${encoded}`;
}

function card(file: string): string {
  return `${SITE_ORIGIN}/og/s2/${file}`;
}

function page(entry: {
  path: string;
  title: string;
  description: string;
  file: string;
  imageTitle: string;
  kicker: string;
}): Season2Preview {
  return {
    ...entry,
    image: card(entry.file),
    url: urlFor(entry.path),
  };
}

const PAGES: Season2Preview[] = [
  page({
    path: "/season2",
    title: "Season 2 | ReGen Civics",
    description:
      "Thirteen weeks where land projects build their games together, then some projects launch into one shared crowdpool.",
    file: "season2.jpg",
    imageTitle: "Season 2",
    kicker: "LAND PROJECT GAMES",
  }),
  page({
    path: "/season-schedule",
    title: "Season 2 Session Times | ReGen Civics",
    description: "Vote on Season 2 session times and link your land project.",
    file: "season-schedule.jpg",
    imageTitle: "Vote on session times",
    kicker: "SEASON 2",
  }),
  page({
    path: "/interop-sessions",
    title: "Interoperability Circle | ReGen Civics",
    description:
      "Vote on the weekly time for the Interoperability Circle, where people build the tools under Season 2.",
    file: "interop-sessions.jpg",
    imageTitle: "Interoperability Circle",
    kicker: "TOOLS CIRCLE",
  }),
  page({
    path: "/schedule",
    title: "Season 2 Sessions | ReGen Civics",
    description: "See upcoming Season 2 sessions and open calls, and add one to your calendar.",
    file: "schedule.jpg",
    imageTitle: "Season 2 sessions",
    kicker: "CALENDAR",
  }),
  page({
    path: "/join",
    title: "Join the Season 2 Call | ReGen Civics",
    description: "Join the live Season 2 call.",
    file: "join.jpg",
    imageTitle: "Join the call",
    kicker: "LIVE CALL",
  }),
  page({
    path: "/apply",
    title: "Apply for Season 2 | ReGen Civics",
    description: "Apply with your land project for Season 2.",
    file: "apply.jpg",
    imageTitle: "Apply with your land project",
    kicker: "SEASON 2",
  }),
  page({
    path: "/shape-next-session",
    title: "Shape the Next Session | ReGen Civics",
    description: "Tell us what you want covered in the next Season 2 session.",
    file: "shape-next-session.jpg",
    imageTitle: "Shape the next session",
    kicker: "SEASON 2",
  }),
  page({
    path: "/apply/status",
    title: "Application Status | ReGen Civics",
    description: "Check where your land project application stands.",
    file: "apply-status.jpg",
    imageTitle: "Application status",
    kicker: "YOUR APPLICATION",
  }),
  page({
    path: "/series/Season 2",
    title: "Season 2 Events | ReGen Civics",
    description: "See past and upcoming Season 2 sessions in one list.",
    file: "series.jpg",
    imageTitle: "Season 2 events",
    kicker: "SESSION LIST",
  }),
];

function weekPreviews(): Season2Preview[] {
  return SEASON2_CURRICULUM.map((episode) => {
    const iso = SEASON2_EPISODE_DATES[episode.week - 1];
    const when = monthDay(iso);
    const file = `week-${String(episode.week).padStart(2, "0")}.jpg`;
    const path = `/season2/week/${episode.week}`;
    return page({
      path,
      title: `Week ${episode.week}: ${episode.title} | ReGen Civics`,
      description: `Open the live board for Week ${episode.week}, ${episode.title}, on ${when}.`,
      file,
      imageTitle: `Week ${episode.week}: ${episode.title}`,
      kicker: when.toUpperCase(),
    });
  });
}

const ALL: Season2Preview[] = [...PAGES, ...weekPreviews()];
const BY_PATH = new Map(ALL.map((preview) => [preview.path, preview]));

export function allSeason2Previews(): Season2Preview[] {
  return ALL;
}

/** Decode a request path and return its Season 2 card, or null. */
export function season2PreviewFor(rawPath: string): Season2Preview | null {
  const noQuery = (rawPath.split("?")[0] || "/").trim();
  let decoded = noQuery;
  try {
    decoded = decodeURIComponent(noQuery);
  } catch {
    decoded = noQuery;
  }
  if (decoded.length > 1 && decoded.endsWith("/")) decoded = decoded.slice(0, -1);
  return BY_PATH.get(decoded || "/") ?? null;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Head tags for a document that is not the SPA shell. /join uses this. */
export function season2PreviewHead(path: string): string {
  const preview = season2PreviewFor(path);
  if (!preview) return "";
  const title = escapeAttr(preview.title);
  const description = escapeAttr(preview.description);
  const url = escapeAttr(preview.url);
  const image = escapeAttr(preview.image);
  const alt = escapeAttr(preview.imageTitle);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${alt}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:url" content="${url}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join("\n");
}
