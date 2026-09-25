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
 * The intake follows the wheel, so nobody has to remember to flip a switch.
 * Applications are always accepted. Review for the next Season runs in the
 * Rest Season, from the June solstice to about eleven days before Selection
 * Day at the September equinox (Season 2 closed September 11). The rest of the
 * year, applications are held quietly. The state rolls over by itself every
 * year. Because the timelines are loose this first turn, `override` can force
 * either state, and the window dates live here in one place.
 *
 * Applications are already stamped with the right Season at submit time
 * (shared/incubatorSeason.ts); this module is only what we tell people.
 * Module-level values are worked out when the module loads: fresh on every
 * page load in the browser, and at each server start (every deploy) on the
 * server.
 */

export const INTAKE_WINDOW = {
  /** Review opens with the Rest Season, the June solstice. */
  opens: { month: 6, day: 21 },
  /** And closes about eleven days before Selection Day. */
  closes: { month: 9, day: 10 },
  /**
   * null follows the dates above. Set true to open review early, or false to
   * keep applications held, when the year's timing shifts.
   */
  override: null as boolean | null,
};

export type IntakeStatus = {
  /** True while the next Season's applications are being reviewed. */
  reviewing: boolean;
  /** The last Season whose applications closed. */
  closedSeason: number;
  /** The Season new applications are for. */
  openSeason: number;
  /** When this year's review closes, for the open-state copy. */
  closesOn: string;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Where the intake stands at a moment. Pure, so tests can pass any date. */
export function intakeStatus(now: Date = new Date()): IntakeStatus {
  const y = now.getUTCFullYear();
  const t = now.getTime();
  const opens = Date.UTC(y, INTAKE_WINDOW.opens.month - 1, INTAKE_WINDOW.opens.day);
  // End of the closing day on the US west coast, where the sessions run.
  const closes = Date.UTC(y, INTAKE_WINDOW.closes.month - 1, INTAKE_WINDOW.closes.day + 1, 7);
  // This year's intake fills the Season that opens at this year's September
  // equinox: 2026 filled Season 2, 2027 fills Season 3.
  const thisYearsSeason = y - 2024;
  const closedSeason = t >= closes ? thisYearsSeason : thisYearsSeason - 1;
  const inWindow = t >= opens && t < closes;
  return {
    reviewing: INTAKE_WINDOW.override ?? inWindow,
    closedSeason,
    openSeason: closedSeason + 1,
    closesOn: `${MONTHS[INTAKE_WINDOW.closes.month - 1]} ${INTAKE_WINDOW.closes.day}`,
  };
}

/** The promise while applications are held. */
export const APPLY_ANYTIME_LINE =
  "You can apply anytime for the next season. We'll hold your application, and you won't get emails about it until we get closer to the start of the next season.";

/** Every line the site shows about applying, for a given status. */
export function applicationCopy(s: IntakeStatus) {
  const closedLine = `Season ${s.closedSeason} applications are closed.`;
  const openLine = `Season ${s.openSeason} applications are open until ${s.closesOn}. We review them as they come in and email you as we go.`;
  return {
    closedLine,
    openLine,
    /** The headline everywhere. */
    headline: s.reviewing ? openLine : closedLine,
    /** Headline plus the promise, for places with room for two sentences. */
    status: s.reviewing ? openLine : `${closedLine} ${APPLY_ANYTIME_LINE}`,
    /** One clause with no end stop, for banners and meta descriptions. */
    short: s.reviewing
      ? `Season ${s.openSeason} applications are open until ${s.closesOn}`
      : `Season ${s.closedSeason} applications are closed; apply anytime for the next season`,
    /** The label for apply buttons. */
    buttonLabel: s.reviewing ? `Apply for Season ${s.openSeason}` : "Apply for the next season",
  };
}

const NOW = intakeStatus();
const COPY = applicationCopy(NOW);

/** Where the intake stands right now (at module load). */
export const APPLICATIONS = NOW;
/** "Season 2 applications are closed." or, while reviewing, the open line. */
export const APPLICATIONS_HEADLINE = COPY.headline;
/** Headline plus promise. */
export const APPLICATIONS_STATUS = COPY.status;
/** One clause, no end stop: banners and meta descriptions. */
export const APPLICATIONS_SHORT = COPY.short;
/** The label for apply buttons. */
export const APPLY_BUTTON_LABEL = COPY.buttonLabel;
