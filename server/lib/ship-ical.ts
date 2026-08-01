/**
 * ship-ical.ts. The outbound iCalendar feed for the ReGen Ship.
 *
 * Outdoorsy (and any other channel) subscribes to this feed and blocks every
 * date it names, so the ship can never be sold twice. Outdoorsy re-reads it
 * every two hours.
 *
 * The single most important property here: the feed is derived from the SAME
 * `enumerateVoyageWeeks` output that renders /ship/book. It is not a second
 * opinion about availability, it is the same opinion in a different format. If
 * the booking page says a week is gone, the feed says it too, by construction.
 *
 * Two consequences fall out of that, both deliberate:
 *  - A mid-week blackout closes the whole voyage week on the channel, because
 *    that is what it does on our own booking page. This is the outbound half of
 *    the "snap outward" rule (Rye, 2026-08-01).
 *  - Migration passages are blocked even though no blackout row exists for
 *    them. They are derived from SHIP_SEASONAL_BANDS, and without this the
 *    channel would happily sell a week she is repositioning.
 *
 * Everything in this file is pure. No DB, no clock, no env. The route supplies
 * the weeks and today's date; the tests supply fixtures.
 *
 * RFC 5545: CRLF line endings, content lines folded at 75 octets, DTEND
 * exclusive. Outdoorsy is forgiving about all three. Google Calendar is not,
 * and the Phase 4 mirror subscribes to this same feed.
 */

import type { VoyageWeek } from "./ship-logic";

/** Product id advertised in the feed. */
const PRODID = "-//ReGen Civics//ReGen Ship Availability//EN";
/** UID domain, so ids stay globally unique if the feed is ever merged. */
const UID_DOMAIN = "regencivics.earth";
/** How long past the booking horizon to keep the channel closed. */
const BEYOND_HORIZON_YEARS = 3;

export type IcalBlockKind = "unavailable" | "hold";

/** One contiguous range the channel must not sell. Half-open: [start, end). */
export type IcalBlock = {
  /** Inclusive first blocked day, YYYY-MM-DD. */
  startDate: string;
  /** Exclusive last day, YYYY-MM-DD. */
  endDate: string;
  kind: IcalBlockKind;
  /** Human-facing SUMMARY. Never carries guest data. */
  summary: string;
};

// ── Date helpers (UTC-only, YYYY-MM-DD in and out) ───────────────────────────

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Add whole days to a YYYY-MM-DD, staying in UTC so DST can never shift it. */
export function addDays(ymd: string, days: number): string {
  const dt = parseYmd(ymd);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** YYYY-MM-DD to the compact DATE form iCalendar wants (YYYYMMDD). */
export function ymdCompact(ymd: string): string {
  return ymd.replace(/-/g, "");
}

// ── Week grid to blocks ──────────────────────────────────────────────────────

/**
 * Which week states close the channel.
 *
 * "open" and "requested" stay sellable-ish: open is genuinely free, and
 * requested is a soft hold that goes out as TENTATIVE rather than a hard block,
 * because a requested week has not been approved and may never be.
 */
function stateToKind(state: VoyageWeek["state"]): IcalBlockKind | null {
  if (state === "open") return null;
  if (state === "requested") return "hold";
  return "unavailable"; // booked, turnover, migration
}

function summaryFor(kind: IcalBlockKind, reason: string): string {
  return kind === "hold"
    ? `ReGen Ship — held (${reason})`
    : `ReGen Ship — ${reason}`;
}

export type BuildBlocksInput = {
  /** The enumerated grid, exactly as /ship/book receives it. */
  weeks: VoyageWeek[];
  /** Today as YYYY-MM-DD. */
  today: string;
};

/**
 * Turn the voyage-week grid into the minimum set of contiguous blocks.
 *
 * Adjacent weeks of the same kind merge, so a fully-booked season is a couple
 * of VEVENTs rather than a hundred. Two bookends are added:
 *
 *  - A leading block from today to the first bookable Monday. The current
 *    week has already begun (the grid drops any week whose Monday is not in
 *    the future), so without this the channel would sell a voyage that is
 *    already underway.
 *  - A trailing block past the end of the horizon. We only publish opinions
 *    about the weeks we enumerate; everything beyond stays shut rather than
 *    silently open.
 */
export function buildBlocksFromWeeks(input: BuildBlocksInput): IcalBlock[] {
  const { weeks, today } = input;
  const blocks: IcalBlock[] = [];

  if (weeks.length === 0) {
    // No grid at all: close everything rather than open everything. A feed that
    // fails open is worse than no feed.
    return [
      {
        startDate: today,
        endDate: addDays(today, 365 * BEYOND_HORIZON_YEARS),
        kind: "unavailable",
        summary: summaryFor("unavailable", "not bookable"),
      },
    ];
  }

  const sorted = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Leading bookend: today up to the first week we actually offer.
  if (today < sorted[0].startDate) {
    blocks.push({
      startDate: today,
      endDate: sorted[0].startDate,
      kind: "unavailable",
      summary: summaryFor("unavailable", "voyage in progress or too soon to board"),
    });
  }

  // The grid itself, merging runs that are contiguous, same kind, same reason.
  let run: IcalBlock | null = null;
  for (const week of sorted) {
    const kind = stateToKind(week.state);
    if (kind === null) {
      if (run) { blocks.push(run); run = null; }
      continue;
    }
    const summary = summaryFor(kind, reasonFor(week));
    if (run && run.kind === kind && run.summary === summary && run.endDate === week.startDate) {
      run.endDate = week.endDate;
      continue;
    }
    if (run) blocks.push(run);
    run = { startDate: week.startDate, endDate: week.endDate, kind, summary };
  }
  if (run) blocks.push(run);

  // Trailing bookend: past the horizon we say nothing useful, so say closed.
  const horizonEnd = sorted[sorted.length - 1].endDate;
  blocks.push({
    startDate: horizonEnd,
    endDate: addDays(horizonEnd, 365 * BEYOND_HORIZON_YEARS),
    kind: "unavailable",
    summary: summaryFor("unavailable", "beyond the booking horizon"),
  });

  return blocks;
}

function reasonFor(week: VoyageWeek): string {
  if (week.migration || week.state === "migration") return "on passage";
  if (week.state === "turnover") return "turnover";
  if (week.state === "requested") return "awaiting the covenant";
  return "sailing";
}

// ── Serialisation ────────────────────────────────────────────────────────────

/** Escape per RFC 5545 section 3.3.11. Order matters: backslash first. */
export function escapeIcalText(text: string): string {
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
 * sequence: an em-dash in a SUMMARY is 3 bytes, and splitting it produces a
 * feed that some parsers reject outright.
 */
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Walk back off any UTF-8 continuation byte (0b10xxxxxx).
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines carry a leading space
  }
  return parts.join("\r\n ");
}

/** Stable UID for a block. Same range, same id, run after run. */
export function blockUid(block: IcalBlock): string {
  return `ship-${block.kind}-${ymdCompact(block.startDate)}-${ymdCompact(block.endDate)}@${UID_DOMAIN}`;
}

export type BuildCalendarInput = {
  blocks: IcalBlock[];
  /** DTSTAMP / LAST-MODIFIED, as an ISO instant. */
  now: Date;
  /** X-WR-CALNAME shown to whoever subscribes. */
  calendarName?: string;
};

/** Render the full VCALENDAR document. */
export function buildShipCalendar(input: BuildCalendarInput): string {
  const stamp = `${input.now.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcalText(input.calendarName ?? "ReGen Ship availability")}`,
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const block of input.blocks) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${blockUid(block)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymdCompact(block.startDate)}`,
      `DTEND;VALUE=DATE:${ymdCompact(block.endDate)}`,
      `SUMMARY:${escapeIcalText(block.summary)}`,
      `STATUS:${block.kind === "hold" ? "TENTATIVE" : "CONFIRMED"}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
