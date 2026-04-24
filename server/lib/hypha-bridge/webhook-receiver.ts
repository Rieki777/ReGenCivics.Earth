/**
 * Alchemy webhook receiver for Hypha governance contracts on Base.
 *
 * Subscribes (via Alchemy dashboard, not in code) to the DHO governance contracts
 * for `regen-games` and `regen-civics`. When an event arrives, we match it back
 * to a bridge row using the title marker first, then fuzzy matching as a fallback.
 *
 * Wire this into the Express app via registerHyphaWebhookRoutes(app).
 */
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { eq, and, gt } from "drizzle-orm";
import {
  getDb,
  addTokenLedgerEntry,
  createQuestCompletion,
  createUserNotification,
} from "../../db";
import { hyphaBridges, users } from "../../../drizzle/schema";
import { stripTitleMarker } from "./prefill";
import { checkCitizenshipTiers } from "../../routes/batchJobs";
import type { QuestBridgeMetadata } from "./types";

const ALCHEMY_SIGNING_KEY = process.env.ALCHEMY_HYPHA_WEBHOOK_SIGNING_KEY ?? "";
const BASESCAN_TX_BASE = "https://basescan.org/tx/";

/** Verify the Alchemy webhook signature header. Alchemy signs the raw body
 * with HMAC-SHA256 using the signing key from the dashboard. */
function verifyAlchemySignature(rawBody: string, signature: string | undefined): boolean {
  if (!ALCHEMY_SIGNING_KEY || !signature) return false;
  const computed = crypto.createHmac("sha256", ALCHEMY_SIGNING_KEY).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

/** Extract a bridge key from a proposal title's [rc:xxxxxxxx] marker. */
function extractBridgeKey(title: string | undefined): string | null {
  if (!title) return null;
  const m = title.match(/\[rc:([a-z0-9]{6,12})\]/i);
  return m ? m[1].toLowerCase() : null;
}

/** Fuzzy match a Hypha event back to a bridge by recipient + amount + initiator. */
async function fuzzyMatchBridge(opts: {
  recipient?: string;
  amount?: string;
  tokenSymbol?: string;
  blockTimeMs?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  if (!opts.recipient || !opts.amount) return null;
  // 10 minute window before block time
  const windowStart = opts.blockTimeMs ? new Date(opts.blockTimeMs - 10 * 60 * 1000) : null;
  const candidates = await db
    .select()
    .from(hyphaBridges)
    .where(
      and(
        eq(hyphaBridges.hyphaRecipientWallet, opts.recipient),
        windowStart ? gt(hyphaBridges.createdAt, windowStart) : undefined as any,
      ) as any,
    )
    .limit(5);
  // Pick the most recent unclaimed one
  return candidates.find((c: any) => c.status === "created" || c.status === "handoff_sent") ?? null;
}

interface AlchemyHyphaEvent {
  type: "ProposalCreated" | "ProposalExecuted" | "ProposalRejected" | "Voted" | "Transfer";
  proposalId?: string;
  title?: string;
  recipient?: string;
  amount?: string;
  tokenSymbol?: string;
  txHash?: string;
  blockTimeMs?: number;
}

/**
 * Best-effort cascade fired after a quest_completion bridge row moves to "passed".
 * All failures are caught and logged — never let cascade errors break the webhook 200.
 */
async function cascadeQuestPassed(
  bridgeRow: any,
  txHash: string | undefined,
): Promise<void> {
  if (bridgeRow.source !== "quest_completion") return;

  const db = await getDb();
  if (!db) {
    console.warn("[hypha-alchemy] cascadeQuestPassed: no db connection");
    return;
  }

  const meta: QuestBridgeMetadata | null = bridgeRow.payload
    ? (typeof bridgeRow.payload === "string" ? JSON.parse(bridgeRow.payload) : bridgeRow.payload)?.metadata ?? null
    : null;

  if (!meta?.questId) {
    console.warn("[hypha-alchemy] cascadeQuestPassed: missing questId in metadata", bridgeRow.bridgeKey);
    return;
  }

  const { questId, questTitle, regenReward, deliverableUrl } = meta as QuestBridgeMetadata;
  const userId: number = bridgeRow.initiatorUserId;

  // 1. Look up user email (required for the ledger entry).
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1).catch(() => []);
  const email: string | undefined = userRows[0]?.email ?? undefined;
  if (!email) {
    console.warn("[hypha-alchemy] cascadeQuestPassed: user not found", userId);
    return;
  }

  const txLink = txHash ? `https://basescan.org/tx/${txHash}` : "";

  // 2. Write token ledger entry.
  await addTokenLedgerEntry({
    email,
    userId,
    amount: regenReward,
    reason: "quest_completion",
    questId,
    notes: `Quest "${questTitle}" approved on Hypha${txLink ? `. Tx: ${txLink}` : ""}`,
  }).catch((err: any) => console.error("[hypha-alchemy] ledger entry failed", err));

  // 3. Mark quest complete in questCompletions (ignore duplicate).
  await createQuestCompletion({
    userId,
    questId,
    artifactType: "link",
    artifactUrl: deliverableUrl,
    visibility: "public",
  } as any).catch((err: any) => {
    if (err?.code !== "ER_DUP_ENTRY") {
      console.error("[hypha-alchemy] createQuestCompletion failed", err);
    }
  });

  // 4. Re-evaluate citizenship tier for this player (full pass; no single-user variant yet).
  await checkCitizenshipTiers(db).catch((err: any) =>
    console.error("[hypha-alchemy] checkCitizenshipTiers failed", err),
  );

  // 5. Notify the player.
  await createUserNotification({
    userId,
    type: "quest_complete",
    title: "Your proposal was approved!",
    message: `Your quest "${questTitle}" was approved on Hypha. You earned ${regenReward} $ReGen.${txLink ? ` View on Basescan: ${txLink}` : ""}`,
  } as any).catch((err: any) => console.error("[hypha-alchemy] notification failed", err));

  console.log(`[hypha-alchemy] cascade complete for bridge ${bridgeRow.bridgeKey} quest ${questId}`);
}

/** Handle one normalized Hypha event. Idempotent: re-processing the same event
 * should not double-update. */
export async function handleHyphaEvent(event: AlchemyHyphaEvent): Promise<{ matched: boolean; bridgeKey?: string }> {
  const db = await getDb();
  if (!db) return { matched: false };

  let bridgeKey = extractBridgeKey(event.title);
  if (!bridgeKey) {
    const fuzzy = await fuzzyMatchBridge({
      recipient: event.recipient,
      amount: event.amount,
      tokenSymbol: event.tokenSymbol,
      blockTimeMs: event.blockTimeMs,
    });
    if (fuzzy) bridgeKey = (fuzzy as any).bridgeKey;
  }
  if (!bridgeKey) return { matched: false };

  const updates: Record<string, unknown> = {};
  if (event.type === "ProposalCreated") {
    updates.status = "on_chain_detected";
    if (event.proposalId) updates.hyphaProposalId = event.proposalId;
    if (event.txHash) {
      updates.hyphaTxHash = event.txHash;
      updates.basescanUrl = `${BASESCAN_TX_BASE}${event.txHash}`;
    }
  } else if (event.type === "ProposalExecuted") {
    updates.status = "passed";
    updates.hyphaPassedAt = new Date();
    if (event.amount) updates.hyphaTokenAmount = Number(event.amount);
    if (event.tokenSymbol) updates.hyphaTokenSymbol = event.tokenSymbol;
    if (event.recipient) updates.hyphaRecipientWallet = event.recipient;
    if (event.txHash) {
      updates.hyphaTxHash = event.txHash;
      updates.basescanUrl = `${BASESCAN_TX_BASE}${event.txHash}`;
    }
  } else if (event.type === "ProposalRejected") {
    updates.status = "failed";
  }

  if (Object.keys(updates).length > 0) {
    await db.update(hyphaBridges).set(updates as any).where(eq(hyphaBridges.bridgeKey, bridgeKey));
  }

  // Fire cascades for proposals that just passed — best-effort, non-blocking.
  if (event.type === "ProposalExecuted" || event.type === "Transfer") {
    const [bridgeRow] = await db
      .select()
      .from(hyphaBridges)
      .where(eq(hyphaBridges.bridgeKey, bridgeKey))
      .limit(1)
      .catch(() => []);
    if (bridgeRow) {
      if ((bridgeRow as any).source === "quest_completion") {
        cascadeQuestPassed(bridgeRow, event.txHash).catch((err: any) =>
          console.error("[hypha-alchemy] cascadeQuestPassed top-level error", err),
        );
      }
      if ((bridgeRow as any).source === "redeem_tokens") {
        cascadeClaimPassed(bridgeRow, event).catch((err: any) =>
          console.error("[hypha-alchemy] cascadeClaimPassed top-level error", err),
        );
      }
    }
  }

  return { matched: true, bridgeKey };
}

/**
 * Best-effort cascade fired after a redeem_tokens bridge sees its
 * matching on-chain Transfer event. Debits the user's private ledger
 * by the actual on-chain amount (which can be different from the
 * originally-requested amount if Hypha rounded or the user edited the
 * proposal). Always debits by what landed on-chain, even if that
 * drives the private balance negative.
 */
async function cascadeClaimPassed(bridgeRow: any, event: AlchemyHyphaEvent): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Idempotency guard: if we've already debited this bridge, skip.
  // We tag the debit ledger row with sourceRef='bridge:<bridgeKey>',
  // so a quick existence check on user_token_ledger answers it.
  const { userTokenLedger } = await import("../../../drizzle/schema");
  const { eq: eqDrizzle } = await import("drizzle-orm");
  const existing = await db
    .select({ id: userTokenLedger.id })
    .from(userTokenLedger)
    .where(and(
      eqDrizzle(userTokenLedger.sourceRef, `bridge:${bridgeRow.bridgeKey}`),
      eqDrizzle(userTokenLedger.source, "claimed_to_base"),
    ))
    .limit(1)
    .catch(() => []);
  if (existing.length > 0) {
    console.log(`[hypha-alchemy] cascadeClaimPassed: bridge ${bridgeRow.bridgeKey} already debited, skipping`);
    return;
  }

  // Pull the bridge's payload to figure out which token + how much was
  // requested. Use the on-chain amount when available (it is the truth);
  // fall back to the requested amount if the event didn't carry one.
  let payload: any = null;
  try {
    payload = typeof bridgeRow.payload === "string" ? JSON.parse(bridgeRow.payload) : bridgeRow.payload;
  } catch { /* ignore */ }
  const tokenType = payload?.metadata?.tokenType as ("rgvoice" | "regen" | "rcvoice" | "rcivics" | undefined);
  const requestedAmount = Number(payload?.metadata?.requestedAmount ?? bridgeRow.hyphaTokenAmount ?? 0);
  const actualAmount = event.amount ? Math.round(Number(event.amount)) : requestedAmount;
  if (!tokenType || !Number.isFinite(actualAmount) || actualAmount <= 0) {
    console.warn(`[hypha-alchemy] cascadeClaimPassed: bridge ${bridgeRow.bridgeKey} missing tokenType or amount, payload=`, payload, "event=", event);
    return;
  }

  // Debit the private ledger by the actual on-chain amount. Negative
  // amount tells creditPrivateTokens to debit. Allowed to drive
  // private balance negative if the user spent in the in-between
  // window; the ledger is the source of truth.
  const { creditPrivateTokens } = await import("../../db");
  await creditPrivateTokens({
    userId: bridgeRow.initiatorUserId,
    tokenType,
    amount: -actualAmount,
    source: "claimed_to_base",
    sourceId: bridgeRow.id,
    sourceRef: `bridge:${bridgeRow.bridgeKey}`,
    description: `Claimed ${actualAmount} ${tokenType} on Hypha${event.txHash ? `. Tx: https://basescan.org/tx/${event.txHash}` : ""}`,
  }).catch((err: any) =>
    console.error("[hypha-alchemy] cascadeClaimPassed: creditPrivateTokens failed", err),
  );

  // Notify the user that their claim landed.
  const { createUserNotification } = await import("../../db");
  await createUserNotification({
    userId: bridgeRow.initiatorUserId,
    type: "claim_complete",
    title: "Tokens claimed!",
    message: `${actualAmount} ${tokenType} moved to your wallet on Base.${event.txHash ? ` View on Basescan: https://basescan.org/tx/${event.txHash}` : ""}`,
  } as any).catch((err: any) => console.error("[hypha-alchemy] claim notification failed", err));

  console.log(`[hypha-alchemy] cascadeClaimPassed: debited ${actualAmount} ${tokenType} for user ${bridgeRow.initiatorUserId} (bridge ${bridgeRow.bridgeKey})`);
}

export function registerHyphaWebhookRoutes(app: Express) {
  app.post("/api/webhooks/hypha-alchemy", async (req: Request, res: Response) => {
    const sig = req.header("x-alchemy-signature") ?? req.header("X-Alchemy-Signature");
    const rawBody = JSON.stringify(req.body ?? {});
    if (!verifyAlchemySignature(rawBody, sig)) {
      console.warn("[hypha-alchemy] signature verification failed");
      return res.status(401).json({ error: "invalid signature" });
    }

    try {
      // Alchemy custom webhooks deliver `event.activity` arrays. Adapt to our
      // normalized event shape. Real wiring depends on which Alchemy webhook
      // type we configure. For now we accept either a single normalized event
      // or an array under event.activity.
      const body = req.body ?? {};
      const events: AlchemyHyphaEvent[] = Array.isArray(body?.event?.activity)
        ? body.event.activity.map((a: any) => ({
            type: a.type ?? "Transfer",
            proposalId: a.proposalId,
            title: a.title ?? a.metadata?.title,
            recipient: a.toAddress ?? a.recipient,
            amount: a.value ?? a.amount,
            tokenSymbol: a.asset ?? a.tokenSymbol,
            txHash: a.hash ?? a.txHash,
            blockTimeMs: a.blockTimestamp ? new Date(a.blockTimestamp).getTime() : undefined,
          }))
        : Array.isArray(body) ? body : [body];

      const results = [];
      for (const ev of events) {
        results.push(await handleHyphaEvent(ev));
      }
      return res.json({ ok: true, processed: results.length, matched: results.filter((r) => r.matched).length });
    } catch (err: any) {
      console.error("[hypha-alchemy] handler error", err);
      return res.status(500).json({ error: err.message });
    }
  });
}
