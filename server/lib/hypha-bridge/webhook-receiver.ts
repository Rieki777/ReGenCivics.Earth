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
import { eq, and, isNull, gt } from "drizzle-orm";
import { getDb } from "../../db";
import { hyphaBridges } from "../../../drizzle/schema";
import { stripTitleMarker } from "./prefill";

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
  return { matched: true, bridgeKey };
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
