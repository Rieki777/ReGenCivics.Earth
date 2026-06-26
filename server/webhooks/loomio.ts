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
  forumReplies,
  forumPosts,
  governanceAgreements,
  governanceTokenLedger,
  users,
} from "../../drizzle/schema";
import { bridgeToHypha } from "../lib/hypha-bridge";
import { logger } from "../_core/logger";

const log = logger("loomio-webhook");

/**
 * Post a templated bot receipt reply to a forum thread when a governance
 * decision closes. Idempotent: keyed by a sentinel string in the reply body
 * so re-fired webhooks do not double-post.
 */
async function postDecisionReceiptReply(
  db: Awaited<ReturnType<typeof getDb>>,
  {
    threadId,
    outcomeSummary,
    ratified,
    decisionUrl,
    reversibility,
    sunsetAt,
    loomioPollKey,
  }: {
    threadId: number;
    outcomeSummary?: string | null;
    ratified: boolean;
    decisionUrl?: string | null;
    reversibility?: string | null;
    sunsetAt?: Date | null;
    loomioPollKey?: string | null;
  }
) {
  if (!db) return;
  // Idempotency: check if a receipt reply already exists for this poll
  const sentinel = `[DecisionReceipt:${loomioPollKey ?? threadId}]`;
  const existing = await db.execute(
    sql`SELECT id FROM forumReplies WHERE postId = ${threadId} AND content LIKE ${`%${sentinel}%`} LIMIT 1`
  );
  if ((existing as any)[0]?.length > 0) {
    log.info("receipt reply already posted, skipping", { threadId });
    return;
  }

  // Find or fall back to proposer for the ReGen Guide system account
  const guideRows = await db.select({ id: users.id }).from(users).where(eq(users.openId, "regen-guide-system")).limit(1);
  const decisionRows = await db.select().from(forumPostDecisions).where(eq(forumPostDecisions.forumPostId, threadId)).limit(1);
  const authorId = guideRows[0]?.id ?? decisionRows[0]?.proposerId ?? 1;

  const outcomeLabel = ratified ? "Ratified" : "Not ratified";
  const reversibilityLabel = reversibility === "one_way_door"
    ? "One-way door (hard to undo)"
    : reversibility === "semi_reversible"
    ? "Semi-reversible"
    : "Reversible";

  const lines = [
    `**[Governance receipt] ${outcomeLabel}**`,
    "",
    outcomeSummary ? `**What was decided:** ${outcomeSummary}` : "",
    `**Reversibility:** ${reversibilityLabel}`,
    sunsetAt ? `**Revisits on:** ${sunsetAt.toLocaleDateString()}` : "",
    decisionUrl ? `[View the decision](${decisionUrl})` : "",
    "",
    `_This is an automated receipt. ${sentinel}_`,
  ].filter((l) => l !== "").join("\n");

  try {
    await db.insert(forumReplies).values({
      postId: threadId,
      authorId,
      content: lines,
    } as any);
    log.info("posted decision receipt reply", { threadId });
  } catch (err) {
    log.error("failed to post receipt reply", err);
  }
}

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
      // Advance thread to proposal stage
      await db.execute(
        sql`UPDATE forumPosts SET governanceStage = 'proposal' WHERE id = ${event.forumThreadId}`
      );
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

      // Mark forum thread as decided and post the receipt reply (Improvement 5)
      await db.execute(
        sql`UPDATE forumPosts SET governanceStage = 'decided' WHERE id = ${d.forumPostId}`
      );
      await postDecisionReceiptReply(db, {
        threadId: d.forumPostId,
        outcomeSummary: event.outcomeSummary,
        ratified: !!event.ratified,
        decisionUrl: event.decisionUrl,
        reversibility: (d as any).reversibility,
        sunsetAt: (d as any).sunsetAt ? new Date((d as any).sunsetAt as any) : null,
        loomioPollKey: event.pollKey,
      });

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

      // If ratified AND moves tokens, auto-create the Hypha Bridge so the
      // proposer can hand off to Hypha when ready. The bridge URL gets
      // attached to the decision row via hyphaBridgeId.
      if (event.ratified && event.tokenAmount && event.tokenAmount > 0) {
        try {
          const proposerRows = await db.select().from(users).where(eq(users.id, d.proposerId)).limit(1);
          const wallet = (proposerRows[0] as any)?.baseWalletAddress as `0x${string}` | undefined;
          const targetDhoSlug = d.track === "fund"
            ? (process.env.HYPHA_DHO_REGEN_CIVICS_SLUG ?? "regen-civics")
            : (process.env.HYPHA_DHO_REGEN_GAMES_SLUG ?? "regen-games");
          const tokenAddress = d.track === "fund"
            ? (process.env.RCIVICS_TOKEN_ADDRESS_BASE ?? "0x72e9B17a2F93A923D63666eC0a1c096B1443ef26")
            : (process.env.REGEN_TOKEN_ADDRESS_BASE ?? "0x4E617cd113364193d215d107AdD6fa50418AA2E4");

          const bridgeResult = await bridgeToHypha("decision-to-contribution", {
            sourceId: String(d.id),
            targetDhoSlug,
            title: event.outcomeSummary?.slice(0, 200) ?? `Decision ${d.id}`,
            description: event.outcomeReasoning ?? event.outcomeSummary ?? "",
            recipient: wallet,
            payouts: wallet ? [{ amount: String(event.tokenAmount), token: tokenAddress as `0x${string}` }] : undefined,
            initiatorUserId: d.proposerId,
            metadata: { loomioPollKey: event.pollKey, decisionId: d.id, track: d.track },
          });
          // Look up the bridge id from the key and link it to the decision
          const bridgeRows = await db.execute(sql`SELECT id FROM hyphaBridges WHERE bridgeKey = ${bridgeResult.bridgeKey} LIMIT 1`).then((r: any) => r[0] ?? []);
          if (bridgeRows[0]) {
            await db
              .update(forumPostDecisions)
              .set({ hyphaBridgeId: bridgeRows[0].id } as any)
              .where(eq(forumPostDecisions.id, d.id));
          }
          log.info("auto-created bridge for ratified decision", { decisionId: d.id, bridgeKey: bridgeResult.bridgeKey });
        } catch (err) {
          log.error("failed to auto-create bridge for ratified decision", err);
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
      if (!event.discussionKey || !event.commentBody) {
        return { ok: true, note: "new_comment missing discussionKey or body" };
      }

      // Find the matching forumPostDecisions row via loomioDiscussionId
      const decisionRows = await db
        .select()
        .from(forumPostDecisions)
        .where(eq(forumPostDecisions.loomioDiscussionId, event.discussionKey))
        .limit(1);
      if (decisionRows.length === 0) {
        log.info("new_comment: no matching thread for discussion", { discussionKey: event.discussionKey });
        return { ok: true, note: "no matching thread" };
      }
      const threadId = decisionRows[0].forumPostId;

      // Post as ReGen Guide system user (the mirror is attributed to Guide,
      // prefixed with the original Loomio author name)
      const guideRows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.openId, "regen-guide-system"))
        .limit(1);
      const authorId = guideRows[0]?.id ?? decisionRows[0].proposerId;

      const authorName = event.commentAuthorName ?? "Someone";
      const body = `[Governance] ${authorName} on the decision:\n\n${event.commentBody}`;

      try {
        await db.insert((await import("../../drizzle/schema")).forumReplies).values({
          postId: threadId,
          authorId,
          content: body,
        } as any);
        return { ok: true };
      } catch (err) {
        log.error("new_comment mirror insert failed", err);
        return { ok: false, note: "insert failed" };
      }
    }

    default:
      return { ok: false, note: "unknown event kind" };
  }
}

/**
 * Build a promotion snapshot from the matching forum thread and POST it to
 * Loomio's API to create a new discussion + poll. Called from
 * runAllGovernanceJobs in jobs/governanceJobs.ts.
 *
 * Spec: FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md sections 1.3, 1.4, 1.5.
 *
 * The Loomio API call happens here. The webhook receiver above handles the
 * poll_created event Loomio fires back, which is when we create the
 * forumPostDecisions row.
 */
export async function buildPromotionSnapshot(threadId: number): Promise<{ title: string; body: string; threadUrl: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const post = await db.select().from((await import("../../drizzle/schema")).forumPosts).where(eq((await import("../../drizzle/schema")).forumPosts.id, threadId)).limit(1);
  if (post.length === 0) return null;
  const replies = await db.select().from((await import("../../drizzle/schema")).forumReplies).where(eq((await import("../../drizzle/schema")).forumReplies.postId, threadId)).limit(50);

  const baseUrl = process.env.PUBLIC_BASE_URL ?? "https://regencivics.earth";
  const threadUrl = `${baseUrl}/community/post/${threadId}`;

  // Top 5 most-liked replies (no like data yet, so first 5 chronologically)
  const topReplies = replies.slice(0, 5);

  const body = [
    `_Promoted from a community forum discussion. Read the full conversation: ${threadUrl}_`,
    "",
    "## Original post",
    "",
    post[0].content ?? "(no content)",
    "",
    "## Top replies",
    "",
    ...topReplies.map((r, i) => `**Reply ${i + 1}:** ${(r.content ?? "").slice(0, 600)}`),
    "",
    `---`,
    `_Thread started ${new Date(post[0].createdAt as any).toLocaleDateString()}, ${replies.length + 1} voices, ${replies.length} replies._`,
  ].join("\n");

  return { title: post[0].title ?? "", body, threadUrl };
}

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
    log.warn("LOOMIO_API_URL or LOOMIO_API_KEY missing, skipping send");
    return { ok: false };
  }

  // Pick the right Loomio subgroup based on the track
  const fundGroup = process.env.LOOMIO_GROUP_FUND ?? "fund-decisions";
  const gameGroup = process.env.LOOMIO_GROUP_GAME ?? "game-decisions";
  const groupKey = req.decisionTrack === "fund" ? fundGroup : req.decisionTrack === "game" ? gameGroup : fundGroup;

  const snapshot = await buildPromotionSnapshot(req.forumPostId);
  if (!snapshot) return { ok: false };

  // Build the Loomio create-discussion payload. Real Loomio API uses
  // POST /api/v1/discussions with a JSON body. Once the discussion is
  // created we POST another to /api/v1/polls to attach the poll.
  try {
    const discussionResp = await fetch(`${apiUrl}/api/v1/discussions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        discussion: {
          group_key: groupKey,
          title: snapshot.title,
          description: snapshot.body,
          // Loomio supports a "private" flag for member-only visibility
          private: false,
        },
      }),
    });

    if (!discussionResp.ok) {
      log.error("discussion create failed", undefined, { status: discussionResp.status, body: await discussionResp.text() });
      return { ok: false };
    }
    const discussion = await discussionResp.json() as any;
    const discussionKey = discussion?.discussions?.[0]?.key ?? discussion?.key;

    const pollResp = await fetch(`${apiUrl}/api/v1/polls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        poll: {
          discussion_id: discussionKey,
          poll_type: req.suggestedTemplate ?? "consent",
          title: req.decisionQuestion,
          details: snapshot.body,
          // 7-day default window
          closing_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }),
    });

    if (!pollResp.ok) {
      log.error("poll create failed", undefined, { status: pollResp.status, body: await pollResp.text() });
      return { ok: false };
    }
    const poll = await pollResp.json() as any;
    const pollKey = poll?.polls?.[0]?.key ?? poll?.key;
    log.info("promotion sent", { id: promotionRequestId, discussionKey, pollKey });
    return { ok: true, loomioPollKey: pollKey };
  } catch (err: any) {
    log.error("sendPromotionToLoomio failed", err);
    return { ok: false };
  }
}

/** Sync a user's Loomio subgroup memberships from their MySQL bioregion list.
 * Called on every login from sdk.upsertUser, plus a nightly job at 3am UTC.
 *
 * The user gets added to one Loomio subgroup per bioregion they're registered
 * in. If they leave a bioregion, they get removed. Out-of-region citizens can
 * read decisions but cannot stance on them, which Loomio enforces via group
 * membership.
 */
export async function syncLoomioSubgroups(userId: number): Promise<{ ok: boolean; added: number; removed: number }> {
  const db = await getDb();
  if (!db) return { ok: false, added: 0, removed: 0 };

  const apiUrl = process.env.LOOMIO_API_URL;
  const apiKey = process.env.LOOMIO_API_KEY;
  if (!apiUrl || !apiKey) {
    return { ok: false, added: 0, removed: 0 };
  }

  const userRows = await db.select().from((await import("../../drizzle/schema")).users).where(eq((await import("../../drizzle/schema")).users.id, userId)).limit(1);
  if (userRows.length === 0) return { ok: false, added: 0, removed: 0 };
  const user = userRows[0] as any;

  let bioregions: string[] = [];
  try {
    if (user.bioregions) {
      bioregions = typeof user.bioregions === "string" ? JSON.parse(user.bioregions) : (Array.isArray(user.bioregions) ? user.bioregions : []);
    }
  } catch { /* ignore */ }
  if (bioregions.length === 0) return { ok: true, added: 0, removed: 0 };

  const userEmail = user.email as string | undefined;
  if (!userEmail) return { ok: true, added: 0, removed: 0 };

  // 1. Fetch current Loomio memberships for this user by email.
  let currentMemberships: Array<{ id: number; group_key: string }> = [];
  try {
    const listResp = await fetch(
      `${apiUrl}/api/v1/memberships?user_email=${encodeURIComponent(userEmail)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (listResp.ok) {
      const listData = await listResp.json() as any;
      currentMemberships = (listData?.memberships ?? []).map((m: any) => ({
        id: m.id,
        group_key: m.group?.key ?? m.group_key ?? "",
      })).filter((m: any) => m.group_key);
    }
  } catch { /* non-fatal, fall through to add-only mode */ }

  // 2. Remove memberships for groups not in the user's current bioregion list.
  let removed = 0;
  for (const membership of currentMemberships) {
    if (!bioregions.includes(membership.group_key)) {
      try {
        const delResp = await fetch(`${apiUrl}/api/v1/memberships/${membership.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (delResp.ok) removed++;
      } catch { /* non-fatal */ }
    }
  }

  // 3. Add memberships for bioregions not already present in Loomio.
  const existingGroupKeys = new Set(currentMemberships.map((m) => m.group_key));
  let added = 0;
  for (const region of bioregions) {
    if (existingGroupKeys.has(region)) continue;
    try {
      const resp = await fetch(`${apiUrl}/api/v1/memberships`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          membership: {
            group_key: region,
            user_email: userEmail,
          },
        }),
      });
      if (resp.ok) added++;
    } catch { /* non-fatal */ }
  }

  return { ok: true, added, removed };
}

/** Register the Loomio webhook Express endpoint. */
export function registerLoomioWebhookRoutes(app: import("express").Express) {
  app.post("/api/webhooks/loomio", async (req: import("express").Request, res: import("express").Response) => {
    const sig = req.header("x-loomio-signature") ?? req.header("X-Loomio-Signature");
    const rawBody = (req as any).rawBody ?? JSON.stringify(req.body ?? {});
    if (!verifyLoomioSignature(rawBody, sig)) {
      log.warn("signature verification failed");
      return res.status(401).json({ error: "invalid signature" });
    }
    try {
      const event = req.body as LoomioEvent;
      const result = await handleLoomioEvent(event);
      return res.json(result);
    } catch (err: any) {
      log.error("handler error", err);
      return res.status(500).json({ error: err.message });
    }
  });
}
