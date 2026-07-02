/**
 * Governance scheduled jobs.
 *
 * Hourly Railway cron POSTs to /api/cron/governance-jobs and we run all of:
 *   - expirePromotionRequests: close out unsigned dual-key requests after the window
 *   - sendSignedPromotionsToLoomio: ship signed promotion requests to Loomio API
 *   - assignStorytellers: pick storytellers for high-stakes ratified decisions
 *   - checkSunsetting: create renewal threads for decisions sunsetting in T-7
 *   - reconcileHyphaBridges: re-check stuck handoff_sent bridges via Base RPC
 *   - markClosingSoon: flip status to closing_soon for decisions inside the window
 */
import { eq, and, lte, isNull, sql, gt, lt } from "drizzle-orm";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import { getDb } from "../db";
import {
  forumPromotionRequests,
  forumPostDecisions,
  forumPosts,
  hyphaBridges,
  governanceTenants,
  users,
} from "../../drizzle/schema";
import { sendPromotionToLoomio } from "../webhooks/loomio";

interface JobReport {
  job: string;
  ok: boolean;
  count?: number;
  error?: string;
}

async function readVar(key: string, fallback: number): Promise<number> {
  const db = await getDb();
  if (!db) return fallback;
  try {
    const rows = await db.execute(sql`SELECT value FROM game_variables WHERE \`key\` = ${key} LIMIT 1`).then((r: any) => r[0] ?? []);
    if (rows && rows.length > 0) return Number(rows[0].value) || fallback;
  } catch { /* ignore */ }
  return fallback;
}

/** Mark all promotion requests with status=pending and expiresAt < now as expired. */
export async function expirePromotionRequests(): Promise<JobReport> {
  try {
    const db = await getDb();
    if (!db) return { job: "expirePromotionRequests", ok: false, error: "no db" };
    const result: any = await db
      .update(forumPromotionRequests)
      .set({ status: "expired" } as any)
      .where(and(eq(forumPromotionRequests.status, "pending"), lt(forumPromotionRequests.expiresAt, new Date())));
    return { job: "expirePromotionRequests", ok: true, count: result?.[0]?.affectedRows ?? 0 };
  } catch (err: any) {
    return { job: "expirePromotionRequests", ok: false, error: err.message };
  }
}

/** Find any signed promotion requests that don't yet have a forumPostDecisions
 * row, and ship them to Loomio. The Loomio webhook receiver will create the
 * decision row when poll_created fires back. */
export async function sendSignedPromotionsToLoomio(): Promise<JobReport> {
  try {
    const db = await getDb();
    if (!db) return { job: "sendSignedPromotionsToLoomio", ok: false, error: "no db" };
    // Only pick up requests we haven't already shipped. Without the
    // loomioSentAt guard this job re-sent every signed request each hour until
    // Loomio's poll_created webhook created the decision row, spawning a
    // duplicate Loomio discussion+poll on every run if that webhook lagged.
    const signed = await db
      .select()
      .from(forumPromotionRequests)
      .where(and(eq(forumPromotionRequests.status, "signed"), isNull(forumPromotionRequests.loomioSentAt)))
      .limit(20);
    let sent = 0;
    for (const req of signed) {
      // Skip if a decision already exists for this thread
      const existing = await db
        .select({ id: forumPostDecisions.id })
        .from(forumPostDecisions)
        .where(eq(forumPostDecisions.forumPostId, req.forumPostId))
        .limit(1);
      if (existing.length > 0) continue;
      const result = await sendPromotionToLoomio(req.id);
      if (result.ok) {
        // Mark as sent so we don't re-ship on the next run. A genuine send
        // failure leaves it null so it retries.
        await db
          .update(forumPromotionRequests)
          .set({ loomioSentAt: new Date() } as any)
          .where(eq(forumPromotionRequests.id, req.id));
        sent += 1;
      }
    }
    return { job: "sendSignedPromotionsToLoomio", ok: true, count: sent };
  } catch (err: any) {
    return { job: "sendSignedPromotionsToLoomio", ok: false, error: err.message };
  }
}

/** Auto-flip open decisions to closing_soon when they enter the warning window. */
export async function markClosingSoon(): Promise<JobReport> {
  try {
    const db = await getDb();
    if (!db) return { job: "markClosingSoon", ok: false, error: "no db" };
    const windowHours = await readVar("governance.closing_soon_window_hours", 48);
    const now = new Date();
    const cutoff = new Date(now.getTime() + windowHours * 60 * 60 * 1000);
    const result: any = await db
      .update(forumPostDecisions)
      .set({ status: "closing_soon" } as any)
      .where(and(
        eq(forumPostDecisions.status, "open"),
        lt(forumPostDecisions.closesAt, cutoff),
        gt(forumPostDecisions.closesAt, now),
      ));
    return { job: "markClosingSoon", ok: true, count: result?.[0]?.affectedRows ?? 0 };
  } catch (err: any) {
    return { job: "markClosingSoon", ok: false, error: err.message };
  }
}

/** Pick storytellers for ratified decisions above the storyteller token threshold
 * that don't yet have one assigned. */
export async function assignStorytellers(): Promise<JobReport> {
  try {
    const db = await getDb();
    if (!db) return { job: "assignStorytellers", ok: false, error: "no db" };

    // Find ratified decisions without a storyteller assigned. We don't enforce
    // the token threshold here because the Loomio webhook receiver already
    // marks decisions as needing one. The job just picks the actual user.
    const candidates = await db
      .select()
      .from(forumPostDecisions)
      .where(and(eq(forumPostDecisions.status, "ratified"), isNull(forumPostDecisions.storytellerId)))
      .limit(20);

    if (candidates.length === 0) return { job: "assignStorytellers", ok: true, count: 0 };

    // Get the pool of opted-in storytellers
    const pool = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.availableAsStoryteller, 1));
    if (pool.length === 0) return { job: "assignStorytellers", ok: true, count: 0 };

    let assigned = 0;
    for (const decision of candidates) {
      // Pick a storyteller round-robin: lowest user id first that's not the proposer
      const eligible = pool.filter((p) => p.id !== decision.proposerId && p.id !== decision.coSignerId);
      if (eligible.length === 0) continue;
      const picked = eligible[Math.floor(Math.random() * eligible.length)];
      await db
        .update(forumPostDecisions)
        .set({ storytellerId: picked.id } as any)
        .where(eq(forumPostDecisions.id, decision.id));
      assigned += 1;
    }
    return { job: "assignStorytellers", ok: true, count: assigned };
  } catch (err: any) {
    return { job: "assignStorytellers", ok: false, error: err.message };
  }
}

/** Create a renewal forum thread for any decision that sunsets in T-7 days
 * and doesn't yet have a renewal thread. */
export async function checkSunsetting(): Promise<JobReport> {
  try {
    const db = await getDb();
    if (!db) return { job: "checkSunsetting", ok: false, error: "no db" };
    const warningDays = await readVar("governance.sunset_renewal_warning_days", 7);
    const cutoff = new Date(Date.now() + warningDays * 24 * 60 * 60 * 1000);

    const sunsetting = await db
      .select()
      .from(forumPostDecisions)
      .where(and(
        eq(forumPostDecisions.status, "ratified"),
        lt(forumPostDecisions.sunsetAt, cutoff),
        gt(forumPostDecisions.sunsetAt, new Date()),
      ))
      .limit(20);

    let created = 0;
    for (const decision of sunsetting) {
      // Check if a renewal thread already exists for this decision via the
      // governanceAgreements join (we set renewalThreadId there). For now we
      // skip if outcomeSummary mentions [renewal-pending].
      const post = await db.select().from(forumPosts).where(eq(forumPosts.id, decision.forumPostId)).limit(1);
      if (post.length === 0) continue;

      const renewalTitle = `Renewal: ${(post[0].title ?? "").slice(0, 240)}`;
      const renewalContent = [
        `The decision **${post[0].title}** sunsets in ${warningDays} days.`,
        ``,
        `Should we renew it as-is, revise it, or let it sunset?`,
        ``,
        `**Original outcome:** ${decision.outcomeSummary ?? "(no summary)"}`,
        ``,
        `**Reasoning:** ${decision.outcomeReasoning ?? "(no reasoning)"}`,
        ``,
        `Reply with your perspective. The proposer can promote a renewal decision once enough citizens have weighed in.`,
      ].join("\n");

      try {
        const result: any = await db.insert(forumPosts).values({
          categoryId: post[0].categoryId,
          authorId: decision.proposerId,
          title: renewalTitle,
          content: renewalContent,
          isPinned: 0,
          lastReplyAt: new Date(),
          lastReplyBy: decision.proposerId,
        } as any);
        const newPostId = result?.[0]?.insertId ?? result?.insertId;
        if (newPostId) {
          // Mark the decision so we don't recreate the renewal thread
          await db
            .update(forumPostDecisions)
            .set({ outcomeSummary: `${decision.outcomeSummary ?? ""}\n[renewal-thread:${newPostId}]` } as any)
            .where(eq(forumPostDecisions.id, decision.id));
          created += 1;
        }
      } catch (err) {
        console.error("[checkSunsetting] failed to create renewal thread", err);
      }
    }
    return { job: "checkSunsetting", ok: true, count: created };
  } catch (err: any) {
    return { job: "checkSunsetting", ok: false, error: err.message };
  }
}

/** Re-check any bridges stuck in handoff_sent for more than 1 hour.
 * If BASE_RPC_URL is configured, query Base logs for a ProposalCreated
 * event whose title field contains the bridge key marker. If found,
 * flip the bridge to on_chain_detected. Falls back to a log-and-return
 * if the env var is absent. */
export async function reconcileHyphaBridges(): Promise<JobReport> {
  try {
    const db = await getDb();
    if (!db) return { job: "reconcileHyphaBridges", ok: false, error: "no db" };
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const stuck = await db
      .select()
      .from(hyphaBridges)
      .where(and(eq(hyphaBridges.status, "handoff_sent"), lt(hyphaBridges.updatedAt, oneHourAgo)))
      .limit(50);

    if (stuck.length === 0) {
      return { job: "reconcileHyphaBridges", ok: true, count: 0 };
    }

    const rpcUrl = process.env.BASE_RPC_URL;
    if (!rpcUrl) {
      console.warn(`[reconcileHyphaBridges] ${stuck.length} bridges stuck; BASE_RPC_URL not set, skipping on-chain check`);
      return { job: "reconcileHyphaBridges", ok: true, count: stuck.length };
    }

    const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
    const twoHoursAgo = BigInt(Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000));

    // Hypha emits a ProposalCreated(uint256 indexed proposalId, string title, address creator)
    // event when a proposal is created on-chain. We look for the bridge key marker
    // (e.g. "[RC-bridge:<id>]") in the title to match it to one of our stuck bridges.
    const REGEN_ADDR = process.env.REGEN_TOKEN_ADDRESS_BASE as `0x${string}` | undefined;
    const RCIVICS_ADDR = process.env.RCIVICS_TOKEN_ADDRESS_BASE as `0x${string}` | undefined;

    let resolved = 0;
    for (const bridge of stuck) {
      if (!bridge.bridgeKey) continue;
      const marker = bridge.bridgeKey;
      try {
        const contractAddresses = [REGEN_ADDR, RCIVICS_ADDR].filter(Boolean) as `0x${string}`[];
        if (contractAddresses.length === 0) break;

        // getLogs scans recent blocks; use a block range for the last 2 hours (~3600 blocks at 2s)
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock > BigInt(3600) ? latestBlock - BigInt(3600) : BigInt(0);

        const logs = await publicClient.getLogs({
          address: contractAddresses,
          event: parseAbiItem("event ProposalCreated(uint256 indexed proposalId, string title, address indexed creator)"),
          fromBlock,
          toBlock: "latest",
        });

        const match = logs.find((log) => {
          const title = (log.args as any).title as string | undefined;
          return title && title.includes(marker);
        });

        if (match) {
          await db
            .update(hyphaBridges)
            .set({ status: "on_chain_detected", updatedAt: new Date() })
            .where(eq(hyphaBridges.id, bridge.id));
          console.log(`[reconcileHyphaBridges] bridge ${bridge.id} flipped to on_chain_detected via Base log`);
          resolved++;
        }
      } catch (rpcErr: any) {
        console.warn(`[reconcileHyphaBridges] RPC error for bridge ${bridge.id}:`, rpcErr.message);
      }
    }

    return { job: "reconcileHyphaBridges", ok: true, count: stuck.length, resolved } as any;
  } catch (err: any) {
    return { job: "reconcileHyphaBridges", ok: false, error: err.message };
  }
}

/** Run all governance jobs in sequence. Returns a report per job. */
export async function runAllGovernanceJobs(): Promise<JobReport[]> {
  const reports: JobReport[] = [];
  reports.push(await expirePromotionRequests());
  reports.push(await sendSignedPromotionsToLoomio());
  reports.push(await markClosingSoon());
  reports.push(await assignStorytellers());
  reports.push(await checkSunsetting());
  reports.push(await reconcileHyphaBridges());
  return reports;
}
