/**
 * Funding tracks and their stages (funding engine plan v1.3, section 4.4).
 *
 * A funder row carries a `track` (what kind of money it is) and a `stage`
 * (where we are with it). Stages differ by track: a grant has an LOI and a
 * reporting period, an accelerator has an interview and a reapply date, an
 * investor has meetings and diligence. This map validates every stage write,
 * on the server and in the admin form, so a row can never hold a stage its
 * track does not have.
 *
 * `appStatus` on funding_pipeline stays the coarse funnel the existing stats
 * and filters read. It is derived from the stage here, so the two never
 * disagree.
 */

export const FUNDING_TRACKS = [
  "grant",
  "accelerator",
  "investor",
  "public_goods",
  "fiscal_sponsor",
  "credits",
  "network",
] as const;
export type FundingTrack = (typeof FUNDING_TRACKS)[number];

export const TRACK_LABELS: Record<FundingTrack, string> = {
  grant: "Grant",
  accelerator: "Accelerator",
  investor: "Investor",
  public_goods: "Public goods",
  fiscal_sponsor: "Fiscal sponsor",
  credits: "Credits",
  network: "Network",
};

/** Mirrors the appStatus enum on funding_pipeline (drizzle/0215). */
export type CoarseStatus =
  | "not_started"
  | "researching"
  | "preparing"
  | "cultivating"
  | "submitted"
  | "in_review"
  | "awarded"
  | "declined"
  | "parked";

type StageDef = { stage: string; label: string; status: CoarseStatus };

// The plan names stages for grants, accelerators, investors and public goods.
// Fiscal sponsors, credits and network rows share one short list until one of
// them needs more.
const SIMPLE: StageDef[] = [
  { stage: "identified", label: "Identified", status: "researching" },
  { stage: "qualified", label: "Qualified", status: "researching" },
  { stage: "applied", label: "Applied", status: "submitted" },
  { stage: "accepted", label: "Accepted", status: "awarded" },
  { stage: "declined", label: "Declined", status: "declined" },
];

export const STAGES_BY_TRACK: Record<FundingTrack, readonly StageDef[]> = {
  grant: [
    { stage: "identified", label: "Identified", status: "researching" },
    { stage: "qualified", label: "Qualified (eligible)", status: "researching" },
    { stage: "loi", label: "Letter of intent", status: "preparing" },
    { stage: "drafting", label: "Drafting", status: "preparing" },
    { stage: "internal_review", label: "Internal review", status: "preparing" },
    { stage: "submitted", label: "Submitted", status: "submitted" },
    { stage: "under_review", label: "Under review", status: "in_review" },
    { stage: "awarded", label: "Awarded", status: "awarded" },
    { stage: "declined", label: "Declined", status: "declined" },
    { stage: "reporting", label: "Reporting", status: "awarded" },
  ],
  accelerator: [
    { stage: "identified", label: "Identified", status: "researching" },
    { stage: "qualified", label: "Qualified", status: "researching" },
    { stage: "warm_path_sought", label: "Warm path sought", status: "cultivating" },
    { stage: "drafting", label: "Drafting", status: "preparing" },
    { stage: "submitted", label: "Submitted", status: "submitted" },
    { stage: "interview", label: "Interview", status: "in_review" },
    { stage: "accepted", label: "Accepted", status: "awarded" },
    { stage: "rejected", label: "Not accepted", status: "declined" },
  ],
  investor: [
    { stage: "researched", label: "Researched", status: "researching" },
    { stage: "qualified", label: "Qualified", status: "researching" },
    { stage: "intro_requested", label: "Intro requested", status: "cultivating" },
    { stage: "contacted", label: "Contacted", status: "cultivating" },
    { stage: "first_meeting", label: "First meeting", status: "cultivating" },
    { stage: "follow_up", label: "Follow-up", status: "cultivating" },
    { stage: "diligence", label: "Diligence", status: "in_review" },
    { stage: "committed", label: "Committed", status: "awarded" },
    { stage: "passed", label: "Passed", status: "declined" },
  ],
  public_goods: [
    { stage: "registered", label: "Registered", status: "preparing" },
    { stage: "round_open", label: "Round open", status: "preparing" },
    { stage: "applied", label: "Applied", status: "submitted" },
    { stage: "voting", label: "Voting", status: "in_review" },
    { stage: "funded", label: "Funded", status: "awarded" },
  ],
  fiscal_sponsor: SIMPLE,
  credits: SIMPLE,
  network: SIMPLE,
};

export function isFundingTrack(value: unknown): value is FundingTrack {
  return typeof value === "string" && (FUNDING_TRACKS as readonly string[]).includes(value);
}

export function stagesFor(track: FundingTrack): readonly StageDef[] {
  return STAGES_BY_TRACK[track];
}

export function isValidStage(track: FundingTrack, stage: string): boolean {
  return STAGES_BY_TRACK[track].some((s) => s.stage === stage);
}

/** The coarse appStatus a stage implies, or null when the stage is not on the track. */
export function coarseStatusFor(track: FundingTrack, stage: string): CoarseStatus | null {
  return STAGES_BY_TRACK[track].find((s) => s.stage === stage)?.status ?? null;
}

export function stageLabel(track: FundingTrack | null | undefined, stage: string | null | undefined): string {
  if (!stage) return "";
  if (!track) return stage;
  return STAGES_BY_TRACK[track].find((s) => s.stage === stage)?.label ?? stage;
}

/**
 * Check a proposed (track, stage) pair. A stage needs a track; a track change
 * that strands the current stage clears it, which the caller must say out loud
 * rather than keep a stage the new track does not have.
 */
export function validateStageWrite(
  track: FundingTrack | null | undefined,
  stage: string | null | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (stage === null || stage === undefined || stage === "") return { ok: true };
  if (!track) return { ok: false, reason: "Set a track before a stage: stages differ by track." };
  if (!isValidStage(track, stage)) {
    const allowed = STAGES_BY_TRACK[track].map((s) => s.stage).join(", ");
    return { ok: false, reason: `"${stage}" is not a ${TRACK_LABELS[track]} stage. Use one of: ${allowed}.` };
  }
  return { ok: true };
}
