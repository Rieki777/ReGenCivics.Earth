/**
 * Who may move a campaign between statuses. Pure, shared by server and client.
 *
 * Security: until 2026-09-24 campaigns.updateStatus let a campaign's owner
 * set ANY status, so a creator could publish past review or mark their own
 * campaign complete. Stewards now only send a draft for review and cancel;
 * publishing, completing and rejecting are admin moves. The server enforces
 * this through canTransition(); shared/campaignStatus.test.ts pins it.
 *
 * `funded` stays in the enum for old rows. No UI offers it: the admin button
 * says "Mark complete" and sets `completed`.
 */

export const CAMPAIGN_STATUSES = [
  "draft",
  "pending_review",
  "active",
  "funded",
  "completed",
  "cancelled",
  "rejected",
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
};

export const STEWARD_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["pending_review", "cancelled"],
  pending_review: ["cancelled"],
  active: ["cancelled"],
  rejected: [],
  funded: [],
  completed: [],
  cancelled: [],
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
