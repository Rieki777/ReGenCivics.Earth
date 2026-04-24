/**
 * Prefill: pulls player context out of MySQL and packages it into the field
 * names Hypha's create-proposal forms expect.
 *
 * Future Claude instances: when Hypha adds a new field or renames one, only
 * this file needs to change. The rest of the bridge stays stable.
 */
import { getDb } from "../../db";
import { users, userTokenLedger, playerProfiles } from "../../../drizzle/schema";
import { eq, and, isNull, sum, sql } from "drizzle-orm";
import type { HyphaBridgePayload } from "./types";

export interface PlayerContext {
  userId: number;
  displayName: string | null;
  baseWallet: `0x${string}` | null;
  rcVoiceWeight: number;
  rgVoiceWeight: number;
  bioregions: string[];
  /** Total unclaimed private-ledger balance across all four tokens. */
  internalTokenBalance: number;
  /** Per-token breakdown of unclaimed balances. Hypha claims Game pair
   * (rgvoice + regen) and Fund pair (rcvoice + rcivics) together, so
   * the bridge needs each token's number separately. */
  privateByToken: { rgvoice: number; regen: number; rcvoice: number; rcivics: number };
  citizenshipTier: string | null;
}

export async function buildPlayerContext(userId: number): Promise<PlayerContext | null> {
  const db = await getDb();
  if (!db) return null;

  const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRow) return null;

  const profileRows = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
  const profile = profileRows[0] ?? null;

  // Private ledger: sum of unclaimed entries per tokenType. Replaces the
  // old governanceTokenLedger read (2026-04-24 supersede).
  const balanceRows = await db
    .select({ tokenType: userTokenLedger.tokenType, total: sum(userTokenLedger.amount) })
    .from(userTokenLedger)
    .where(and(eq(userTokenLedger.userId, userId), isNull(userTokenLedger.claimedAt)))
    .groupBy(userTokenLedger.tokenType);
  const privateByToken = { rgvoice: 0, regen: 0, rcvoice: 0, rcivics: 0 };
  for (const r of balanceRows as any[]) {
    if (r.tokenType in privateByToken) privateByToken[r.tokenType as keyof typeof privateByToken] = Number(r.total);
  }
  const internalTokenBalance =
    privateByToken.rgvoice + privateByToken.regen + privateByToken.rcvoice + privateByToken.rcivics;

  let bioregions: string[] = [];
  try {
    const raw = (userRow as any).bioregions;
    if (raw) bioregions = typeof raw === "string" ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
  } catch { /* ignore */ }

  const baseWallet = ((userRow as any).baseWalletAddress ?? null) as `0x${string}` | null;

  return {
    userId: userRow.id,
    displayName: profile?.displayName ?? userRow.name ?? null,
    baseWallet,
    rcVoiceWeight: (userRow as any).rcVoiceWeight ?? 1,
    rgVoiceWeight: (userRow as any).rgVoiceWeight ?? 1,
    bioregions,
    internalTokenBalance,
    privateByToken,
    citizenshipTier: (profile as any)?.citizenshipTier ?? null,
  };
}

/** Title prefix marker so the on-chain ProposalCreated event can be matched
 * back to a bridge row. The marker is 12 chars and survives as the proposal
 * title once it lands on Hypha. */
export function buildTitleWithMarker(bridgeKey: string, title: string): string {
  return `[rc:${bridgeKey}] ${title}`;
}

/** Strip the title marker for display contexts where it would be noise. */
export function stripTitleMarker(title: string): string {
  return title.replace(/^\[rc:[a-z0-9]{6,12}\]\s*/i, "");
}

/** Convert a payload into the URL searchParams shape that the upstream
 * Hypha PR (Path A) is expected to read. Until that PR lands, this is also
 * the canonical "minimal payload" we copy to clipboard for the manual paste
 * fallback (Path C). */
export function payloadToSearchParams(payload: HyphaBridgePayload, bridgeKey: string): URLSearchParams {
  const params = new URLSearchParams();
  params.set("bridgeKey", bridgeKey);
  params.set("title", buildTitleWithMarker(bridgeKey, payload.title));
  params.set("description", payload.description);
  if (payload.recipient) params.set("recipient", payload.recipient);
  if (payload.leadImageUrl) params.set("leadImage", payload.leadImageUrl);
  if (payload.payouts && payload.payouts.length > 0) {
    params.set("payouts", JSON.stringify(payload.payouts));
  }
  if (payload.attachments && payload.attachments.length > 0) {
    params.set("attachments", JSON.stringify(payload.attachments));
  }
  return params;
}
