/**
 * Pure helpers for GET /join. Emails and calendar invites link here so the
 * meeting place can change in one file.
 *
 * Plain /join, and any event whose stored room is missing or on the old
 * studio host, answers with a page on this site. A stored http(s) room on
 * another host still redirects.
 */

import { HOLOS_REGEN_CIVICS_URL, HYLO_SEEDS_URL } from "@shared/communityLinks";
import { episodeByWeek } from "@shared/season2Curriculum";
import { ACTIVE_SEASON, seasonConfig, seasonSessionsOn } from "@shared/seasonSchedule";
import { SESSION_TIME_ZONE } from "@shared/sessionClock";
import { JOIN_HERO, RIVERSIDE_ROOM_URL, SEEDS_YOUTUBE_URL, SITE_ORIGIN } from "@shared/sessionLinks";

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

/** One Season week, as the join page prints it. */
export type JoinSession = {
  week: number;
  title: string;
  start: Date;
  end: Date;
  status: string;
};

/** Catalog times for the active Season. Used when the episode rows are unreachable. */
export function catalogJoinSessions(): JoinSession[] {
  const config = seasonConfig(ACTIVE_SEASON);
  if (!config) return [];
  return seasonSessionsOn(config, config.opening).map((s) => ({
    week: s.week,
    title: episodeByWeek(s.week)?.title ?? `Week ${s.week}`,
    start: s.start,
    end: s.end,
    status: "upcoming",
  }));
}

/** Episode rows from the events table, titles without the "Week N: " prefix. */
export function joinSessionsFromRows(
  rows: readonly {
    week: number | null;
    title: string | null;
    startTime: Date;
    endTime: Date | null;
    status: string;
  }[],
): JoinSession[] {
  const minutes = seasonConfig(ACTIVE_SEASON)?.minutes ?? 120;
  const out: JoinSession[] = [];
  for (const row of rows) {
    if (row.week == null) continue;
    const start = new Date(row.startTime);
    if (Number.isNaN(start.getTime())) continue;
    const end = row.endTime ? new Date(row.endTime) : new Date(start.getTime() + minutes * 60_000);
    const prefix = `Week ${row.week}: `;
    const raw = (row.title ?? "").trim();
    const title = raw.startsWith(prefix) ? raw.slice(prefix.length) : raw || episodeByWeek(row.week)?.title || `Week ${row.week}`;
    out.push({ week: row.week, title, start, end, status: row.status });
  }
  return out;
}

export type JoinStatusLine = {
  live: boolean;
  label: "Live now" | "Next session";
  when: string;
  title: string;
};

function pacificClock(d: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SESSION_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const minute = get("minute");
  const hour = get("hour");
  const period = get("dayPeriod").toLowerCase().replace(/\s+/g, "");
  const time = minute === "00" ? `${hour}${period}` : `${hour}:${minute}${period}`;
  return { date: `${get("month")} ${get("day")}`, time };
}

/** The session happening now, or the next one that has not started. */
export function joinStatusLine(sessions: readonly JoinSession[], now: Date): JoinStatusLine | null {
  const open = sessions.filter((s) => s.status !== "cancelled");
  const live = open.find(
    (s) => s.status !== "completed" && s.start.getTime() <= now.getTime() && now.getTime() < s.end.getTime(),
  );
  const next = open
    .filter((s) => s.status !== "completed" && s.start.getTime() > now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  const pick = live ?? next;
  if (!pick) return null;
  const clock = pacificClock(pick.start);
  return {
    live: Boolean(live),
    label: live ? "Live now" : "Next session",
    when: `Season 2 · Week ${pick.week} · ${clock.date} · ${clock.time} PT`,
    title: pick.title,
  };
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ICON_HOLOS = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/></svg>`;
const ICON_HYLO = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="2.2" fill="currentColor"/><circle cx="15.5" cy="9.5" r="1.8" fill="currentColor"/><path d="M4.5 18.5c.6-2.6 2.6-4 4.6-4s4 1.4 4.6 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.5 14.8c1.2-.5 2.5-.6 3.6-.2 1.4.5 2.4 1.8 2.8 3.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const ICON_VIDEO = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 9.5v5l4.5-2.5z" fill="currentColor"/></svg>`;
const ICON_CAL = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 10h16M8 3.5v4M16 3.5v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

/**
 * On-site join page. The primary action opens the shared studio.
 * Colors are the site tokens: forest-deep #0d2818, forest-base #1a472a,
 * spring #7dd87d. Text sits on those solids, not on the hero photo.
 *
 * Join button: #0d2818 on #7dd87d (about 8.6:1).
 * Outlined vote button and status: #7dd87d on #0d2818 (about 8.9:1).
 * Tiles: #ffffff on #1a472a (about 10.5:1).
 * Focus ring #ffffff on the forest page.
 */
export function joinLandingHtml(sessions?: readonly JoinSession[], now: Date = new Date()): string {
  const schedule = `${SITE_ORIGIN}/schedule`;
  const status = joinStatusLine(sessions ?? catalogJoinSessions(), now);
  const statusHtml = status
    ? `<p class="eyebrow${status.live ? " live" : ""}"><span class="dot" aria-hidden="true"></span>${esc(status.label)}</p>
    <h1>Join the call</h1>
    <p class="when">${esc(status.when)}</p>
    <p class="topic">${esc(status.title)}</p>`
    : `<h1>Join the call</h1>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Join the call</title>
<style>
  @font-face {
    font-family: "Quicksand";
    font-style: normal;
    font-weight: 500 700;
    font-display: swap;
    src: url("/fonts/quicksand-latin.woff2") format("woff2");
  }
  @font-face {
    font-family: "Nunito";
    font-style: normal;
    font-weight: 400 700;
    font-display: swap;
    src: url("/fonts/nunito-latin.woff2") format("woff2");
  }
  body { margin: 0; background: #0d2818; color: #ffffff; font-family: Nunito, sans-serif; }
  .hero { position: relative; background: #0d2818; }
  .hero img {
    display: block;
    width: 100%;
    height: min(48vh, 440px);
    min-height: 220px;
    object-fit: cover;
    object-position: center 22%;
  }
  .hero-shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(13, 40, 24, 0.2) 0%, rgba(13, 40, 24, 0.08) 42%, rgba(13, 40, 24, 0.35) 78%, #0d2818 100%);
    pointer-events: none;
  }
  .sheet {
    position: relative;
    z-index: 1;
    max-width: 40rem;
    margin: 0 auto;
    padding: 0.25rem 1rem 3rem;
    text-align: center;
    background: #0d2818;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.55rem;
    padding: 0.35rem 0.75rem;
    background: #0d2818;
    color: #7dd87d;
    font-family: Quicksand, Nunito, sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    line-height: 1;
    text-transform: uppercase;
    border-radius: 999px;
    border: 1px solid rgba(125, 216, 125, 0.45);
  }
  .dot { width: 0.5rem; height: 0.5rem; border-radius: 999px; background: #7dd87d; }
  .live .dot { animation: live-dot 2.2s ease-out infinite; }
  h1 {
    margin: 0 0 0.4rem;
    font-family: Quicksand, Nunito, sans-serif;
    font-size: 2.25rem;
    font-weight: 700;
    line-height: 1.15;
    color: #ffffff;
  }
  .when, .topic { margin: 0; color: #ffffff; }
  .when { font-size: 1.05rem; font-weight: 700; }
  .topic { margin-top: 0.2rem; font-size: 1rem; }
  .join-call, .vote-times {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    padding: 1rem 1.25rem;
    font-family: Quicksand, Nunito, sans-serif;
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
    text-decoration: none;
    border-radius: 0.9rem;
  }
  .join-call {
    min-height: 72px;
    margin: 1rem 0 0.75rem;
    background: #7dd87d;
    color: #0d2818;
    font-size: 1.75rem;
    border: 3px solid #7dd87d;
    box-shadow: 0 0 22px rgba(125, 216, 125, 0.45);
    animation: join-glow 4.8s ease-in-out infinite;
  }
  .join-call:visited { color: #0d2818; background: #7dd87d; }
  .join-call:hover { background: #9de89d; border-color: #9de89d; color: #0d2818; }
  .join-call:focus { outline: 3px solid #ffffff; outline-offset: 4px; }
  .vote-times {
    min-height: 64px;
    margin: 0 0 1.35rem;
    background: transparent;
    color: #7dd87d;
    font-size: 1.375rem;
    border: 3px solid #7dd87d;
  }
  .vote-times:visited { color: #7dd87d; background: transparent; }
  .vote-times:hover { background: #7dd87d; color: #0d2818; }
  .vote-times:focus { outline: 3px solid #ffffff; outline-offset: 4px; }
  .note { margin: 0 0 0.9rem; color: #ffffff; font-size: 1rem; line-height: 1.45; }
  .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; text-align: left; }
  .tile {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    min-height: 3.25rem;
    padding: 0.7rem 0.9rem;
    background: #1a472a;
    color: #ffffff;
    font-weight: 700;
    text-decoration: none;
    border: 1px solid rgba(125, 216, 125, 0.4);
    border-radius: 0.9rem;
  }
  .tile svg { width: 1.35rem; height: 1.35rem; flex: none; color: #7dd87d; }
  .tile:visited { color: #ffffff; }
  .tile:hover { background: #143d24; }
  .tile:focus { outline: 3px solid #ffffff; outline-offset: 3px; }
  @keyframes join-glow {
    0%, 100% { box-shadow: 0 0 16px rgba(125, 216, 125, 0.28); }
    50% { box-shadow: 0 0 32px rgba(125, 216, 125, 0.55); }
  }
  @keyframes live-dot {
    0% { box-shadow: 0 0 0 0 rgba(125, 216, 125, 0.55); }
    100% { box-shadow: 0 0 0 8px rgba(125, 216, 125, 0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .join-call, .live .dot { animation: none; }
  }
  @media (max-width: 640px) {
    .sheet { padding: 0 0.75rem 2.5rem; }
    h1 { font-size: 1.85rem; }
    .join-call { min-height: 64px; font-size: 1.5rem; }
    .vote-times { min-height: 64px; font-size: 1.2rem; }
    .hero img { height: 42vh; min-height: 200px; }
  }
</style>
</head>
<body>
<header class="hero">
  <picture>
    <source media="(max-width: 640px)" srcset="${JOIN_HERO.phone}">
    <img src="${JOIN_HERO.wide}" alt="${esc(JOIN_HERO.alt)}" width="1280" height="720">
  </picture>
  <div class="hero-shade"></div>
</header>
<main class="sheet">
  ${statusHtml}
  <a class="join-call" href="${RIVERSIDE_ROOM_URL}">Join the call</a>
  <a class="vote-times" href="${SITE_ORIGIN}/season-schedule">Vote on call times here</a>
  <p class="note">Meet on Holos or Hylo. Recordings are on YouTube.</p>
  <div class="tiles">
    <a class="tile" href="${HOLOS_REGEN_CIVICS_URL}">${ICON_HOLOS}<span>Holos</span></a>
    <a class="tile" href="${HYLO_SEEDS_URL}">${ICON_HYLO}<span>Hylo</span></a>
    <a class="tile" href="${SEEDS_YOUTUBE_URL}">${ICON_VIDEO}<span>Watch on YouTube</span></a>
    <a class="tile" href="${schedule}">${ICON_CAL}<span>Session schedule</span></a>
  </div>
</main>
</body>
</html>
`;
}
