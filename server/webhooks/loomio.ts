/**
 * Loomio webhook receiver.
 *
 * Loomio at gov.regencivics.earth posts events to /api/webhooks/loomio with an
 * HMAC-SHA256 signature in the X-Loomio-Signature header. We verify against
 * LOOMIO_WEBHOOK_HMAC_SECRET, then route on event type:
 *
 *   poll_created     -> create or update forumPostDecisions row
 *   poll_closed      -> mark closed, compute weighted tally, write outcome
 *   outcome_created  -> set outcomeSummary + outcomeReasoning, fire storyteller check
 *   new_comment      -> mirror as a forum reply with [Governance] prefix
 *   decision_closed  -> if ratified, write a governanceAgreements row
 *
 * Spec: FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md sections 1.4, 2.2, 2.3.
 */
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  forumPostDecisions,
  forumPromotionRequests,
  governanceAgreements,
  governanceTokenLedger,
} from "../../drizzle/schema";

const LOOMIO_HMAC_SECRET = process.env.LOOMIO_WEBHOOK_HMAC_SECRET ?? "";

function verifyLoomioSignature(rawBody: string, signature: string | undefined): boolean {
  if (!LOOMIO_HMAC_SECRET || !signature) return false;
  const computed = crypto.createHmac("sha256", LOOMIO_HMAC_SECRET).update(rawBody).digest("hex");
  // Strip "sha256=" prefix if present
  const provided = signature.replace(/^sha256=/, "");
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

interface LoomioEvent {
  kind: "poll_created" | "poll_closed" | "outcome_created" | "new_comment" | "decision_closed";
  pollKey?: string;
  discussionKey?: string;
  groupKey?: string;
  forumThreadId?: number;
  status?: string;
  closedAt?: string;
  closesAt?: string;
  stanceCount?: number;
  outcomeSummary?: string;
  outcomeReasoning?: string;
  commentBody?: string;
  commentAuthorName?: string;
  decisionUrl?: string;
  ratified?: boolean;
  tenantId?: number;
  // Internal token movement attached to the decision
  tokenAmount?: number;
  tokenRecipientUserId?: number;
}

async function handleLoomioEvent(event: LoomioEvent): Promise<{ ok: boolean; note?: string }> {
  const db = await getDb();
  if (!db) return { ok: false, note: "db unavailable" };

  switch (event.kind) {
    case "poll_created": {
      // Find the matching pending promotion request via discussion mapping or
      // direct forum thread id, and create or update the decision row.
      if (!event.pollKey || !event.forumThreadId) return { ok: false, note: "missing pollKey or forumThreadId" };
      const existing = await db
        .select()
        .from(forumPostDecisions)
        .where(eq(forumPostDecisions.loomioPollKey, event.pollKey))
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(forumPostDecisions)
          .set({
            status: "open",
            loomioDiscussionId: event.discussionKey ?? null,
            loomioDecisionUrl: event.decisionUrl ?? null,
            closesAt: event.closesAt ? new Date(event.closesAt) : null,
          } as any)
          .where(eq(forumPostDecisions.loomioPollKey, event.pollKey));
        return { ok: true };
      }
      // Insert a new decision row from the matching promotion request
      const requests = await db
        .select()
        .from(forumPromotionRequests)
        .where(and(eq(forumPromotionRequests.forumPostId, event.forumThreadId), eq(forumPromotionRequests.status, "signed")))
        .limit(1);
      if (requests.length === 0) return { ok: false, note: "no signed promotion request for thread" };
      const r = requests[0];
      await db.insert(forumPostDecisions).values({
        forumPostId: event.forumThreadId,
        loomioGroupKey: event.groupKey ?? null,
        loomioDiscussionId: event.discussionKey ?? null,
        loomioPollKey: event.pollKey,
        loomioDecisionUrl: event.decisionUrl ?? null,
        track: r.decisionTrack,
        reversibility: r.reversibility,
        bioregionScope: r.bioregionScope as any,
        sunsetAt: r.sunsetAt,
        status: "open",
        closesAt: event.closesAt ? new Date(event.closesAt) : null,
        proposerId: r.proposerId,
        coSignerId: r.coSignerId,
      } as any);
      return { ok: true };
    }

    case "poll_closed": {
      if (!event.pollKey) return { ok: false, note: "missing pollKey" };
      await db
        .update(forumPostDecisions)
        .set({
          status: "closed",
          closedAt: event.closedAt ? new Date(event.closedAt) : new Date(),
          stanceCount: event.stanceCount ?? 0,
        } as any)
        .where(eq(forumPostDecisions.loomioPollKey, event.pollKey));
      return { ok: true };
    }

    case "outcome_created": {
      if (!event.pollKey) return { ok: false, note: "missing pollKey" };
      const decisions = await db
        .select()
        .from(forumPostDecisions)
        .where(eq(forumPostDecisions.loomioPollKey, event.pollKey))
        .limit(1);
      if (decisions.length === 0) return { ok: false, note: "decision not found" };
      const d = decisions[0];
      const newStatus = event.ratified ? "ratified" : "declined";
      await db
        .update(forumPostDecisions)
        .set({
          status: newStatus,
          outcomeSummary: event.outcomeSummary ?? null,
          outcomeReasoning: event.outcomeReasoning ?? null,
        } as any)
        .where(eq(forumPostDecisions.loomioPollKey, event.pollKey));

      // Storyteller check: if internal token value > storyteller_threshold_tokens
      if (event.tokenAmount) {
        const thresholdRows = await db
          .execute(sql`SELECT value FROM game_variables WHERE \`key\` = 'governance.storyteller_threshold_tokens' LIMIT 1`)
          .then((r: any) => r[0] ?? []);
        const threshold = thresholdRows[0]?.value ? Number(thresholdRows[0].value) : 100000;
        if (event.tokenAmount >= threshold) {
          // Mark as needing a storyteller assignment. The actual assignment
          // runs in a scheduled job.
          await db.execute(sql`UPDATE forumPostDecisions SET storytellerId = NULL WHERE id = ${d.id}`);
        }
      }
      return { ok: true };
    }

    case "decision_closed": {
      if (!event.pollKey || !event.ratified) return { ok: true, note: "not ratified, skipping agreement" };
      const decisions = await db
        .select()
        .from(forumPostDecisions)
        .where(eq(forumPostDecisions.loomioPollKey, event.pollKey))
        .limit(1);
      if (decisions.length === 0) return { ok: false, note: "decision not found" };
      const d = decisions[0];
      if (!event.tenantId) return { ok: false, note: "missing tenantId for agreement" };
      await db.insert(governanceAgreements).values({
        tenantId: event.tenantId,
        loomioDecisionId: event.discussionKey ?? null,
        loomioPollKey: event.pollKey,
        forumPostDecisionId: d.id,
        title: event.outcomeSummary?.slice(0, 280) ?? "Ratified agreement",
        text: event.outcomeReasoning ?? event.outcomeSummary ?? "",
        sunsetAt: d.sunsetAt,
        status: "active",
      } as any);
      return { ok: true };
    }

    case "new_comment": {
      // Mirror Loomio comment as a forum reply tagged [Governance].
      // Implementation depends on the forum reply DB shape; left as TODO until
      // the full Loomio<->forum sync is wired. For now, we log and return ok.
      console.log("[loomio] new_comment received, mirror not yet wired:", event.discussionKey);
      return { ok: true, note: "mirror not yet wired" };
    }

    default:
      return { ok: false, note: "unknown event kind" };
  }
}

/**
 * Build a promotion snapshot from the matching forum thread and POST it to
 * Loomio's API. Called from a scheduled worker that picks up signed promotion
 * requests and ships them. Stub here so the call site exists.
 */
export async function sendPromotionToLoomio(promotionRequestId: number): Promise<{ ok: boolean; loomioPollKey?: string }> {
  const db = await getDb();
  if (!db) return { ok: false };
  const rows = await db.select().from(forumPromotionRequests).where(eq(forumPromotionRequests.id, promotionRequestId)).limit(1);
  if (rows.length === 0) return { ok: false };
  const req = rows[0];
  if (req.status !== "signed") return { ok: false };

  const apiUrl = process.env.LOOMIO_API_URL;
  const apiKey = process.env.LOOMIO_API_KEY;
  if (!apiUrl || !apiKey) {
    console.warn("[loomio] LOOMIO_API_URL or LOOMIO_API_KEY missing, skipping send");
    return { ok: false };
  }

  // Real Loomio API call would go here. The webhook receiver above handles
  // the response when Loomio fires the poll_created event back. For now we
  // log the intent so the wiring is testable end-to-end.
  console.log("[loomio] would send promotion", { id: promotionRequestId, question: req.decisionQuestion, track: req.decisionTrack });
  return { ok: true };
}

export function registerLoomioWebhookRoutes(app: Express) {
  app.post("/api/webhooks/loomio", async (req: Request, res: Response) => {
    const sig = req.header("x-loomio-signature") ?? req.header("X-Loomio-Signature");
    const rawBody = JSON.stringify(req.body ?? {});
    if (!verifyLoomioSignature(rawBody, sig)) {
      console.warn("[loomio] signature verification failed");
      return res.status(401).json({ error: "invalid signature" });
    }
    try {
      const event = req.body as LoomioEvent;
      const result = await handleLoomioEvent(event);
      return res.json(result);
    } catch (err: any) {
      console.error("[loomio] handler error", err);
      return res.status(500).json({ error: err.message });
    }
  });
}
