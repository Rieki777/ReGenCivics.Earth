import type { ValuationBreakdownLike } from "./RewardAmount";

export interface OpenRole {
  id: number;
  role: string;
  amount: number;
  payStatus: string;
}

/** A row from bounties.listBoard (enriched in Part 2). */
export interface BoardBounty {
  id: number;
  sourceType: string;
  title: string;
  body: string;
  tokenType: string;
  tier: string | null;
  workStatus: string;
  roleSlug: string | null;
  recordingId: number | null;
  evidenceQuote: string | null;
  evidenceTs: number | null;
  createdAt: string;
  expiresAt: string | null;
  valuationBreakdown: ValuationBreakdownLike | null;
  recordingTitle: string | null;
  recordingVideoId: string | null;
  roleName: string | null;
  roleCircle: string | null;
  roleColor: string | null;
  openRoles: OpenRole[];
}

export const TIER_EFFORT: Record<string, string> = {
  trivial: "a quick favor",
  small: "one clear deliverable",
  medium: "a real piece of work",
  large: "a substantial build",
};

/** "opened 2 days ago" / "opened today" from an ISO date. */
export function freshness(iso: string | null): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "opened today";
  if (days === 1) return "opened yesterday";
  return `opened ${days} days ago`;
}

/** "closes in N days" from an ISO expiry, or null when there's no expiry. */
export function closesIn(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "closed";
  if (days === 0) return "closes today";
  if (days === 1) return "closes tomorrow";
  return `closes in ${days} days`;
}

/** A deep link back to the source moment, when we have the video + timestamp. */
export function provenanceLink(videoId: string | null, ts: number | null): string | null {
  if (!videoId) return null;
  return `https://youtu.be/${videoId}${ts ? `?t=${Math.max(0, Math.floor(ts))}` : ""}`;
}
