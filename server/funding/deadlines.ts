/**
 * Funding deadline pings (funding engine Phase 2, plan v1.3 section 9).
 *
 * On every hourly admin-automations tick, each deadline in the next 21 days
 * gets a ping to Rye's second-brain Telegram bot at 21, 7 and 2 days out,
 * exactly once each. Two kinds of deadline count:
 *   - ReGen Civics' own funder rows (audience platform or both), unless the row
 *     is already submitted, in review, decided or parked;
 *   - a grant program a land project is pursuing or drafting (Phase 5,
 *     network_grant_matches), pinged per project.
 * Programs no project is working on are never pinged: 34 open calls would
 * bury the two that matter. One message per tick carries every new ping, with
 * ReGen's packet counts where a packet exists.
 *
 * Exactly once: the job claims a ping by inserting its funding_deadline_pings
 * row (unique on program, project, deadline, threshold) before sending. A
 * second runner's insert hits the key and skips; a failed send deletes the
 * claims so the next tick retries. Only the tightest window a deadline is in
 * is pinged: a row added five days out gets its 7-day ping, never a late one.
 */
import { and, eq, gt, inArray, lte, ne } from "drizzle-orm";
import { getDb } from "../db";
import { applications, appQuestions, fundingDeadlinePings, fundingPipeline, networkGrantMatches } from "../../drizzle/schema";
import { notifyOwner } from "../webhooks/telegram-brain";
import { confirmedNumbers, lintQuestion, summarizePacket, type PacketSummary } from "./kit";

export const PING_THRESHOLDS = [21, 7, 2] as const;
export type PingThreshold = (typeof PING_THRESHOLDS)[number];

const DAY_MS = 86_400_000;
/** ReGen rows at these statuses are past the point a reminder helps. */
const SETTLED = new Set(["submitted", "in_review", "awarded", "declined", "parked"]);
/** A project's match gets pings only while the project is working on it. */
export const ACTIVE_MATCH_STATUSES = ["pursuing", "drafting"] as const;

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** The tightest ping window a deadline is in, or null when it has passed or is more than 21 days out. */
export function currentThreshold(deadlineAt: Date, now: Date): PingThreshold | null {
  const left = deadlineAt.getTime() - now.getTime();
  if (left <= 0) return null;
  for (const t of [2, 7, 21] as const) if (left <= t * DAY_MS) return t;
  return null;
}

export interface DeadlineRow {
  /** The funding_pipeline row: ReGen's funder, or the program a project pursues. */
  id: number;
  /** 0 for ReGen Civics itself; the land project's applications.id otherwise. */
  applicationId: number;
  name: string;
  cycle: string | null;
  /** For ReGen rows, the funnel status; for project rows, the match status. */
  appStatus: string;
  deadlineAt: Date;
  projectName?: string | null;
}

export interface PlannedPing {
  pipelineId: number;
  applicationId: number;
  name: string;
  cycle: string | null;
  projectName: string | null;
  deadlineAt: Date;
  threshold: PingThreshold;
}

export function pingKey(pipelineId: number, applicationId: number, deadlineAt: Date, threshold: number): string {
  return `${pipelineId}:${applicationId}:${deadlineAt.toISOString()}:${threshold}`;
}

/** The pings due now that have not been sent, soonest deadline first. Pure. */
export function planPings(rows: DeadlineRow[], sent: Set<string>, now: Date): PlannedPing[] {
  const out: PlannedPing[] = [];
  for (const r of rows) {
    if (r.applicationId === 0 && SETTLED.has(r.appStatus)) continue;
    const threshold = currentThreshold(r.deadlineAt, now);
    if (!threshold) continue;
    if (sent.has(pingKey(r.id, r.applicationId, r.deadlineAt, threshold))) continue;
    out.push({
      pipelineId: r.id,
      applicationId: r.applicationId,
      name: r.name,
      cycle: r.cycle,
      projectName: r.projectName ?? null,
      deadlineAt: r.deadlineAt,
      threshold,
    });
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

function daysText(p: PlannedPing, now: Date): string {
  const days = Math.ceil((p.deadlineAt.getTime() - now.getTime()) / DAY_MS);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** The Telegram message for one tick's pings. Pure. */
export function pingMessage(pings: PlannedPing[], packets: Map<number, PacketSummary>, now: Date): string {
  const own = pings.filter((p) => p.applicationId === 0);
  const projects = pings.filter((p) => p.applicationId !== 0);
  const lines = ["Funding deadlines"];
  if (own.length) {
    lines.push("", "ReGen Civics");
    for (const p of own) {
      const head = `${daysText(p, now)}: ${p.name}${p.cycle ? ` ${p.cycle}` : ""}, due ${pacificLabel(p.deadlineAt)}.`;
      const s = packets.get(p.pipelineId);
      const packet = s
        ? ` Packet: ${s.answered} of ${s.questions} answered, ${s.requiredMissing} required still empty, ${s.withErrors} to fix.`
        : "";
      lines.push(head + packet);
    }
  }
  if (projects.length) {
    lines.push("", "Land projects");
    for (const p of projects) {
      lines.push(`${daysText(p, now)}: ${p.projectName ?? `Project ${p.applicationId}`}, ${p.name}, due ${pacificLabel(p.deadlineAt)}.`);
    }
  }
  lines.push("", "Open /admin/funding. Submitting stays with you and with each project.");
  return lines.join("\n");
}

/** MySQL's error number, however the driver wraps it. */
function errno(err: unknown): number | undefined {
  const e = err as { errno?: number; cause?: { errno?: number } };
  return e?.errno ?? e?.cause?.errno;
}
/** Another run already claimed the ping. */
const DUPLICATE_KEY = 1062;
/** The funder row was deleted between the read and the claim. */
const MISSING_PARENT = 1452;

/** Packet counts for each of ReGen's pinged rows, from the questions of its current cycle. */
async function packetSummaries(db: Db, pings: PlannedPing[]): Promise<Map<number, PacketSummary>> {
  const own = pings.filter((p) => p.applicationId === 0);
  const ids = [...new Set(own.map((p) => p.pipelineId))];
  const out = new Map<number, PacketSummary>();
  if (!ids.length) return out;
  const questions = await db.select().from(appQuestions).where(inArray(appQuestions.pipelineId, ids));
  if (!questions.length) return out;
  const confirmed = await confirmedNumbers(db);
  for (const p of own) {
    const rows = questions.filter((q) => q.pipelineId === p.pipelineId && (!p.cycle || q.cycle === p.cycle));
    if (rows.length) out.set(p.pipelineId, summarizePacket(rows, rows.map((q) => lintQuestion(q, confirmed))));
  }
  return out;
}

/** ReGen's own rows and the programs projects are working on, with a deadline inside the window. */
async function loadDeadlineRows(db: Db, now: Date, horizon: Date): Promise<DeadlineRow[]> {
  const inWindow = and(gt(fundingPipeline.deadlineAt, now), lte(fundingPipeline.deadlineAt, horizon));
  const own = await db
    .select({
      id: fundingPipeline.id,
      name: fundingPipeline.name,
      cycle: fundingPipeline.cycle,
      appStatus: fundingPipeline.appStatus,
      deadlineAt: fundingPipeline.deadlineAt,
    })
    .from(fundingPipeline)
    .where(and(inWindow, ne(fundingPipeline.audience, "project")));
  const matched = await db
    .select({
      id: fundingPipeline.id,
      name: fundingPipeline.name,
      cycle: fundingPipeline.cycle,
      appStatus: networkGrantMatches.status,
      deadlineAt: fundingPipeline.deadlineAt,
      applicationId: networkGrantMatches.applicationId,
      projectName: applications.projectName,
    })
    .from(networkGrantMatches)
    .innerJoin(fundingPipeline, eq(fundingPipeline.id, networkGrantMatches.pipelineId))
    .innerJoin(applications, eq(applications.id, networkGrantMatches.applicationId))
    .where(and(inWindow, inArray(networkGrantMatches.status, [...ACTIVE_MATCH_STATUSES])));

  const rows: DeadlineRow[] = [];
  for (const r of own) if (r.deadlineAt instanceof Date) rows.push({ ...r, applicationId: 0, deadlineAt: r.deadlineAt });
  for (const r of matched) if (r.deadlineAt instanceof Date) rows.push({ ...r, deadlineAt: r.deadlineAt });
  return rows;
}

export interface DeadlineDeps {
  now: () => Date;
  send: (text: string) => Promise<boolean>;
  /** Tests narrow a run to their own rows; the cron passes nothing. */
  rowFilter?: (row: DeadlineRow) => boolean;
}

/** The job. Returns the summary stored on the automation row. */
export async function runFundingDeadlines(deps: Partial<DeadlineDeps> = {}): Promise<string> {
  const d: DeadlineDeps = { now: () => new Date(), send: (text) => notifyOwner(text), ...deps };
  const db = await getDb();
  if (!db) return "Database unavailable.";
  const now = d.now();
  const horizon = new Date(now.getTime() + 21 * DAY_MS);

  const rows = (await loadDeadlineRows(db, now, horizon)).filter(d.rowFilter ?? (() => true));
  if (!rows.length) return "No deadlines in the next 21 days.";

  const sentRows = await db
    .select()
    .from(fundingDeadlinePings)
    .where(inArray(fundingDeadlinePings.pipelineId, [...new Set(rows.map((r) => r.id))]));
  const sent = new Set(sentRows.map((s) => pingKey(s.pipelineId, s.applicationId, new Date(s.deadlineAt), s.threshold)));
  const planned = planPings(rows, sent, now);
  if (!planned.length) return `Nothing new: ${rows.length} deadline(s) in the next 21 days, every ping due so far already sent.`;

  // Claim before sending, so an overlapping run cannot send the same ping.
  const claimed: PlannedPing[] = [];
  for (const p of planned) {
    try {
      await db.insert(fundingDeadlinePings).values({
        pipelineId: p.pipelineId,
        applicationId: p.applicationId,
        deadlineAt: p.deadlineAt,
        threshold: p.threshold,
      });
      claimed.push(p);
    } catch (err) {
      const code = errno(err);
      if (code !== DUPLICATE_KEY && code !== MISSING_PARENT) throw err;
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
            eq(fundingDeadlinePings.applicationId, p.applicationId),
            eq(fundingDeadlinePings.deadlineAt, p.deadlineAt),
            eq(fundingDeadlinePings.threshold, p.threshold),
          ),
        );
    }
    return `Not sent (telegram brain bot unavailable): ${claimed.length} ping(s) will retry next hour.`;
  }
  const described = claimed.map((p) => `${p.projectName ? `${p.projectName}: ` : ""}${p.name}${p.cycle ? ` ${p.cycle}` : ""} at ${p.threshold} days`);
  return `Sent ${claimed.length} ping(s): ${described.join(", ")}.`;
}
