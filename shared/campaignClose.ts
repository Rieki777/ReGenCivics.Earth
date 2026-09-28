/**
 * The close date, nudges and the final stretch: the rules, pure. Shared by
 * the daily crowdpool job (server/jobs/crowdpoolDailyJob.ts), the close
 * service (server/lib/campaign-close.ts) and the tests. No database here:
 * the job reads rows and asks these functions what is due, so each date and
 * each threshold has one definition.
 *
 * Rye's rulings of 2026-09-27:
 *   - The close date is binding. At startedAt (or publishedAt) plus
 *     durationDays, a real live campaign whose two halves have both landed
 *     moves to `completed` on its own; any other moves to `closed` ("didn't
 *     complete"). Examples never close.
 *   - If a campaign doesn't complete (research question 1): offers still
 *     waiting close with thanks, accepted offers that haven't started are
 *     released with a thank-you and other open needs, lent things go home on
 *     the agreed date or sooner if the lender asks, and help already given
 *     stays recorded in the project's token.
 *   - Stewards are nudged when an offer has waited 2 days ("to keep things
 *     active"), again at 7, then never again. A contributor with an account
 *     hears once at 14 days.
 *   - The nine-month cap (ruling 2026-09-04) holds for new campaigns: 273 days.
 */
import {
  campaignEndsAt,
  type CampaignProgress,
  type CampaignProgressSummary,
  type ProgressCampaign,
} from "./campaignProgress";
import { formatShortDay, toDay, todayUtc } from "./crowdpoolNeedAction";
import { CLOSE } from "./crowdpoolCopy";
import { decodeBasicEntities } from "./htmlText";

/** Nine months, the longest a campaign may run (ruling 2026-09-04). */
export const MAX_WINDOW_DAYS = 273;

/**
 * Steward nudges at 2 and 7 days of waiting, the contributor's note at 14,
 * and a look-back so a first run never reaches into old history.
 */
export const NUDGES = { stewardFirstDays: 2, stewardSecondDays: 7, contributorNoteDays: 14, lookbackDays: 30 } as const;

/**
 * The two-weeks-before-close follower notice: sent between 14 and 3 days
 * before the close date, only once the campaign has been live 7 days, naming
 * up to 3 open needs.
 */
export const FINAL_STRETCH = { daysBefore: 14, lastDaysBefore: 3, minLiveDays: 7, maxNeeds: 3 } as const;

const DAY_MS = 86_400_000;

function toDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function isExample(isDemo: ProgressCampaign["isDemo"]): boolean {
  const n = Number(isDemo);
  return Number.isFinite(n) && n !== 0;
}

/** Stamps are Date, string or null from the database: any value means sent. */
function stamped(v: unknown): boolean {
  return v != null && v !== "";
}

/** Whole milliseconds an offer has waited, or null when it has no valid submit time. */
function waitedMs(submittedAt: Date | string, now: Date): number | null {
  const at = toDate(submittedAt);
  return at ? now.getTime() - at.getTime() : null;
}

// ── The close ────────────────────────────────────────────────────────────────

/**
 * Due at campaignEndsAt(c) <= now, for a real live campaign not yet closed.
 * False for an example, any status other than `active`, a campaign already
 * carrying closedAt, and one that never went live (no start date).
 */
export function isDueToClose(c: ProgressCampaign & { id: number; closedAt?: Date | string | null }, now: Date): boolean {
  if (c.status !== "active") return false;
  if (isExample(c.isDemo)) return false;
  if (toDate(c.closedAt ?? null)) return false;
  const ends = campaignEndsAt(c);
  if (!ends) return false;
  return ends.getTime() <= now.getTime();
}

/**
 * 'complete' when the reading is both_landed and the campaign asked for
 * something (a need, or money). Everything else did not complete.
 */
export function closeOutcome(p: Pick<CampaignProgress | CampaignProgressSummary, "state" | "inKind" | "money">): "complete" | "did_not_complete" {
  const askedSomething = p.inKind.needsTotal > 0 || !p.money.asksNone;
  return p.state === "both_landed" && askedSomething ? "complete" : "did_not_complete";
}

/**
 * Whether an offer counts as started at a close (question Q3). Fulfilled and
 * thanked are started. An accepted offer is started when it is:
 *   - a lend whose available-from date is today or earlier, or has none (a
 *     legacy kind 'loan' need counts as a lend);
 *   - a shift whose start time is now or earlier;
 *   - a role (either capacity unit) whose start date is today or earlier, or
 *     has none.
 * Anything else accepted (a gift of a thing, a knowledge session, a freeform
 * offer) has not started, and every other status returns false. The rule
 * errs toward keeping a place, since a release cannot be undone and stewards
 * can still release by hand.
 */
export function offerHasStarted(
  o: { status: string; offerMode: "give" | "lend" | null; availableFrom: string | null },
  need: { kind: string; shiftStartsAt: Date | string | null; neededFrom: string | null } | null,
  today: string,
  now: Date,
): boolean {
  if (o.status === "fulfilled" || o.status === "thanked") return true;
  if (o.status !== "accepted") return false;
  if (o.offerMode === "lend" || need?.kind === "loan") {
    const from = toDay(o.availableFrom);
    return from == null || from <= today;
  }
  if (!need) return false;
  if (need.kind === "shift") {
    const starts = toDate(need.shiftStartsAt);
    return starts != null && starts.getTime() <= now.getTime();
  }
  if (need.kind === "role") {
    const from = toDay(need.neededFrom);
    return from == null || from <= today;
  }
  return false;
}

// ── Nudges ───────────────────────────────────────────────────────────────────

/**
 * Which steward nudge is due for a waiting offer: 2 when it is 7 or more days
 * old and step 2 is unsent; 1 when it is 2 or more days old and step 1 is
 * unsent; else null. Never after step 2, and never past the look-back (the
 * job's query holds the same 30 days). An offer first found at day 8 gets
 * step 2 only; the job stamps both, so it hears once.
 */
export function nudgeStepDue(o: { submittedAt: Date | string; nudge1At: unknown; nudge2At: unknown }, now: Date): 1 | 2 | null {
  const waited = waitedMs(o.submittedAt, now);
  if (waited == null || waited > NUDGES.lookbackDays * DAY_MS) return null;
  if (stamped(o.nudge2At)) return null;
  if (waited >= NUDGES.stewardSecondDays * DAY_MS) return 2;
  if (!stamped(o.nudge1At) && waited >= NUDGES.stewardFirstDays * DAY_MS) return 1;
  return null;
}

/**
 * The contributor's "still waiting" note: once, at 14 days, only to someone
 * with an account (people without one get no new send), within the look-back.
 */
export function stillWaitingDue(o: { submittedAt: Date | string; userId: number | null; waitNoteAt: unknown }, now: Date): boolean {
  if (o.userId == null) return false;
  if (stamped(o.waitNoteAt)) return false;
  const waited = waitedMs(o.submittedAt, now);
  if (waited == null || waited > NUDGES.lookbackDays * DAY_MS) return false;
  return waited >= NUDGES.contributorNoteDays * DAY_MS;
}

// ── The final stretch ────────────────────────────────────────────────────────

/**
 * The two-weeks-before-close follower notice: a real live campaign, not yet
 * noticed, between 14 and 3 days before its close date, live at least 7
 * days, with at least one need still open. When every need is filled nothing
 * is due, so a need that opens again inside the window is still announced.
 */
export function finalStretchDue(
  c: ProgressCampaign & { finalStretchNoticedAt?: unknown },
  openCount: number,
  now: Date,
): boolean {
  if (c.status !== "active" || isExample(c.isDemo)) return false;
  if (stamped(c.finalStretchNoticedAt)) return false;
  if (!(openCount > 0)) return false;
  const ends = campaignEndsAt(c);
  const start = toDate(c.startedAt) ?? toDate(c.publishedAt ?? null);
  if (!ends || !start) return false;
  const t = now.getTime();
  if (t - start.getTime() < FINAL_STRETCH.minLiveDays * DAY_MS) return false;
  return t >= ends.getTime() - FINAL_STRETCH.daysBefore * DAY_MS && t <= ends.getTime() - FINAL_STRETCH.lastDaysBefore * DAY_MS;
}

// ── What each person hears at a close ────────────────────────────────────────

/** One of a person's rows on a campaign, as it stands after the close. */
export type CloseRow = {
  status: string;
  title: string;
  offerMode: "give" | "lend" | null;
  lendUntil: string | Date | null;
  /** Set when the close released this accepted offer (not a steward's earlier release). */
  closeReleasedAt?: unknown;
};

/** At most this many rows get their own line; the rest get one "And N more" line. */
export const CLOSE_LINES_MAX_ROWS = 4;

type Ranked = { rank: number; line: string };

function lineFor(row: CloseRow, project: string, today: string): Ranked | null {
  const title = decodeBasicEntities(String(row.title ?? "").trim());
  switch (row.status) {
    case "released":
      return stamped(row.closeReleasedAt) ? { rank: 0, line: CLOSE.lines.releasedAtClose(title) } : null;
    case "cancelled":
      // On a closed or completed campaign, a cancelled row is a waiting offer the close closed.
      return { rank: 1, line: CLOSE.lines.waitingClosed(title) };
    case "accepted": {
      if (row.offerMode === "lend") {
        const until = formatShortDay(row.lendUntil, today);
        return { rank: 2, line: until ? CLOSE.lines.lendHome(title, until) : CLOSE.lines.lendHomeNoDate(title) };
      }
      return { rank: 3, line: CLOSE.lines.placeStays(title) };
    }
    case "fulfilled":
    case "thanked":
      return { rank: 4, line: CLOSE.lines.givenRecorded(title, project) };
    default:
      // Rejected, withdrawn, expired and a steward's earlier release get no line.
      return null;
  }
}

/**
 * The per-person lines for a close notice or email, in this order: released
 * at close, waiting and closed at close, accepted lends still on site,
 * accepted places that had started, then what was given. One line per row,
 * at most four, then "And N more offers are on your contributions page."
 * Dates read like "30 Nov", with the year when it isn't this year. Titles
 * and the project name come back as plain text (entities decoded).
 */
export function closeLinesFor(rows: CloseRow[], project: string, today: string = todayUtc()): string[] {
  const name = decodeBasicEntities(String(project ?? "").trim());
  const ranked = rows
    .map((row, i) => ({ i, r: lineFor(row, name, today) }))
    .filter((x): x is { i: number; r: Ranked } => x.r != null)
    .sort((a, b) => a.r.rank - b.r.rank || a.i - b.i);
  const lines = ranked.slice(0, CLOSE_LINES_MAX_ROWS).map((x) => x.r.line);
  const rest = ranked.length - CLOSE_LINES_MAX_ROWS;
  if (rest > 0) lines.push(CLOSE.lines.more(rest));
  return lines;
}

/**
 * The other-needs line at the end of a close notice: up to two other open
 * needs, or, when there are none, an invitation to follow the project.
 */
export function otherNeedsLine(
  needs: Array<{ verb: string; title: string; projectName: string }>,
  project: string,
  limit = 2,
): string {
  const list = needs.slice(0, limit).map((n) => ({
    verb: n.verb,
    title: decodeBasicEntities(String(n.title ?? "").trim()),
    projectName: decodeBasicEntities(String(n.projectName ?? "").trim()),
  }));
  return list.length > 0 ? CLOSE.otherNeeds(list) : CLOSE.followInstead(decodeBasicEntities(String(project ?? "").trim()));
}
