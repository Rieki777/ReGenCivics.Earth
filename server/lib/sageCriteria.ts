/**
 * Pure Sage criterion (QUEST_PAGE_AND_PATH_PROGRESSION_SPEC §3.4 + open Q#5).
 *
 * Written bar (do not substitute a simpler interim rule):
 *   1. Steward on at least one path, AND
 *   2. Daily contribution percentile in the top 20% (percentile >= 80)
 *      for >= 80% of season days that have snapshots for this user.
 *
 * No snapshots = unmet.
 */

/** Minimum percentile that counts as "top 20%". */
export const SAGE_TOP_PERCENTILE = 80;

/** Fraction of snapshot days that must meet the top-20% bar. */
export const SAGE_MIN_TOP_DAY_RATIO = 0.8;

export type SageSnapshotRow = {
  /** 0–100. Values >= SAGE_TOP_PERCENTILE count as top 20%. */
  percentile: number;
};

export type SageEvidence = {
  hasStewardOnAnyPath: boolean;
  snapshotDayCount: number;
  top20DayCount: number;
  top20Ratio: number | null;
};

export type SageResult = {
  met: boolean;
  note: string;
  evidence: SageEvidence;
};

export function evaluateSage(args: {
  hasStewardOnAnyPath: boolean;
  snapshots: readonly SageSnapshotRow[];
}): SageResult {
  const { hasStewardOnAnyPath, snapshots } = args;
  const snapshotDayCount = snapshots.length;

  if (!hasStewardOnAnyPath) {
    return {
      met: false,
      note: "Sage requires Steward on at least one path",
      evidence: {
        hasStewardOnAnyPath: false,
        snapshotDayCount,
        top20DayCount: 0,
        top20Ratio: null,
      },
    };
  }

  if (snapshotDayCount === 0) {
    return {
      met: false,
      note: "No daily contribution snapshots for the current season",
      evidence: {
        hasStewardOnAnyPath: true,
        snapshotDayCount: 0,
        top20DayCount: 0,
        top20Ratio: null,
      },
    };
  }

  const top20DayCount = snapshots.filter(
    (s) => Number(s.percentile) >= SAGE_TOP_PERCENTILE,
  ).length;
  const top20Ratio = top20DayCount / snapshotDayCount;
  const met = top20Ratio >= SAGE_MIN_TOP_DAY_RATIO;

  return {
    met,
    note: met
      ? `Top-20% on ${top20DayCount}/${snapshotDayCount} snapshot days (${(top20Ratio * 100).toFixed(1)}%)`
      : `Top-20% on ${top20DayCount}/${snapshotDayCount} snapshot days; need ${(SAGE_MIN_TOP_DAY_RATIO * 100).toFixed(0)}%`,
    evidence: {
      hasStewardOnAnyPath: true,
      snapshotDayCount,
      top20DayCount,
      top20Ratio,
    },
  };
}
