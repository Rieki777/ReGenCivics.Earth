/**
 * Suggested Hylo / Holos announce copy for a live or upcoming session.
 * Destination URLs come from shared/communityLinks — no API keys.
 */
import { HOLOS_REGEN_CIVICS_URL, HYLO_SEEDS_URL } from "./communityLinks";
import { SITE_ORIGIN } from "./sessionLinks";

export type SessionAnnounceInput = {
  title?: string | null;
  /** ISO string or Date */
  startTime?: string | Date | null;
  /** IANA zone when known (e.g. event.timezone) */
  timeZone?: string | null;
  /** Absolute public URL; defaults to /events/:id or /schedule */
  publicUrl?: string | null;
  eventId?: number | null;
};

export type SessionAnnounceResult = {
  body: string;
  hyloUrl: string;
  holosUrl: string;
  publicUrl: string;
};

/** Build the public event page URL used in announce paste text. */
export function sessionPublicUrl(eventId: number): string {
  return `${SITE_ORIGIN}/events/${eventId}`;
}

/**
 * Format a session start for paste into community compose.
 * Prefer the event's stored IANA zone so operators and members share one clock;
 * fall back to the runtime default with a short zone name.
 */
export function formatSessionWhen(
  startTime: string | Date | null | undefined,
  timeZone?: string | null,
): string | null {
  if (startTime == null || startTime === "") return null;
  const date = typeof startTime === "string" ? new Date(startTime) : startTime;
  if (Number.isNaN(date.getTime())) return null;

  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };
  // events.timezone often stores abbreviations (EDT) — Intl needs IANA.
  if (isIanaTimeZone(timeZone)) opts.timeZone = timeZone.trim();

  try {
    return date.toLocaleString("en-US", opts);
  } catch {
    delete opts.timeZone;
    return date.toLocaleString("en-US", opts);
  }
}

/** True for IANA names (America/Los_Angeles) or UTC/GMT — not EDT/PST labels. */
export function isIanaTimeZone(zone: string | null | undefined): boolean {
  const z = zone?.trim();
  if (!z) return false;
  if (z === "UTC" || z === "GMT") return true;
  return z.includes("/");
}

export function buildSessionAnnounce(input: SessionAnnounceInput): SessionAnnounceResult {
  const title =
    (typeof input.title === "string" ? input.title.trim() : "") || "ReGen Civics session";

  let publicUrl = typeof input.publicUrl === "string" ? input.publicUrl.trim() : "";
  if (!publicUrl) {
    publicUrl =
      input.eventId != null && Number.isFinite(input.eventId)
        ? sessionPublicUrl(Number(input.eventId))
        : `${SITE_ORIGIN}/schedule`;
  }

  const when = formatSessionWhen(input.startTime, input.timeZone);
  const lines = [
    `Join us: ${title}`,
    when ? `When: ${when}` : null,
    publicUrl,
    "",
    "See you in the circle — ReGen Civics / SEEDS",
  ].filter((line): line is string => line != null);

  return {
    body: lines.join("\n"),
    hyloUrl: HYLO_SEEDS_URL,
    holosUrl: HOLOS_REGEN_CIVICS_URL,
    publicUrl,
  };
}
