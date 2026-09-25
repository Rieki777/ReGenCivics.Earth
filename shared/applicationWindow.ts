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
 *
 * Rye, later the same day: closed is only half the story. Anyone can follow
 * the season live, and any project that is ready can join the community
 * crowdpooling round with the cohort, with room for far more than 13. So from
 * the September equinox to the March equinox (the Design Season's live
 * sessions, then the Resource Season's crowdpooling) the held copy leads with
 * that, and says to apply for the next season if this one doesn't work out.
 */

import { regenSeasonOn } from "./regenYear";

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
  /**
   * True while applications are held and a Season is live: its Design Season
   * sessions stream for anyone, then its Resource Season crowdpooling round is
   * open to every project that's ready.
   */
  followAlong: boolean;
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
  const reviewing = INTAKE_WINDOW.override ?? inWindow;
  const season = regenSeasonOn(now);
  return {
    reviewing,
    closedSeason,
    openSeason: closedSeason + 1,
    closesOn: `${MONTHS[INTAKE_WINDOW.closes.month - 1]} ${INTAKE_WINDOW.closes.day}`,
    followAlong: !reviewing && (season === "winter" || season === "spring"),
  };
}

/** How many projects each Season's incubator cohort takes. */
export const COHORT_SIZE = 13;

/** Where to follow along: the season calendar and the livestream, on /schedule. */
export const FOLLOW_ALONG_HREF = "/schedule#follow-along";
export const FOLLOW_ALONG_LABEL = "Follow along live";

/** The community crowdpooling round: any project that's ready, with the cohort. */
export const CROWDPOOL_ROUND_LINE = `If your project is ready, join the community crowdpooling round and run your campaign together with the cohort. There's room for far more than ${COHORT_SIZE} projects, and the more the better.`;

/** While a Season is live: follow it, and crowdpool with the cohort if you're ready. */
export const FOLLOW_ALONG_LINE = `Anyone can follow along live as the season unfolds. ${CROWDPOOL_ROUND_LINE}`;

/** What goes with it: the next season, and the no-email promise. */
export const NEXT_SEASON_LINE =
  "If you don't make it through this season, apply for the next one anytime. We'll hold your application, and you won't get emails about it until we get closer to the start of the next season.";

/** The promise while applications are held and no Season is live. */
export const APPLY_ANYTIME_LINE =
  "You can apply anytime for the next season. We'll hold your application, and you won't get emails about it until we get closer to the start of the next season.";

/** Every line the site shows about applying, for a given status. */
export function applicationCopy(s: IntakeStatus) {
  const closedLine = `Season ${s.closedSeason} applications are closed.`;
  const openLine = `Season ${s.openSeason} applications are open until ${s.closesOn}. We review them as they come in and email you as we go.`;
  /** What we say while applications are held, after the headline. */
  const held = s.followAlong ? `${FOLLOW_ALONG_LINE} ${NEXT_SEASON_LINE}` : APPLY_ANYTIME_LINE;
  return {
    closedLine,
    openLine,
    held,
    /** The headline everywhere. */
    headline: s.reviewing
      ? openLine
      : s.followAlong
        ? `Season ${s.closedSeason} applications are closed, and you can follow along live.`
        : closedLine,
    /** Headline plus the rest, for places with room for a few sentences. */
    status: s.reviewing ? openLine : `${closedLine} ${held}`,
    /** One clause with no end stop, for banners and meta descriptions. */
    short: s.reviewing
      ? `Season ${s.openSeason} applications are open until ${s.closesOn}`
      : s.followAlong
        ? `Season ${s.closedSeason} applications are closed; follow along live, and crowdpool with us if you're ready`
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
/** Just "Season 2 applications are closed.", for places that say the rest themselves. */
export const APPLICATIONS_CLOSED_LINE = COPY.closedLine;
/** What follows the headline while applications are held. */
export const APPLICATIONS_HELD = COPY.held;
/** Headline plus the rest. */
export const APPLICATIONS_STATUS = COPY.status;
/** One clause, no end stop: banners and meta descriptions. */
export const APPLICATIONS_SHORT = COPY.short;
/** The label for apply buttons. */
export const APPLY_BUTTON_LABEL = COPY.buttonLabel;
