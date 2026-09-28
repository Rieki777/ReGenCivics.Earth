/**
 * Funding deadline pings (funding engine Phase 2, plan v1.3 section 9).
 *
 * On every hourly admin-automations tick, each funder row with a deadline in
 * the next 21 days gets a ping to Rye's second-brain Telegram bot at 21, 7 and
 * 2 days out, exactly once each. A row already submitted, in review, decided
 * or parked gets none. One message per tick carries every new ping, with each
 * program's packet counts, so a ping says what is left as well as when.
 *
 * Exactly once: the job claims a ping by inserting its funding_deadline_pings
 * row (unique on pipelineId, deadlineAt, threshold) before sending. A second
 * runner's insert hits the key and skips; a failed send deletes the claims so
 * the next tick retries. Only the tightest window a deadline is in is pinged:
 * a row added five days out gets its 7-day ping, never a late 21-day one.
 */
import { and, eq, gt, inArray, lte } from "drizzle-orm";
import { getDb } from "../db";
import { appQuestions, fundingDeadlinePings, fundingPipeline } from "../../drizzle/schema";
import { notifyOwner } from "../webhooks/telegram-brain";
import { confirmedNumbers, lintQuestion, summarizePacket, type PacketSummary } from "./kit";

export const PING_THRESHOLDS = [21, 7, 2] as const;
export type PingThreshold = (typeof PING_THRESHOLDS)[number];

const DAY_MS = 86_400_000;
/** Rows at these statuses are past the point a deadline reminder helps. */
const SETTLED = new Set(["submitted", "in_review", "awarded", "declined", "parked"]);

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** The tightest ping window a deadline is in, or null when it has passed or is more than 21 days out. */
export function currentThreshold(deadlineAt: Date, now: Date): PingThreshold | null {
  const left = deadlineAt.getTime() - now.getTime();
  if (left <= 0) return null;
  for (const t of [2, 7, 21] as const) if (left <= t * DAY_MS) return t;
  return null;
}

export interface DeadlineRow {
  id: number;
  name: string;
  cycle: string | null;
  appStatus: string;
  deadlineAt: Date;
}

export interface PlannedPing {
  pipelineId: number;
  name: string;
  cycle: string | null;
  deadlineAt: Date;
  threshold: PingThreshold;
}

export function pingKey(pipelineId: number, deadlineAt: Date, threshold: number): string {
  return `${pipelineId}:${deadlineAt.toISOString()}:${threshold}`;
}

/** The pings due now that have not been sent, soonest deadline first. Pure. */
export function planPings(rows: DeadlineRow[], sent: Set<string>, now: Date): PlannedPing[] {
  const out: PlannedPing[] = [];
  for (const r of rows) {
    if (SETTLED.has(r.appStatus)) continue;
    const threshold = currentThreshold(r.deadlineAt, now);
    if (!threshold) continue;
    if (sent.has(pingKey(r.id, r.deadlineAt, threshold))) continue;
    out.push({ pipelineId: r.id, name: r.name, cycle: r.cycle, deadlineAt: r.deadlineAt, threshold });
  }
  return out.sort((a, b) => a.deadlineAt.getTime() - b.deadlineAt.getTime());
}

function pacificLabel(d: Date): string {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${label} PT`;
}

/** The Telegram message for one tick's pings. Pure. */
export function pingMessage(pings: PlannedPing[], packets: Map<number, PacketSummary>, now: Date): string {
  const lines = ["Funding deadlines", ""];
  for (const p of pings) {
    const days = Math.ceil((p.deadlineAt.getTime() - now.getTime()) / DAY_MS);
    const head = `${days} day${days === 1 ? "" : "s"}: ${p.name}${p.cycle ? ` ${p.cycle}` : ""}, due ${pacificLabel(p.deadlineAt)}.`;
    const s = packets.get(p.pipelineId);
    const packet = s
      ? ` Packet: ${s.answered} of ${s.questions} answered, ${s.requiredMissing} required still empty, ${s.withErrors} to fix.`
      : "";
    lines.push(head + packet);
  }
  lines.push("", "Open /admin/funding, Applications. Submitting stays with you.");
  return lines.join("\n");
}

/** True for MySQL's duplicate-key error, however the driver wraps it. */
function isDuplicateKey(err: unknown): boolean {
  const e = err as { code?: string; errno?: number; cause?: { code?: string; errno?: number } };
  return e?.code === "ER_DUP_ENTRY" || e?.errno === 1062 || e?.cause?.code === "ER_DUP_ENTRY" || e?.cause?.errno === 1062;
}

/** Packet counts for each pinged row, from the questions of its current cycle. */
async function packetSummaries(db: Db, pings: PlannedPing[]): Promise<Map<number, PacketSummary>> {
  const ids = [...new Set(pings.map((p) => p.pipelineId))];
  const out = new Map<number, PacketSummary>();
  if (!ids.length) return out;
  const questions = await db.select().from(appQuestions).where(inArray(appQuestions.pipelineId, ids));
  if (!questions.length) return out;
  const confirmed = await confirmedNumbers(db);
  for (const p of pings) {
    const rows = questions.filter((q) => q.pipelineId === p.pipelineId && (!p.cycle || q.cycle === p.cycle));
    if (rows.length) out.set(p.pipelineId, summarizePacket(rows, rows.map((q) => lintQuestion(q, confirmed))));
  }
  return out;
}

export interface DeadlineDeps {
  now: () => Date;
  send: (text: string) => Promise<boolean>;
}

/** The job. Returns the summary stored on the automation row. */
export async function runFundingDeadlines(deps: Partial<DeadlineDeps> = {}): Promise<string> {
  const d: DeadlineDeps = { now: () => new Date(), send: (text) => notifyOwner(text), ...deps };
  const db = await getDb();
  if (!db) return "Database unavailable.";
  const now = d.now();
  const horizon = new Date(now.getTime() + 21 * DAY_MS);

  const found = await db
    .select({
      id: fundingPipeline.id,
      name: fundingPipeline.name,
      cycle: fundingPipeline.cycle,
      appStatus: fundingPipeline.appStatus,
      deadlineAt: fundingPipeline.deadlineAt,
    })
    .from(fundingPipeline)
    .where(and(gt(fundingPipeline.deadlineAt, now), lte(fundingPipeline.deadlineAt, horizon)));
  const rows: DeadlineRow[] = found.flatMap((r) => (r.deadlineAt instanceof Date ? [{ ...r, deadlineAt: r.deadlineAt }] : []));
  if (!rows.length) return "No deadlines in the next 21 days.";

  const sentRows = await db
    .select()
    .from(fundingDeadlinePings)
    .where(inArray(fundingDeadlinePings.pipelineId, rows.map((r) => r.id)));
  const sent = new Set(sentRows.map((s) => pingKey(s.pipelineId, new Date(s.deadlineAt), s.threshold)));
  const planned = planPings(rows, sent, now);
  if (!planned.length) return `Nothing new: ${rows.length} deadline(s) in the next 21 days, every ping due so far already sent.`;

  // Claim before sending, so an overlapping run cannot send the same ping.
  const claimed: PlannedPing[] = [];
  for (const p of planned) {
    try {
      await db.insert(fundingDeadlinePings).values({ pipelineId: p.pipelineId, deadlineAt: p.deadlineAt, threshold: p.threshold });
      claimed.push(p);
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
    }
  }
  if (!claimed.length) return "Another run already claimed these pings.";

  const packets = await packetSummaries(db, claimed);
  const ok = await d.send(pingMessage(claimed, packets, now));
  if (!ok) {
    // Release the claims so the next tick tries again: late by an hour beats missed.
    for (const p of claimed) {
      await db
        .delete(fundingDeadlinePings)
        .where(
          and(
            eq(fundingDeadlinePings.pipelineId, p.pipelineId),
            eq(fundingDeadlinePings.deadlineAt, p.deadlineAt),
            eq(fundingDeadlinePings.threshold, p.threshold),
          ),
        );
    }
    return `Not sent (telegram brain bot unavailable): ${claimed.length} ping(s) will retry next hour.`;
  }
  return `Sent ${claimed.length} ping(s): ${claimed.map((p) => `${p.name}${p.cycle ? ` ${p.cycle}` : ""} at ${p.threshold} days`).join(", ")}.`;
}
