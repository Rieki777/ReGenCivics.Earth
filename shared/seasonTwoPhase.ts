/**
 * Where Season Two is, relative to now.
 *
 * /interop-sessions opens with a Season Two panel that tells people to bring a
 * video to Selection Day. The moment Selection Day passes, that copy is a lie
 * on a live page, and the page's real subject — the Interoperability Circle —
 * is sitting underneath an invitation to an event that already happened.
 *
 * This is a pure function of the clock rather than a scheduled job, per
 * STEERING section 11: the whole behaviour is deterministic, so there is
 * nothing for an agent or a cron to decide. A cron that flips a flag can fail
 * silently and leave the stale copy up; a date comparison cannot fail at all,
 * needs no infrastructure, and gives the same answer on the server, in the
 * browser and in a test.
 */
import { wallTimeInZoneToUtc, SESSION_TIME_ZONE } from "./sessionClock";

/** Selection Day: the first Season Two session. */
export const SEASON_TWO_SELECTION_DAY = "2026-09-26";

/**
 * The page stops inviting people to Selection Day at midnight Pacific that
 * night, so the invitation stands for the whole of the day itself and is gone
 * when people look on Sunday.
 */
export const SEASON_TWO_INVITE_ENDS = "2026-09-27";

export type SeasonTwoPhase = "before" | "after";

/** Whether the Selection Day invitation is still worth showing. */
export function seasonTwoPhase(now: Date = new Date()): SeasonTwoPhase {
  const cutoff = wallTimeInZoneToUtc(SEASON_TWO_INVITE_ENDS, 0, 0, SESSION_TIME_ZONE);
  return now.getTime() < cutoff.getTime() ? "before" : "after";
}

/** The instant the invitation copy retires, for tests and for admin display. */
export function seasonTwoInviteCutoff(): Date {
  return wallTimeInZoneToUtc(SEASON_TWO_INVITE_ENDS, 0, 0, SESSION_TIME_ZONE);
}
