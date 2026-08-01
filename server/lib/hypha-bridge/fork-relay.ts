/**
 * Governance fork relay (ADR-46): the hub half of the cross-platform
 * governance loop.
 *
 * Forks of the village platform (game-amora and its descendants) put a
 * `[gm:<id>]` marker in the TITLE of their Hypha mechanics proposals. Those
 * markers never match this repo's own `[rc:<bridgeKey>]` bridges, so this
 * module is purely ADDITIVE to the webhook receiver: when a terminal
 * governance event carrying a gm-marker lands, one delivery row is queued
 * per registered fork, then flushed — POST to the fork's callback with its
 * shared secret as `x-governance-hub-secret`.
 *
 * Delivery discipline:
 *  - MATCHING, two ways: (1) a `[gm:]` TITLE marker — but real decoded
 *    governance logs carry only a numeric proposalId, never a title — so
 *    (2) forks LINK their marker to the on-chain proposal id up front
 *    (POST /api/webhooks/governance-fork-link, authenticated with the same
 *    per-fork secret the relay signs deliveries with; the founder pastes
 *    the Hypha proposal URL into their proposal page and the fork calls
 *    home). Title-marked events BROADCAST to every active fork (the hub
 *    doesn't know the owner; fork receivers discard foreign markers with an
 *    inert 200 and are idempotent by contract). Linked events deliver to
 *    exactly the fork(s) that registered the link.
 *  - AT-LEAST-ONCE: a delivery row exists until a 2xx acknowledges it.
 *    Retries back off exponentially (5 min doubling, capped at 6 h) and are
 *    flushed opportunistically on every incoming Alchemy webhook — the
 *    chain's own heartbeat — so no new scheduler is introduced.
 *  - IDEMPOTENT ENQUEUE: (forkId, marker, outcome) is unique, so Alchemy
 *    redeliveries queue nothing twice.
 *
 * The pure decision functions are exported for tests; only the enqueue/flush
 * pair touches the database.
 */
import type { Express, Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import { getDb } from "../../db";
import { governanceForkRelays, governanceRelayDeliveries, governanceForkMarkerLinks } from "../../../drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";
import { logger } from "../../_core/logger";

const log = logger("fork-relay");

/**
 * The structural slice of the receiver's normalized event this module needs.
 * Deliberately NOT imported from webhook-receiver (its interface is local):
 * the relay's contract is these five fields, nothing more.
 */
export interface ForkRelayEvent {
  type: string;
  title?: string;
  proposalId?: string;
  txHash?: string;
  /** ProposalExecuted carries the outcome; passed=false is a rejection. */
  passed?: boolean;
}

const BASESCAN_TX_BASE = "https://basescan.org/tx/";
const RELAY_TIMEOUT_MS = 10_000;
const BACKOFF_BASE_MS = 5 * 60 * 1000;
const BACKOFF_CAP_MS = 6 * 60 * 60 * 1000;

/** The fork-side marker: [gm:<id>] anywhere in a title. Liberal in
 *  position, strict in shape — mirrors the fork's extractor exactly. */
export function extractGmMarker(title: string | undefined | null): string | null {
  const m = /\[gm:([a-z0-9-]+)\]/i.exec(String(title ?? ""));
  return m ? m[1] : null;
}

/**
 * Normalize a link-request marker: accepts "[gm:x]" or bare "x", returns the
 * bare marker, or null when the shape is wrong. Same character discipline as
 * the title extractor so the two can never diverge.
 */
export function normalizeGmMarkerInput(input: unknown): string | null {
  const s = String(input ?? "").trim();
  const bracketed = extractGmMarker(s);
  if (bracketed) return bracketed;
  return /^[a-z0-9-]{1,64}$/i.test(s) ? s : null;
}

/**
 * Map a RAW receiver event to a terminal outcome, or null when the event is
 * not terminal. Note: handleHyphaEvent normalizes Executed+passed=false to
 * ProposalRejected on its own local copy AFTER this module sees the event,
 * so both shapes are handled here.
 */
export function terminalOutcomeFor(event: ForkRelayEvent): "passed" | "failed" | null {
  if (event.type === "ProposalExecuted") return event.passed === false ? "failed" : "passed";
  if (event.type === "ProposalRejected") return "failed";
  return null;
}

/** Whether an undelivered row has waited out its backoff window. */
export function retryEligible(attempts: number, lastAttemptAt: Date | null, now: Date): boolean {
  if (attempts === 0 || !lastAttemptAt) return true;
  const wait = Math.min(BACKOFF_BASE_MS * 2 ** (attempts - 1), BACKOFF_CAP_MS);
  return now.getTime() - lastAttemptAt.getTime() >= wait;
}

/** The exact body a fork's receiver contract expects. */
export function buildDeliveryPayload(d: {
  marker: string;
  outcome: "passed" | "failed";
  txHash: string | null;
  hyphaProposalId: string | null;
  basescanUrl: string | null;
}) {
  return {
    marker: `[gm:${d.marker}]`,
    outcome: d.outcome,
    txHash: d.txHash ?? undefined,
    hyphaProposalId: d.hyphaProposalId ?? undefined,
    url: d.basescanUrl ?? undefined,
  };
}

/**
 * Queue deliveries for a terminal governance event. Safe to call for EVERY
 * event — non-terminal and unmatchable events return without touching the
 * database.
 *
 * Target resolution, in order:
 *  1. `[gm:]` title marker → BROADCAST to every active fork (test/manual
 *     path; real decoded logs never carry titles).
 *  2. A registered marker link for the event's on-chain proposalId →
 *     deliver to exactly the fork(s) that linked it. This is the production
 *     path: the chain gives us only the numeric id.
 */
export async function maybeQueueForkRelay(event: ForkRelayEvent): Promise<number> {
  const outcome = terminalOutcomeFor(event);
  if (!outcome) return 0;
  const db = await getDb();
  if (!db) return 0;

  // (forkId, marker) pairs to enqueue.
  const targets: Array<{ forkId: number; marker: string }> = [];
  const titleMarker = extractGmMarker(event.title);
  if (titleMarker) {
    const forks = await db
      .select()
      .from(governanceForkRelays)
      .where(eq(governanceForkRelays.active, true));
    for (const fork of forks) targets.push({ forkId: (fork as any).id, marker: titleMarker });
  } else if (event.proposalId) {
    const links = await db
      .select()
      .from(governanceForkMarkerLinks)
      .where(eq(governanceForkMarkerLinks.hyphaProposalId, String(event.proposalId)));
    for (const link of links as any[]) {
      // Only deliver to forks that are still active on the roster.
      const [fork] = await db
        .select()
        .from(governanceForkRelays)
        .where(and(eq(governanceForkRelays.id, link.forkId), eq(governanceForkRelays.active, true)))
        .limit(1);
      if (fork) targets.push({ forkId: link.forkId, marker: link.marker });
    }
  }
  if (targets.length === 0) return 0;

  let queued = 0;
  for (const t of targets) {
    try {
      await db.insert(governanceRelayDeliveries).values({
        forkId: t.forkId,
        marker: t.marker,
        outcome,
        txHash: event.txHash ?? null,
        hyphaProposalId: event.proposalId ?? null,
        basescanUrl: event.txHash ? `${BASESCAN_TX_BASE}${event.txHash}` : null,
      });
      queued += 1;
    } catch {
      // Duplicate (forkId, marker, outcome): an Alchemy redelivery. Fine.
    }
  }
  if (queued > 0) log.info(`fork relay: queued ${outcome} for ${queued} fork(s)`);
  return queued;
}

/**
 * The fork-facing link endpoint: "marker X is on-chain proposal N".
 *
 * A fork calls this after its founder pastes the Hypha proposal URL into
 * their proposal page. Authenticated with the SAME per-fork secret the
 * relay signs deliveries with (x-governance-hub-secret) — no new secret
 * material. Upserts, so re-linking (corrected URL, retry after a network
 * blip) is safe.
 */
export function registerForkLinkRoute(app: Express): void {
  app.post("/api/webhooks/governance-fork-link", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "no database" });
      const secret = String(req.header("x-governance-hub-secret") ?? "");
      if (!secret) return res.status(401).json({ error: "missing x-governance-hub-secret" });

      // Find the calling fork by its secret (constant-time compare per row).
      const forks = await db.select().from(governanceForkRelays).where(eq(governanceForkRelays.active, true));
      const secretBuf = Buffer.from(secret);
      const fork = (forks as any[]).find((f) => {
        const fBuf = Buffer.from(String(f.secret ?? ""));
        return fBuf.length === secretBuf.length && timingSafeEqual(fBuf, secretBuf);
      });
      if (!fork) return res.status(401).json({ error: "unknown or inactive fork secret" });

      const marker = normalizeGmMarkerInput(req.body?.marker);
      const hyphaProposalId = String(req.body?.hyphaProposalId ?? "").trim();
      const proposalUrl = String(req.body?.proposalUrl ?? "").slice(0, 500) || null;
      if (!marker) return res.status(400).json({ error: "marker must be [gm:<id>] or a bare id" });
      if (!/^\d{1,40}$/.test(hyphaProposalId)) {
        return res.status(400).json({ error: "hyphaProposalId must be the numeric on-chain proposal id" });
      }

      await db
        .insert(governanceForkMarkerLinks)
        .values({ forkId: fork.id, marker, hyphaProposalId, proposalUrl })
        .onDuplicateKeyUpdate({ set: { hyphaProposalId, proposalUrl } });
      log.info(`fork relay: fork ${fork.id} linked gm:${marker} -> proposal ${hyphaProposalId}`);
      return res.json({ ok: true, marker, hyphaProposalId });
    } catch (err: any) {
      log.error("fork link route error", err);
      return res.status(500).json({ error: err?.message ?? "link failed" });
    }
  });
}

/**
 * Deliver everything owed and eligible. Called opportunistically after each
 * incoming Alchemy webhook; a failed fork keeps its row and its backoff.
 *
 * `deferred` counts owed rows that were NOT attempted (still inside their
 * backoff window, or belonging to a paused fork) — without it, a caller
 * cannot tell "queue empty" from "owed but waiting", and the admin flush
 * button would report a stuck queue as clear.
 */
export async function flushForkRelays(
  now: Date = new Date(),
): Promise<{ delivered: number; failed: number; deferred: number }> {
  const db = await getDb();
  if (!db) return { delivered: 0, failed: 0, deferred: 0 };
  const pending = await db
    .select()
    .from(governanceRelayDeliveries)
    .where(isNull(governanceRelayDeliveries.deliveredAt))
    .limit(100);
  let delivered = 0;
  let failed = 0;
  let deferred = 0;
  for (const row of pending as any[]) {
    if (!retryEligible(row.attempts, row.lastAttemptAt, now)) {
      deferred += 1;
      continue;
    }
    const [fork] = await db
      .select()
      .from(governanceForkRelays)
      .where(and(eq(governanceForkRelays.id, row.forkId), eq(governanceForkRelays.active, true)))
      .limit(1);
    if (!fork) {
      // deactivated fork keeps its rows dormant, never errors
      deferred += 1;
      continue;
    }
    const payload = buildDeliveryPayload(row);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RELAY_TIMEOUT_MS);
    try {
      const res = await fetch((fork as any).callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-governance-hub-secret": (fork as any).secret,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (res.ok) {
        await db
          .update(governanceRelayDeliveries)
          .set({ deliveredAt: now, lastAttemptAt: now, attempts: row.attempts + 1, lastError: null })
          .where(eq(governanceRelayDeliveries.id, row.id));
        await db
          .update(governanceForkRelays)
          .set({ lastRelayAt: now, lastStatus: `ok gm:${row.marker} ${row.outcome}` })
          .where(eq(governanceForkRelays.id, row.forkId));
        delivered += 1;
      } else {
        throw new Error(`fork answered ${res.status}`);
      }
    } catch (err: any) {
      failed += 1;
      await db
        .update(governanceRelayDeliveries)
        .set({ lastAttemptAt: now, attempts: row.attempts + 1, lastError: String(err?.message ?? err).slice(0, 300) })
        .where(eq(governanceRelayDeliveries.id, row.id));
      await db
        .update(governanceForkRelays)
        .set({ lastStatus: `error: ${String(err?.message ?? err).slice(0, 180)}` })
        .where(eq(governanceForkRelays.id, row.forkId));
      log.warn(`fork relay: delivery to fork ${row.forkId} failed (attempt ${row.attempts + 1})`, { error: String(err?.message ?? err) });
    } finally {
      clearTimeout(timer);
    }
  }
  return { delivered, failed, deferred };
}
