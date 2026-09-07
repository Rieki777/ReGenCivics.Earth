/**
 * RFC 5545 primitives for the public calendar feeds.
 *
 * The feed we shipped before this file was hand-assembled with `\n` joins and
 * unfolded content lines. Most clients tolerated it. "Most" is not a property
 * you want in the one artifact that lands on a stranger's phone and stays there
 * for eight months, so this does it properly: CRLF everywhere, content lines
 * folded at 75 octets without splitting a multi-byte character, and text
 * escaped in the order the spec requires.
 *
 * Lives in shared/ because the server renders the feeds and the client's tests
 * assert on their shape.
 */

/** Escape per RFC 5545 section 3.3.11. Order matters: backslash first. */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold a content line to 75 octets, continuing with CRLF + one space.
 *
 * Counted in UTF-8 octets, not characters, and never split inside a multi-byte
 * sequence: a curly apostrophe in a SUMMARY is 3 bytes, and cutting it in half
 * produces a feed some parsers reject outright.
 */
export function foldIcsLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines carry a leading space
  }
  return parts.join("\r\n ");
}

/** 2026-09-26T18:00:00.000Z -> 20260926T180000Z */
export function icsUtcStamp(d: Date): string {
  return `${d.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  /** Canonical page for the event. Apple and Outlook surface this as a link. */
  url?: string;
  /**
   * Bumped whenever the event changes. A client that already holds this UID
   * ignores an update whose SEQUENCE did not advance, so an edit that leaves
   * this alone reaches the feed and never reaches anybody's phone.
   */
  sequence: number;
  /** Last time the row changed. Not the time we rendered the feed. */
  dtstamp: Date;
  status?: "CONFIRMED" | "CANCELLED" | "TENTATIVE";
  categories?: string[];
};

export function buildIcsEvent(ev: IcsEvent): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `SEQUENCE:${ev.sequence}`,
    `DTSTAMP:${icsUtcStamp(ev.dtstamp)}`,
    `DTSTART:${icsUtcStamp(ev.start)}`,
    `DTEND:${icsUtcStamp(ev.end)}`,
    `SUMMARY:${escapeIcsText(ev.summary)}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  if (ev.categories?.length) lines.push(`CATEGORIES:${ev.categories.map(escapeIcsText).join(",")}`);
  lines.push(`STATUS:${ev.status ?? "CONFIRMED"}`);
  lines.push("TRANSP:OPAQUE");
  lines.push("END:VEVENT");
  return lines;
}

export type IcsCalendar = {
  /** Shown as the calendar's name once someone subscribes. */
  name: string;
  description: string;
  events: IcsEvent[];
  prodId?: string;
  /**
   * How often a subscriber should re-fetch. Apple Calendar honours
   * REFRESH-INTERVAL; Outlook honours X-PUBLISHED-TTL; Google ignores both and
   * polls on its own schedule. All three are cheap to emit.
   */
  ttl?: string;
};

export function buildIcsCalendar(cal: IcsCalendar): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${cal.prodId ?? "-//ReGen Civics//Events//EN"}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(cal.name)}`,
    `X-WR-CALDESC:${escapeIcsText(cal.description)}`,
    "X-WR-TIMEZONE:UTC",
    `REFRESH-INTERVAL;VALUE=DURATION:${cal.ttl ?? "PT1H"}`,
    `X-PUBLISHED-TTL:${cal.ttl ?? "PT1H"}`,
  ];
  for (const ev of cal.events) lines.push(...buildIcsEvent(ev));
  lines.push("END:VCALENDAR");
  // Every event time is already UTC (a trailing Z), so the document needs no
  // VTIMEZONE block and cannot be misread by a client with a stale tz database.
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
