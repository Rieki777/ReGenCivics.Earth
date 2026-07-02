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
import { eq, and, gt, sql } from "drizzle-orm";
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
import { isWebhookFailureBlocked, recordWebhookFailure } from "../../_core/security";
import { logger } from "../../_core/logger";

const log = logger("hypha-alchemy");

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
    log.warn("cascadeQuestPassed: no db connection");
    return;
  }

  const meta: QuestBridgeMetadata | null = bridgeRow.payload
    ? (typeof bridgeRow.payload === "string" ? JSON.parse(bridgeRow.payload) : bridgeRow.payload)?.metadata ?? null
    : null;

  if (!meta?.questId) {
    log.warn("cascadeQuestPassed: missing questId in metadata", { bridgeKey: bridgeRow.bridgeKey });
    return;
  }

  const { questId, questTitle, regenReward, deliverableUrl } = meta as QuestBridgeMetadata;
  const userId: number = bridgeRow.initiatorUserId;

  // 1. Look up user email (required for the ledger entry).
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1).catch(() => []);
  const email: string | undefined = userRows[0]?.email ?? undefined;
  if (!email) {
    log.warn("cascadeQuestPassed: user not found", { userId });
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
  }).catch((err: any) => log.error("ledger entry failed", err));

  // 3. Mark quest complete in questCompletions (ignore duplicate).
  await createQuestCompletion({
    userId,
    questId,
    artifactType: "link",
    artifactUrl: deliverableUrl,
    visibility: "public",
  } as any).catch((err: any) => {
    if (err?.code !== "ER_DUP_ENTRY") {
      log.error("createQuestCompletion failed", err);
    }
  });

  // 4. Re-evaluate citizenship tier for this player (full pass; no single-user variant yet).
  await checkCitizenshipTiers(db).catch((err: any) =>
    log.error("checkCitizenshipTiers failed", err),
  );

  // 5. Notify the player.
  await createUserNotification({
    userId,
    type: "quest_complete",
    title: "Your proposal was approved!",
    message: `Your quest "${questTitle}" was approved on Hypha. You earned ${regenReward} $ReGen.${txLink ? ` View on Basescan: ${txLink}` : ""}`,
  } as any).catch((err: any) => log.error("notification failed", err));

  log.info(`cascade complete for bridge ${bridgeRow.bridgeKey} quest ${questId}`);
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
    // The status transition to "passed" is claimed by the guarded CAS below,
    // not set here, so a redelivered event or the paired Transfer can't
    // cascade twice and a cancelled/failed bridge can't be resurrected. Only
    // enrich the record with the on-chain details here.
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

  // Guarded transition to "passed". Both ProposalExecuted and the on-chain
  // Transfer signal success and can arrive in either order, and webhooks get
  // redelivered. This compare-and-swap fires the transition from a
  // non-terminal state only, so `claimedPassed` is true for EXACTLY ONE event.
  // That makes the passed-cascades (token credit, claim reconciliation) run
  // once instead of on every duplicate (was double-crediting quest rewards),
  // and refuses to flip a cancelled/failed claim to passed (the C1
  // cancelled-then-confirmed double-mint path).
  let claimedPassed = false;
  if (event.type === "ProposalExecuted" || event.type === "Transfer") {
    const casResult = await db
      .update(hyphaBridges)
      .set({ status: "passed", hyphaPassedAt: new Date() } as any)
      .where(and(
        eq(hyphaBridges.bridgeKey, bridgeKey),
        sql`status NOT IN ('passed','cancelled','failed')`,
      ));
    const affected = (casResult as unknown as { affectedRows?: number }[])[0]?.affectedRows
      ?? (casResult as unknown as { affectedRows?: number })?.affectedRows
      ?? 0;
    claimedPassed = affected > 0;
  }

  // Fire cascades — best-effort, non-blocking. Passed-cascades only fire on the
  // single event that won the transition; rejection refunds fire on reject.
  const [bridgeRow] = await db
    .select()
    .from(hyphaBridges)
    .where(eq(hyphaBridges.bridgeKey, bridgeKey))
    .limit(1)
    .catch(() => []);
  if (bridgeRow) {
    const bridgeSource = (bridgeRow as any).source;
    if (claimedPassed) {
      if (bridgeSource === "quest_completion") {
        cascadeQuestPassed(bridgeRow, event.txHash).catch((err: any) =>
          log.error("cascadeQuestPassed top-level error", err),
        );
      }
      if (bridgeSource === "redeem_tokens") {
        cascadeClaimPassed(bridgeRow, event).catch((err: any) =>
          log.error("cascadeClaimPassed top-level error", err),
        );
      }
    }
    if (event.type === "ProposalRejected" && bridgeSource === "redeem_tokens") {
      cascadeClaimFailed(bridgeRow).catch((err: any) =>
        log.error("cascadeClaimFailed top-level error", err),
      );
    }
    // C1 compensating debit: a redeem claim that was already refunded
    // (claim_released, e.g. by the nightly stale-cleanup) but then actually
    // executed on-chain. The transition CAS above refuses to flip a
    // cancelled/failed bridge to passed, so no double-cascade — but the user
    // now holds BOTH the refunded private balance and the real Base tokens.
    // Reverse the refund so the ledger reflects reality.
    if (
      (event.type === "ProposalExecuted" || event.type === "Transfer") &&
      !claimedPassed &&
      bridgeSource === "redeem_tokens" &&
      ((bridgeRow as any).status === "cancelled" || (bridgeRow as any).status === "failed")
    ) {
      reconcileRefundedThenConfirmed(bridgeRow).catch((err: any) =>
        log.error("reconcileRefundedThenConfirmed top-level error", err),
      );
    }
  }

  return { matched: true, bridgeKey };
}

/**
 * A redeem claim was refunded (claim_released) and later confirmed on-chain.
 * Debit the refunded amount back out so the user doesn't keep both the refund
 * and the real tokens. Idempotent via idempotencyKey; no-op if there was no
 * refund to reverse.
 */
async function reconcileRefundedThenConfirmed(bridgeRow: any): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { userTokenLedger } = await import("../../../drizzle/schema");
  const { eq: eqDrizzle, and: andDrizzle } = await import("drizzle-orm");

  // Only compensate if a refund actually exists for this bridge.
  const refund = await db
    .select({ id: userTokenLedger.id })
    .from(userTokenLedger)
    .where(andDrizzle(
      eqDrizzle(userTokenLedger.sourceRef, `bridge:${bridgeRow.bridgeKey}`),
      eqDrizzle(userTokenLedger.source, "claim_released"),
    ))
    .limit(1)
    .catch(() => []);
  if (refund.length === 0) return;

  let payload: any = null;
  try {
    payload = typeof bridgeRow.payload === "string" ? JSON.parse(bridgeRow.payload) : bridgeRow.payload;
  } catch { /* ignore */ }
  const tokenType = payload?.metadata?.tokenType as ("rgvoice" | "regen" | "rcvoice" | "rcivics" | undefined);
  const requestedAmount = Number(payload?.metadata?.requestedAmount ?? 0);
  if (!tokenType || requestedAmount <= 0) return;

  const { creditPrivateTokens } = await import("../../db");
  await creditPrivateTokens({
    userId: bridgeRow.initiatorUserId,
    tokenType,
    amount: -requestedAmount,
    source: "claim_reconciled_debit",
    sourceId: bridgeRow.id,
    sourceRef: `bridge:${bridgeRow.bridgeKey}`,
    // Once-only: only ever reverse the refund a single time for this bridge.
    idempotencyKey: `claim_reconciled_debit:${bridgeRow.bridgeKey}`,
    description: `Claim was refunded but later confirmed on-chain; refund reversed`,
  }).catch((err: any) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/duplicate/i.test(msg) && !/unique/i.test(msg)) {
      log.error("reconcileRefundedThenConfirmed: debit failed", err);
    }
  });
}

/**
 * Cascade fired when a redeem_tokens bridge sees its matching
 * on-chain Transfer event.
 *
 * The private ledger debit already happened at requestClaim time
 * (source='claim_pending') so the user could not double-spend their
 * tokens while the claim was in flight. This cascade only:
 *   1. Writes a 'claimed_to_base' marker row so the request-time
 *      debit is paired with a proof-of-confirmation entry.
 *   2. If the on-chain amount differs from requested, writes a
 *      reconciliation row to true up the balance. (delta = actual -
 *      requested. positive delta = under-debited, write extra debit;
 *      negative delta = over-debited, refund the difference.)
 *   3. Notifies the user.
 *
 * Idempotent: re-running on a duplicate webhook delivery is a no-op
 * because the marker row exists.
 */
async function cascadeClaimPassed(bridgeRow: any, event: AlchemyHyphaEvent): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Idempotency: if a 'claimed_to_base' marker row already exists for
  // this bridge, the cascade has run.
  const { userTokenLedger } = await import("../../../drizzle/schema");
  const { eq: eqDrizzle } = await import("drizzle-orm");
  const alreadyConfirmed = await db
    .select({ id: userTokenLedger.id })
    .from(userTokenLedger)
    .where(and(
      eqDrizzle(userTokenLedger.sourceRef, `bridge:${bridgeRow.bridgeKey}`),
      eqDrizzle(userTokenLedger.source, "claimed_to_base"),
    ))
    .limit(1)
    .catch(() => []);
  if (alreadyConfirmed.length > 0) {
    log.info(`cascadeClaimPassed: bridge ${bridgeRow.bridgeKey} already confirmed, skipping`);
    return;
  }

  // Pull the bridge's payload to figure out which token + requested amount.
  let payload: any = null;
  try {
    payload = typeof bridgeRow.payload === "string" ? JSON.parse(bridgeRow.payload) : bridgeRow.payload;
  } catch { /* ignore */ }
  const tokenType = payload?.metadata?.tokenType as ("rgvoice" | "regen" | "rcvoice" | "rcivics" | undefined);
  const requestedAmount = Number(payload?.metadata?.requestedAmount ?? bridgeRow.hyphaTokenAmount ?? 0);
  const actualAmount = event.amount ? Math.round(Number(event.amount)) : requestedAmount;
  if (!tokenType || !Number.isFinite(actualAmount) || actualAmount <= 0) {
    log.warn(`cascadeClaimPassed: bridge ${bridgeRow.bridgeKey} missing tokenType or amount`, { payload, event });
    return;
  }

  const { creditPrivateTokens, createUserNotification } = await import("../../db");

  // Marker row. Amount is the delta vs the request-time debit:
  //   actual = requested → 0 (just records the confirmation)
  //   actual > requested → negative delta (debit the difference)
  //   actual < requested → positive delta (refund the over-debited diff)
  const delta = requestedAmount - actualAmount; // signed: positive => refund, negative => extra debit
  const reconcileAmount = delta; // already correctly signed for ledger insertion
  await creditPrivateTokens({
    userId: bridgeRow.initiatorUserId,
    tokenType,
    amount: reconcileAmount,
    source: "claimed_to_base",
    sourceId: bridgeRow.id,
    sourceRef: `bridge:${bridgeRow.bridgeKey}`,
    description: reconcileAmount === 0
      ? `Claim of ${actualAmount} ${tokenType} confirmed on Base${event.txHash ? `. Tx: https://basescan.org/tx/${event.txHash}` : ""}`
      : `Claim reconciled: requested ${requestedAmount}, actual ${actualAmount} ${tokenType}${event.txHash ? `. Tx: https://basescan.org/tx/${event.txHash}` : ""}`,
  }).catch((err: any) =>
    log.error("cascadeClaimPassed: creditPrivateTokens failed", err),
  );

  await createUserNotification({
    userId: bridgeRow.initiatorUserId,
    type: "claim_complete",
    title: "Tokens claimed!",
    message: `${actualAmount} ${tokenType} moved to your wallet on Base.${event.txHash ? ` View on Basescan: https://basescan.org/tx/${event.txHash}` : ""}`,
  } as any).catch((err: any) => log.error("claim notification failed", err));

  // Phase 2.1: flip the State B → State C UI flag on player_paths for any
  // unclaimed Co-Creator / Steward bonuses on this user. The four-token
  // bonus pays out in RGVoice, so only that tokenType triggers the
  // cascade. Two narrow UPDATEs (one per tier) target rows that have an
  // earned tier_event but a NULL claimedAt timestamp -- so already-
  // claimed bonuses keep their original timestamp and gratitude /
  // harvest RGVoice claims that don't have a matching tier_event are
  // untouched. Idempotent, safe to re-run if the cascade fires twice.
  if (tokenType === "rgvoice" && bridgeRow.initiatorUserId) {
    try {
      await db.execute(sql`
        UPDATE player_paths AS pp
        SET coCreatorBonusClaimedAt = NOW()
        WHERE pp.userId = ${bridgeRow.initiatorUserId}
          AND pp.coCreatorBonusClaimedAt IS NULL
          AND EXISTS (
            SELECT 1 FROM tier_events te
            WHERE te.userId = pp.userId
              AND te.path = pp.path
              AND te.eventType = 'co_creator_earned'
          )
      `);
      await db.execute(sql`
        UPDATE player_paths AS pp
        SET stewardBonusClaimedAt = NOW()
        WHERE pp.userId = ${bridgeRow.initiatorUserId}
          AND pp.stewardBonusClaimedAt IS NULL
          AND EXISTS (
            SELECT 1 FROM tier_events te
            WHERE te.userId = pp.userId
              AND te.path = pp.path
              AND te.eventType = 'steward_earned'
          )
      `);
      log.info(
        `cascadeClaimPassed: marked unclaimed tier bonuses claimed for user ${bridgeRow.initiatorUserId}`,
      );
    } catch (err) {
      // Don't fail the whole cascade if the bonus-flag update breaks --
      // the on-chain credit + notification already succeeded. Surface
      // the failure so admin can run a manual SQL fix-up.
      log.error("cascadeClaimPassed: tier bonus flag cascade failed", err);
    }
  }

  log.info(`cascadeClaimPassed: bridge ${bridgeRow.bridgeKey} confirmed for user ${bridgeRow.initiatorUserId} (requested ${requestedAmount}, actual ${actualAmount} ${tokenType}, delta ${delta})`);
}

/**
 * Cascade fired when a redeem_tokens bridge sees ProposalRejected.
 * Refunds the private ledger by the originally-requested amount via a
 * 'claim_released' credit row. Idempotent.
 */
async function cascadeClaimFailed(bridgeRow: any): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { userTokenLedger } = await import("../../../drizzle/schema");
  const { eq: eqDrizzle } = await import("drizzle-orm");
  const existing = await db
    .select({ id: userTokenLedger.id })
    .from(userTokenLedger)
    .where(and(
      eqDrizzle(userTokenLedger.sourceRef, `bridge:${bridgeRow.bridgeKey}`),
      eqDrizzle(userTokenLedger.source, "claim_released"),
    ))
    .limit(1)
    .catch(() => []);
  if (existing.length > 0) return;

  let payload: any = null;
  try {
    payload = typeof bridgeRow.payload === "string" ? JSON.parse(bridgeRow.payload) : bridgeRow.payload;
  } catch { /* ignore */ }
  const tokenType = payload?.metadata?.tokenType as ("rgvoice" | "regen" | "rcvoice" | "rcivics" | undefined);
  const requestedAmount = Number(payload?.metadata?.requestedAmount ?? 0);
  if (!tokenType || requestedAmount <= 0) return;

  const { creditPrivateTokens, createUserNotification } = await import("../../db");
  await creditPrivateTokens({
    userId: bridgeRow.initiatorUserId,
    tokenType,
    amount: requestedAmount,
    source: "claim_released",
    sourceId: bridgeRow.id,
    sourceRef: `bridge:${bridgeRow.bridgeKey}`,
    // Once-only across cancelClaim / nightly cleanup / this failure webhook.
    idempotencyKey: `claim_released:${bridgeRow.bridgeKey}`,
    description: `Hypha rejected the claim, ${requestedAmount} ${tokenType} refunded to your private balance`,
  }).catch((err: any) => {
    const msg = err instanceof Error ? err.message : String(err);
    // A concurrent writer already refunded this bridge; not an error.
    if (!/duplicate/i.test(msg) && !/unique/i.test(msg)) {
      log.error("cascadeClaimFailed: refund failed", err);
    }
  });

  await createUserNotification({
    userId: bridgeRow.initiatorUserId,
    type: "claim_failed",
    title: "Claim was not approved",
    message: `Your claim of ${requestedAmount} ${tokenType} was rejected on Hypha. Your private balance has been refunded.`,
  } as any).catch((err: any) => log.error("claim_failed notification failed", err));
}

export function registerHyphaWebhookRoutes(app: Express) {
  app.post("/api/webhooks/hypha-alchemy", async (req: Request, res: Response) => {
    const sourceIp = req.ip || req.socket.remoteAddress || "unknown";
    if (await isWebhookFailureBlocked(sourceIp, "hypha-alchemy")) {
      return res.status(429).json({ error: "Too many invalid signatures" });
    }
    const sig = req.header("x-alchemy-signature") ?? req.header("X-Alchemy-Signature");
    const rawBody = (req as any).rawBody ?? JSON.stringify(req.body ?? {});
    if (!verifyAlchemySignature(rawBody, sig)) {
      await recordWebhookFailure(sourceIp, "hypha-alchemy");
      log.warn("signature verification failed", { ip: sourceIp });
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
      log.error("handler error", err);
      return res.status(500).json({ error: err.message });
    }
  });
}
