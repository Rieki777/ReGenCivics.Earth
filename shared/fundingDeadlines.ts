/**
 * Read a funder's free-text deadline into a real instant (funding engine plan
 * v1.3, section 4.3: "Nothing can trigger on free text").
 *
 * funding_pipeline.deadline holds what the research pass wrote: "Rolling",
 * "Cultivate", "Aug 24, 2026 (confirmed)", "Target Mar 1, 2027". Only a real,
 * exact date becomes deadlineAt. Everything else is classified so the backfill
 * report can say why a row has no date, and nothing approximate is ever
 * written: a guessed deadline that pings on the wrong day is worse than none.
 *
 * A date with no time is read as the START of that day in Pacific time. Early
 * is safe and late is not: "Batch 37 Deadline: October 2, 2026" with no time
 * means submitting by October 1, Pacific.
 */

export type DeadlineKind =
  | "date" // an exact date, written to deadlineAt
  | "approximate" // a date with "~", "target", "opens", "unverified", or no day
  | "rolling" // rolling, cycle-based, round-based, cohort-based
  | "relationship" // cultivate, warm intro, a call scheduled
  | "watch" // watch, verify: nothing known yet
  | "year_only" // "2027", "2027 cycle"
  | "unparsed" // looks like a date but has no year, or matched nothing
  | "none"; // empty or n/a

export interface ParsedDeadline {
  at: Date | null;
  kind: DeadlineKind;
  hasTime: boolean;
  note: string;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const MONTH_RE = "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const FULL_DATE = new RegExp(`\\b${MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "i");
const MONTH_DAY = new RegExp(`\\b${MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i");
const MONTH_YEAR = new RegExp(`\\b${MONTH_RE}\\.?\\s+(\\d{4})\\b`, "i");
const ISO = /\b(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2})?(Z|[+-]\d{2}:?\d{2})?)?\b/;
const TIME = /\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?(?![a-z])(?:\s*(PT|PST|PDT|Pacific|ET|EST|EDT|Eastern|CT|CST|CDT|Central|UTC|GMT)\b)?/i;
const APPROXIMATE = /~|\bapprox|\bunverified\b|\btarget\b|\bopens?\b|\baround\b|\bcirca\b|\bestimated?\b|\bexpected\b/i;

const ZONES: Record<string, string> = {
  pt: "America/Los_Angeles", pst: "America/Los_Angeles", pdt: "America/Los_Angeles", pacific: "America/Los_Angeles",
  et: "America/New_York", est: "America/New_York", edt: "America/New_York", eastern: "America/New_York",
  ct: "America/Chicago", cst: "America/Chicago", cdt: "America/Chicago", central: "America/Chicago",
  utc: "UTC", gmt: "UTC",
};

/** Minutes east of UTC for a zone at an instant: -420 for Pacific daylight time. */
function zoneOffsetMinutes(zone: string, at: Date): number {
  if (zone === "UTC") return 0;
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?/.exec(name);
  if (!m || !m[1]) return 0;
  const minutes = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return m[1] === "-" ? -minutes : minutes;
}

/** The UTC instant of a wall-clock time in an IANA zone, daylight time included. */
export function zonedToUtc(zone: string, y: number, month: number, d: number, hh = 0, mm = 0): Date {
  const wall = Date.UTC(y, month - 1, d, hh, mm);
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const next = wall - zoneOffsetMinutes(zone, new Date(guess)) * 60_000;
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

function validDay(y: number, month: number, d: number): boolean {
  if (month < 1 || month > 12 || d < 1 || d > 31) return false;
  const probe = new Date(Date.UTC(y, month - 1, d));
  return probe.getUTCMonth() === month - 1 && probe.getUTCDate() === d;
}

function timeOf(text: string): { hh: number; mm: number; zone: string } | null {
  const t = TIME.exec(text);
  if (!t) return null;
  let hh = Number(t[1]) % 12;
  if (t[3].toLowerCase() === "p") hh += 12;
  const mm = Number(t[2] ?? 0);
  const zone = ZONES[(t[4] ?? "pt").toLowerCase()] ?? "America/Los_Angeles";
  return { hh, mm, zone };
}

function result(kind: DeadlineKind, note: string, at: Date | null = null, hasTime = false): ParsedDeadline {
  return { at, kind, hasTime, note };
}

/** Classify a free-text deadline and, only for an exact date, return its instant. */
export function parseDeadlineText(text: string | null | undefined): ParsedDeadline {
  const raw = (text ?? "").trim();
  if (!raw || /^n\/?a$/i.test(raw)) return result("none", "no deadline text");

  const iso = ISO.exec(raw);
  if (iso) {
    const [, y, mo, d, hh, mm, tz] = iso;
    if (!validDay(Number(y), Number(mo), Number(d))) return result("unparsed", `not a real date: ${iso[0]}`);
    if (hh !== undefined && tz) {
      const at = new Date(iso[0].replace(" ", "T"));
      if (!Number.isNaN(at.getTime())) return result("date", "exact date and time", at, true);
    }
    const at = hh !== undefined
      ? zonedToUtc("America/Los_Angeles", Number(y), Number(mo), Number(d), Number(hh), Number(mm))
      : zonedToUtc("America/Los_Angeles", Number(y), Number(mo), Number(d));
    return result("date", hh !== undefined ? "time read as Pacific" : "no time given: read as the start of the day, Pacific", at, hh !== undefined);
  }

  const full = FULL_DATE.exec(raw);
  if (full) {
    const month = MONTHS[full[1].toLowerCase().replace(/\.$/, "")] ?? MONTHS[full[1].slice(0, 3).toLowerCase()];
    const d = Number(full[2]);
    const y = Number(full[3]);
    if (!month || !validDay(y, month, d)) return result("unparsed", `not a real date: ${full[0]}`);
    if (APPROXIMATE.test(raw)) return result("approximate", `approximate: "${raw}"`);
    const time = timeOf(raw);
    if (time) {
      return result("date", "exact date and time", zonedToUtc(time.zone, y, month, d, time.hh, time.mm), true);
    }
    return result("date", "no time given: read as the start of the day, Pacific", zonedToUtc("America/Los_Angeles", y, month, d));
  }

  if (MONTH_YEAR.test(raw) || (APPROXIMATE.test(raw) && MONTH_DAY.test(raw))) {
    return result("approximate", `no exact day: "${raw}"`);
  }
  if (MONTH_DAY.test(raw)) return result("unparsed", `no year: "${raw}"`);

  if (/\bwatch\b|\bverify\b/i.test(raw)) return result("watch", "nothing known yet");
  if (/\bcultivat|\bwarm intro|\bcall scheduled|\binvitation/i.test(raw)) return result("relationship", "relationship first, no application window");
  if (/^\D*\b20\d{2}\b\D*$/.test(raw)) return result("year_only", `year only: "${raw}"`);
  if (/\brolling\b|\bcycle|\bround|\bepoch|\bcohort|\bcontinuous|\bapply immediately\b/i.test(raw)) {
    return result("rolling", "no fixed deadline");
  }
  return result("unparsed", `no date found: "${raw}"`);
}
