/**
 * Where land project applications stand. One definition, read by every page,
 * email, and crawler block that talks about applying.
 *
 * Why this file exists. On 2026-09-24 the site said four different things at
 * once: /season2 counted down to a September 11 close that had passed, /apply
 * and /land said "Season 2 applications are open now for September 2026", the
 * applicant confirmation email promised a review within 1 to 2 weeks, and the
 * crawler prose told AI assistants applications were open. Rye's ruling that
 * day: Season 2 applications are closed; anyone can apply anytime for the next
 * season, and applicants won't get emails about it until we get closer to that
 * season's start.
 *
 * Applications are already stamped with the right Season at submit time
 * (shared/incubatorSeason.ts), so this module is copy and one switch.
 */

export const APPLICATIONS = {
  /** The Season whose intake has closed. */
  closedSeason: 2,
  /** The day it closed. */
  closedOn: "September 11, 2026",
  /** The Season new applications are held for. */
  nextSeason: 3,
  /**
   * False while applications are held quietly between intakes. Flip it to true
   * when review for the next Season starts, and every surface goes back to
   * saying applications are being reviewed.
   */
  reviewing: false,
} as const;

/** One line: the headline everywhere. */
export const APPLICATIONS_CLOSED_LINE = `Season ${APPLICATIONS.closedSeason} applications are closed.`;

/** The promise that goes with it. Used on pages, in the email, and for crawlers. */
export const APPLY_ANYTIME_LINE =
  "You can apply anytime for the next season. We'll hold your application, and you won't get emails about it until we get closer to the start of the next season.";

/** Both together, for places with room for a single sentence pair. */
export const APPLICATIONS_STATUS = `${APPLICATIONS_CLOSED_LINE} ${APPLY_ANYTIME_LINE}`;

/** The label for apply buttons while applications are held. */
export const APPLY_BUTTON_LABEL = "Apply for the next season";
