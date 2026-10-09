/**
 * Who may move a campaign between statuses. Pure, shared by server and client.
 *
 * Security: until 2026-09-24 campaigns.updateStatus let a campaign's owner
 * set ANY status, so a creator could publish past review or mark their own
 * campaign complete. Stewards now only send a draft (or a campaign sent
 * back) for review and cancel;
 * publishing, completing and rejecting are admin moves. The server enforces
 * this through canTransition(); shared/campaignStatus.test.ts pins it.
 *
 * `funded` stays in the enum for old rows. No UI offers it: the admin button
 * says "Mark complete" and sets `completed`.
 *
 * `closed` (0264, ruling 2026-09-27) means the close date passed and the
 * campaign didn't complete. Only the daily close job writes it
 * (server/lib/campaign-close.ts), with a conditional UPDATE and never
 * through campaigns.updateStatus, so no transition into or out of `closed`
 * is offered to anyone. The same job can move a live campaign to `completed`
 * at its close date when both halves have landed.
 *
 * Admins send a campaign back for changes by moving it from in review to
 * draft (the 'Send back for changes' button). `rejected` stays in the enum for
 * campaigns sent back before 2026-10-01; their stewards can send them for
 * review again.
 */

export const CAMPAIGN_STATUSES = [
  "draft",
  "pending_review",
  "active",
  "funded",
  "completed",
  "cancelled",
  "rejected",
  "closed",
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type CampaignActorRole = "admin" | "steward";

export const ADMIN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["pending_review", "cancelled"],
  pending_review: ["active", "rejected", "draft", "cancelled"],
  rejected: ["active", "pending_review", "draft", "cancelled"],
  active: ["completed", "funded", "cancelled"],
  funded: ["completed"],
  completed: [],
  cancelled: [],
  closed: [],
};

export const STEWARD_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["pending_review", "cancelled"],
  pending_review: ["cancelled"],
  active: ["cancelled"],
  rejected: ["pending_review"],
  funded: [],
  completed: [],
  cancelled: [],
  closed: [],
};

export function isCampaignStatus(s: unknown): s is CampaignStatus {
  return typeof s === "string" && (CAMPAIGN_STATUSES as readonly string[]).includes(s);
}

/** Whether `role` may move a campaign from `from` to `to`. The same status is never a transition. */
export function canTransition(from: string, to: string, role: CampaignActorRole): boolean {
  if (!isCampaignStatus(from) || !isCampaignStatus(to)) return false;
  const table = role === "admin" ? ADMIN_TRANSITIONS : STEWARD_TRANSITIONS;
  return table[from].includes(to);
}

/** The statuses `role` may cancel from (used by the cancel service's conditional UPDATE). */
export function cancellableFrom(role: CampaignActorRole): CampaignStatus[] {
  return CAMPAIGN_STATUSES.filter((s) => canTransition(s, "cancelled", role));
}
