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
 *  - BROADCAST: the hub does not know which fork owns a marker; every
 *    active fork gets the outcome, and the fork-side receiver discards
 *    markers that are not its own with an inert 200. (Fork receivers are
 *    idempotent by contract — the game-amora receiver replays cleanly.)
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
import { getDb } from "../../db";
import { governanceForkRelays, governanceRelayDeliveries } from "../../../drizzle/schema";
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
 * Queue one delivery per active fork for a terminal gm-marked event.
 * Safe to call for EVERY event — non-terminal and unmarked events return
 * without touching the database.
 */
export async function maybeQueueForkRelay(event: ForkRelayEvent): Promise<number> {
  const marker = extractGmMarker(event.title);
  if (!marker) return 0;
  const outcome = terminalOutcomeFor(event);
  if (!outcome) return 0;
  const db = await getDb();
  if (!db) return 0;
  const forks = await db
    .select()
    .from(governanceForkRelays)
    .where(eq(governanceForkRelays.active, true));
  let queued = 0;
  for (const fork of forks) {
    try {
      await db.insert(governanceRelayDeliveries).values({
        forkId: (fork as any).id,
        marker,
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
  if (queued > 0) log.info(`fork relay: queued gm:${marker} ${outcome} for ${queued} fork(s)`);
  return queued;
}

/**
 * Deliver everything owed and eligible. Called opportunistically after each
 * incoming Alchemy webhook; a failed fork keeps its row and its backoff.
 */
export async function flushForkRelays(now: Date = new Date()): Promise<{ delivered: number; failed: number }> {
  const db = await getDb();
  if (!db) return { delivered: 0, failed: 0 };
  const pending = await db
    .select()
    .from(governanceRelayDeliveries)
    .where(isNull(governanceRelayDeliveries.deliveredAt))
    .limit(100);
  let delivered = 0;
  let failed = 0;
  for (const row of pending as any[]) {
    if (!retryEligible(row.attempts, row.lastAttemptAt, now)) continue;
    const [fork] = await db
      .select()
      .from(governanceForkRelays)
      .where(and(eq(governanceForkRelays.id, row.forkId), eq(governanceForkRelays.active, true)))
      .limit(1);
    if (!fork) continue; // deactivated fork keeps its rows dormant, never errors
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
  return { delivered, failed };
}
