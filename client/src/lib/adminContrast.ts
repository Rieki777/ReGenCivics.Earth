/**
 * Admin contrast helpers.
 *
 * The public site is locked to `.dark`. Admin is a light-theme island, so
 * chips and labels must carry their own colors. Do not use Badge `default`
 * (it injects `text-primary-foreground`) or `text-foreground` on a forced
 * forest/cream chip. Those two utilities fight and the loser is the one
 * you can no longer read.
 */

export const ADMIN_SEASON_CHIP =
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-[#1a472a] text-[#f8f5f0]";

/** Inputs sitting on an explicit dark forest well (`bg-[#0d2818]`, etc.). */
export const ADMIN_DARK_FIELD =
  "bg-white/10 border-white/25 text-white placeholder:text-white/70";

/** Inputs sitting on cream/white admin cards. */
export const ADMIN_LIGHT_FIELD =
  "bg-white text-[#1a472a] placeholder:text-[#1a472a]/75 border-[#1a472a]/20";

/** Secondary copy on cream. `/75` reads as disabled; keep this as the floor. */
export const ADMIN_SECONDARY_TEXT = "text-[#1a472a]/85";

const STATUS_CHIPS: Record<string, string> = {
  approved: "bg-[#1a472a] text-[#f8f5f0]",
  rejected: "bg-[#8b1e1e] text-[#f8f5f0]",
  under_review: "bg-[#1a3a5c] text-[#f8f5f0]",
  submitted: "bg-[#5c4a12] text-[#f8f5f0]",
  changes_requested: "bg-[#6b3f12] text-[#f8f5f0]",
  request_changes: "bg-[#6b3f12] text-[#f8f5f0]",
  draft: "bg-[#3d4a3d] text-[#f8f5f0]",
  pending: "bg-[#5c4a12] text-[#f8f5f0]",
  new: "bg-[#5c4a12] text-[#f8f5f0]",
  contacted: "bg-[#1a3a5c] text-[#f8f5f0]",
  in_discussion: "bg-[#3d2a5c] text-[#f8f5f0]",
  in_progress: "bg-[#3d2a5c] text-[#f8f5f0]",
  reviewing: "bg-[#5c4a12] text-[#f8f5f0]",
  committed: "bg-[#1a472a] text-[#f8f5f0]",
  declined: "bg-[#8b1e1e] text-[#f8f5f0]",
  completed: "bg-[#1a472a] text-[#f8f5f0]",
};

export function adminStatusChipClass(status: string | null | undefined): string {
  const key = (status ?? "").replace(/\s+/g, "_").toLowerCase();
  return STATUS_CHIPS[key] ?? "bg-[#3d4a3d] text-[#f8f5f0]";
}

export function formatClaimant(claim: {
  claimantName?: string | null;
  claimantEmail?: string | null;
  userId: number;
}): { primary: string; secondary: string } {
  const name = claim.claimantName?.trim() || "";
  const email = claim.claimantEmail?.trim() || "";
  if (name && email) return { primary: name, secondary: email };
  if (name) return { primary: name, secondary: `User #${claim.userId}` };
  if (email) return { primary: email, secondary: `User #${claim.userId}` };
  return { primary: `User #${claim.userId}`, secondary: "No name or email on this account" };
}
