/**
 * server/lib/ical-parse.ts
 *
 * A small inbound iCalendar reader: just enough of RFC 5545 to read a rental
 * channel's bookings feed. Written by hand rather than pulling a dependency,
 * because the input is a handful of events carrying UID, DTSTART, DTEND and
 * SUMMARY, and a parser we own is a parser we can reason about when a feed
 * misbehaves at 2am.
 *
 * Pure. No network, no clock, no env. The job supplies the text.
 *
 * What it deliberately does NOT do: recurrence (RRULE), alarms, timezone
 * component resolution, or attendee parsing. A booking feed has none of those,
 * and half-implementing VTIMEZONE would be worse than not reading it at all.
 * `hasRrule` is surfaced so the caller can notice if that assumption ever
 * breaks rather than silently mis-blocking a repeating event.
 */

export type IcalEvent = {
  uid: string;
  /** Inclusive first occupied day, YYYY-MM-DD. */
  startDate: string;
  /** Exclusive last day, YYYY-MM-DD. Half-open, matching our own convention. */
  endDate: string;
  summary: string;
  /** True when the source carried a clock time rather than a whole-day DATE. */
  hasTime: boolean;
  /** True when the event carried an RRULE, which this parser does not expand. */
  hasRrule: boolean;
};

/**
 * The hour at which a departing guest has left and the next voyage can board.
 *
 * The voyage grid shares its Monday boundary: she returns Monday 11am and the
 * next voyage boards Monday 5pm. So a channel booking that ends Monday morning
 * does NOT consume that Monday's voyage week, and its end date is exclusive
 * exactly like an all-day DTEND. A booking still running past boarding time
 * does consume the day, so that date is inclusive instead.
 */
const BOARDING_HOUR = 17;

/** Undo RFC 5545 line folding: CRLF (or LF) followed by one space or tab. */
export function unfoldIcal(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .filter((l) => l.length > 0);
}

/** Reverse the TEXT escaping of RFC 5545 section 3.3.11. Backslash last. */
export function unescapeIcalText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_m, c: string) =>
    c === "n" || c === "N" ? "\n" : c,
  );
}

type ParsedLine = { name: string; params: Record<string, string>; value: string };

/**
 * Split one unfolded content line into name, parameters and value.
 *
 * The value starts at the first colon that is not inside a quoted parameter,
 * so a param like `TZID="Europe/London:weird"` cannot truncate the value.
 */
export function parseContentLine(line: string): ParsedLine | null {
  let colon = -1;
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === ":" && !quoted) { colon = i; break; }
  }
  if (colon === -1) return null;

  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = head.split(";");
  const name = (parts.shift() ?? "").trim().toUpperCase();
  if (!name) return null;

  const params: Record<string, string> = {};
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    params[p.slice(0, eq).trim().toUpperCase()] = p
      .slice(eq + 1)
      .trim()
      .replace(/^"|"$/g, "")
      .toUpperCase();
  }
  return { name, params, value };
}

type IcalDate = { ymd: string; hasTime: boolean; hour: number };

/**
 * Read a DTSTART/DTEND value into a calendar date.
 *
 * Accepts `20260803`, `20260803T170000` and `20260803T170000Z`. A UTC value is
 * converted to the UTC calendar date; a floating or TZID-qualified value keeps
 * its literal date, because resolving a named zone would need VTIMEZONE data we
 * do not parse. Both land within a day of each other, and the caller snaps
 * outward to whole weeks afterwards, so a boundary case blocks more rather
 * than less.
 */
export function parseIcalDate(raw: string): IcalDate | null {
  const v = raw.trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(v);
  if (!m) return null;
  const [, y, mo, d, hh, mi, ss, z] = m;

  if (!hh) return { ymd: `${y}-${mo}-${d}`, hasTime: false, hour: 0 };

  if (z) {
    const t = Date.parse(`${y}-${mo}-${d}T${hh}:${mi}:${ss}Z`);
    if (Number.isNaN(t)) return null;
    const dt = new Date(t);
    return {
      ymd: dt.toISOString().slice(0, 10),
      hasTime: true,
      hour: dt.getUTCHours(),
    };
  }
  return { ymd: `${y}-${mo}-${d}`, hasTime: true, hour: Number(hh) };
}

/**
 * Turn a parsed DTEND into our exclusive end date.
 *
 * An all-day DTEND is already exclusive per RFC 5545. A timed DTEND is
 * exclusive too when the guest is gone before boarding, and inclusive when they
 * are not: see BOARDING_HOUR.
 */
function exclusiveEnd(end: IcalDate): string {
  if (!end.hasTime) return end.ymd;
  if (end.hour <= BOARDING_HOUR) return end.ymd;
  const t = Date.parse(`${end.ymd}T00:00:00Z`);
  return new Date(t + 86_400_000).toISOString().slice(0, 10);
}

/**
 * Extract every VEVENT from an iCalendar document.
 *
 * Events missing a UID, a DTSTART, or a parseable date are skipped and counted
 * by the caller through the returned length: a feed we cannot read must never
 * be treated as a feed with no bookings.
 */
export function parseIcalEvents(text: string): IcalEvent[] {
  const lines = unfoldIcal(text);
  const events: IcalEvent[] = [];

  let inEvent = false;
  let uid = "";
  let summary = "";
  let dtstart: IcalDate | null = null;
  let dtend: IcalDate | null = null;
  let durationDays: number | null = null;
  let hasRrule = false;

  const reset = () => {
    uid = ""; summary = ""; dtstart = null; dtend = null;
    durationDays = null; hasRrule = false;
  };

  for (const line of lines) {
    const parsed = parseContentLine(line);
    if (!parsed) continue;
    const { name, value } = parsed;

    if (name === "BEGIN" && value.trim().toUpperCase() === "VEVENT") {
      inEvent = true;
      reset();
      continue;
    }
    if (!inEvent) continue;

    if (name === "END" && value.trim().toUpperCase() === "VEVENT") {
      inEvent = false;
      if (!uid || !dtstart) continue;

      const start: IcalDate = dtstart;
      let endYmd: string;
      if (dtend) {
        endYmd = exclusiveEnd(dtend);
      } else if (durationDays !== null) {
        const t = Date.parse(`${start.ymd}T00:00:00Z`);
        endYmd = new Date(t + Math.max(1, durationDays) * 86_400_000)
          .toISOString()
          .slice(0, 10);
      } else {
        // RFC 5545 3.6.1: a DATE-valued DTSTART with no DTEND lasts one day.
        const t = Date.parse(`${start.ymd}T00:00:00Z`);
        endYmd = new Date(t + 86_400_000).toISOString().slice(0, 10);
      }
      // Never emit an inverted or empty range; a bad feed line should still
      // block its own start day rather than nothing at all.
      if (endYmd <= start.ymd) {
        const t = Date.parse(`${start.ymd}T00:00:00Z`);
        endYmd = new Date(t + 86_400_000).toISOString().slice(0, 10);
      }

      events.push({
        uid,
        startDate: start.ymd,
        endDate: endYmd,
        summary,
        hasTime: start.hasTime || Boolean(dtend?.hasTime),
        hasRrule,
      });
      continue;
    }

    switch (name) {
      case "UID": uid = unescapeIcalText(value).trim(); break;
      case "SUMMARY": summary = unescapeIcalText(value).trim(); break;
      case "DTSTART": dtstart = parseIcalDate(value); break;
      case "DTEND": dtend = parseIcalDate(value); break;
      case "RRULE": hasRrule = true; break;
      case "DURATION": {
        // Only whole-day and week durations matter here; anything with an
        // hour component rounds up to a day, which snaps outward anyway.
        const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(\d+)H)?/.exec(value.trim().toUpperCase());
        if (m) {
          const weeks = Number(m[1] ?? 0);
          const days = Number(m[2] ?? 0);
          const hours = Number(m[3] ?? 0);
          durationDays = weeks * 7 + days + (hours > 0 ? 1 : 0);
        }
        break;
      }
    }
  }

  return events;
}
