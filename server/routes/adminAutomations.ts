/**
 * adminAutomations: standing routines the executive-assistant layer runs for
 * the CEO on a cadence.
 *
 * v1 routines are read-only digests that PREPARE an update, so nothing mutates
 * on a timer (the safety floor again). Three types ship:
 *   - briefing_digest : a quick deterministic state-of-the-ecosystem summary.
 *   - attention_digest: what currently needs the CEO's review.
 *   - brain_morning   : the second brain's morning message, sent to Rye's
 *                       Telegram bot with Done / Park buttons per due item.
 *                       It reads and sends; the buttons are what change state,
 *                       and they go back through the receiver's owner check.
 *
 * The cron endpoint (POST /api/cron/admin-automations) calls runDueAutomations()
 * which runs every enabled automation that is due. runNow lets the admin trigger
 * one immediately. Results are stored on the row (lastResult) and surfaced in
 * the Overview.
 */
import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../db";
import { adminAutomations } from "../../drizzle/schema";
import { computeEcosystemSnapshot } from "./admin";
import { runRegistryAction } from "./adminActions";
import {
  summarizeToday,
  triageQueue,
  weekMetrics,
  type BrainItem,
  type TodaySummary,
  type WeekMetrics,
} from "../lib/brain-items";
import { notifyOwner } from "../webhooks/telegram-brain";
import { ENV } from "../_core/env";

type AutomationRow = typeof adminAutomations.$inferSelect;

// ── The second brain's morning message ───────────────────────────────────────
//
// A standing routine like the digests, but gated on wall-clock time rather than
// on time-since-last-run: it fires on the first hourly cron tick at or after
// 08:00 America/Los_Angeles, once per calendar day in that zone. A `daily`
// cadence would drift an hour later every time the cron ran late, and a morning
// message that arrives at 3pm is worse than none.
//
// `brain_morning` is not in the Drizzle enum for admin_automations.type (that
// file is owned elsewhere), so the type is read as a widened string here. The
// database enum gains the value in drizzle/0231_admin_automation_brain_morning.sql
// and the row is seeded by scripts/seed-brain-morning-automation.ts.

export const BRAIN_MORNING_TYPE = "brain_morning";
const BRAIN_MORNING_HOUR_PT = 8;
const BRAIN_MORNING_ZONE = "America/Los_Angeles";

/** Calendar day (YYYY-MM-DD) and 0-23 hour of an instant, in Rye's zone. */
export function ptDayHour(at: Date): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAIN_MORNING_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** True on the first tick at or after 08:00 PT on a day it has not run yet. */
export function morningDue(now: Date, lastRunAt: Date | null): boolean {
  const here = ptDayHour(now);
  if (here.hour < BRAIN_MORNING_HOUR_PT) return false;
  if (!lastRunAt) return true;
  return ptDayHour(new Date(lastRunAt)).day !== here.day;
}

/** Up to five "probably done" questions a day, offered with the morning message. */
export const MORNING_TRIAGE_LIMIT = 5;

/**
 * The message and its buttons. Pure, so the copy and the callback data are
 * testable without a bot. The callback data matches what the receiver in
 * server/webhooks/telegram-brain.ts already handles: `s:<id>:done`,
 * `s:<id>:parked`, and `t:<id>:done|open|unsure` for the triage rows. Titles
 * are item titles, which are untrusted text, so they are only ever rendered as
 * label text and never parsed.
 *
 * It leads with what CLOSED, not with what is waiting. The open count has gone
 * up for months and reading it first teaches Rye to stop opening the message;
 * the week's closes and promotions are the number this whole command center
 * exists to move (addendum 2, item 8). ReGen and personal are counted apart,
 * because a personal errand is not ReGen progress (ADDENDUM-1 item 1).
 */
export function brainMorningMessage(
  t: TodaySummary,
  week: WeekMetrics,
  triage: BrainItem[] = [],
): {
  text: string;
  replyMarkup?: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> };
} {
  const realm = t.openByRealm ?? { regen: 0, personal: 0 };
  const counts = `${t.raw} to shape, ${t.ready} ready, ${t.inFlight} in flight, ${t.claimed} claimed done`;
  const shown = t.due.slice(0, 5);
  const asked = triage.slice(0, MORNING_TRIAGE_LIMIT);

  const lines: string[] = [
    `Morning. ${week.closedThisWeek} closed and ${week.promotedThisWeek} promoted this week.`,
    `Open: ${realm.regen} regen, ${realm.personal} personal. ${counts}.`,
    "",
    ...(shown.length
      ? ["Due today", ...shown.map((i) => `#${i.id} ${i.title}`)]
      : ["Nothing is due today."]),
  ];
  if (asked.length) {
    lines.push(
      "",
      "Probably already done? Answer and they leave the list.",
      ...asked.map((i) => `#${i.id} ${i.title}`),
    );
  }

  const inline_keyboard = [
    ...shown.map((i) => [
      { text: `#${i.id} Done`, callback_data: `s:${i.id}:done` },
      { text: `#${i.id} Park`, callback_data: `s:${i.id}:parked` },
    ]),
    ...asked.map((i) => [
      { text: `#${i.id} Done`, callback_data: `t:${i.id}:done` },
      { text: `#${i.id} Still open`, callback_data: `t:${i.id}:open` },
      { text: `#${i.id} Not sure`, callback_data: `t:${i.id}:unsure` },
    ]),
  ];
  const text = lines.join("\n");
  if (!inline_keyboard.length) return { text };
  return { text, replyMarkup: { inline_keyboard } };
}

export interface BrainMorningDeps {
  ownerId: number;
  summarize: (ownerId: number) => Promise<TodaySummary>;
  week: (ownerId: number) => Promise<WeekMetrics>;
  triage: (ownerId: number, limit: number) => Promise<BrainItem[]>;
  send: (text: string, replyMarkup?: Record<string, unknown>) => Promise<boolean>;
}

/**
 * Returns the summary string stored on the row. The run is recorded even when
 * the send fails, so a missing bot token costs one morning message and shows up
 * as text in the Overview rather than retrying every hour and arriving at 3pm.
 */
export async function runBrainMorning(deps?: Partial<BrainMorningDeps>): Promise<string> {
  const d: BrainMorningDeps = {
    ownerId: ENV.ownerUserId,
    summarize: summarizeToday,
    week: weekMetrics,
    triage: triageQueue,
    send: notifyOwner,
    ...deps,
  };
  if (!d.ownerId) return "Not sent: OWNER_USER_ID is unset.";
  const t = await d.summarize(d.ownerId);
  const w = await d.week(d.ownerId);
  const triage = await d.triage(d.ownerId, MORNING_TRIAGE_LIMIT);
  const { text, replyMarkup } = brainMorningMessage(t, w, triage);
  const sent = await d.send(text, replyMarkup);
  const counts =
    `${w.closedThisWeek} closed this week, ${w.promotedThisWeek} promoted, ` +
    `${t.raw} to shape, ${t.ready} ready, ${t.inFlight} in flight, ${t.claimed} claimed done, ` +
    `${t.due.length} due, ${triage.length} to triage`;
  return sent ? `Sent: ${counts}.` : `Not sent (telegram brain bot unavailable): ${counts}.`;
}

/** Build the digest text for an automation from the current snapshot. */
async function runDigest(type: string): Promise<string> {
  const s = await computeEcosystemSnapshot();
  if (!s) return "Snapshot unavailable.";

  if (type === "attention_digest") {
    const parts = [
      `${s.applications.pending} applications pending review`,
      `${s.investors.new} new investors`,
      `${s.inquiries.needsReview} inquiries to review`,
      `${s.moderation.pendingReports} moderation reports`,
      `${s.governance.openProposals} open proposals`,
    ];
    return `Needs your attention: ${parts.join(", ")}.`;
  }

  // briefing_digest (default)
  return [
    `Applications ${s.applications.total} (${s.applications.pending} pending, ${s.applications.active} active).`,
    `Investors ${s.investors.total} (${s.investors.new} new, ${s.investors.committed} committed).`,
    `Inquiries needing review ${s.inquiries.needsReview}.`,
    `Community ${s.community.players} players, ${s.community.forumPosts} posts.`,
    `This week +${s.weekly.newApplications} applications, +${s.weekly.newForumPosts + s.weekly.newForumReplies} forum activity, +${s.weekly.newPlayers} players.`,
  ].join(" ");
}

/** Run one automation and persist the result. Returns the summary. */
async function runAutomation(auto: AutomationRow): Promise<string> {
  const db = await getDb();
  // Widened: brain_morning is a database enum value that the Drizzle type does
  // not carry yet, so a direct comparison would be a type error.
  const type: string = auto.type;
  let summary: string;
  if (type === BRAIN_MORNING_TYPE) {
    summary = await runBrainMorning();
  } else if (auto.type === "registry_action") {
    // The standing automation row is the implicit approval; the registry
    // helper still rejects blocked-tier actions and zod-validates input.
    if (!auto.actionId) {
      summary = "Automation has no actionId; cannot run a registry action.";
    } else {
      try {
        const input = (auto.actionInput as Record<string, unknown> | null) ?? {};
        const result = await runRegistryAction(auto.actionId, input, { adminUserId: auto.createdBy });
        summary = result.summary;
      } catch (e) {
        summary = `Registry action failed: ${(e as Error)?.message ?? "error"}`;
      }
    }
  } else {
    summary = await runDigest(auto.type);
  }
  if (db) {
    await db
      .update(adminAutomations)
      .set({ lastRunAt: new Date(), lastResult: summary, runCount: (auto.runCount ?? 0) + 1 })
      .where(eq(adminAutomations.id, auto.id));
  }
  return summary;
}

/** Whether this row is due now. brain_morning has its own wall-clock gate. */
export function automationDue(
  type: string,
  cadence: string,
  lastRunAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (type === BRAIN_MORNING_TYPE) return morningDue(now, lastRunAt);
  return cadenceDue(cadence, lastRunAt, now);
}

function cadenceDue(cadence: string, lastRunAt: Date | null, now: Date = new Date()): boolean {
  if (!lastRunAt) return true;
  const ms = now.getTime() - new Date(lastRunAt).getTime();
  if (cadence === "hourly") return ms >= 60 * 60 * 1000;
  if (cadence === "weekly") return ms >= 7 * 24 * 60 * 60 * 1000;
  if (cadence === "every_other_day") return ms >= 48 * 60 * 60 * 1000;
  return ms >= 24 * 60 * 60 * 1000; // daily
}

/** Cron entry point: run every enabled automation whose cadence is due. */
export async function runDueAutomations(): Promise<{ ran: number; results: { id: number; name: string; summary: string }[] }> {
  const db = await getDb();
  if (!db) return { ran: 0, results: [] };
  const all = await db.select().from(adminAutomations).where(eq(adminAutomations.enabled, 1));
  const results: { id: number; name: string; summary: string }[] = [];
  for (const auto of all) {
    if (!automationDue(auto.type, auto.cadence, auto.lastRunAt ?? null)) continue;
    try {
      const summary = await runAutomation(auto);
      results.push({ id: auto.id, name: auto.name, summary });
    } catch (e) {
      results.push({ id: auto.id, name: auto.name, summary: `Failed: ${(e as Error)?.message ?? "error"}` });
    }
  }
  return { ran: results.length, results };
}

function adminId(ctx: { user?: { id?: number } }): number {
  const id = ctx.user?.id;
  if (!id) throw new TRPCError({ code: "FORBIDDEN", message: "Admin identity required." });
  return id;
}

export const adminAutomationsRouter = router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(adminAutomations).orderBy(desc(adminAutomations.createdAt));
  }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(2).max(160),
      type: z.enum(["briefing_digest", "attention_digest"]),
      cadence: z.enum(["hourly", "daily", "every_other_day", "weekly"]).default("daily"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.insert(adminAutomations).values({
        name: input.name,
        type: input.type,
        cadence: input.cadence,
        createdBy: adminId(ctx),
      });
      return { ok: true as const };
    }),

  toggle: adminProcedure
    .input(z.object({ id: z.number().int().positive(), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(adminAutomations).set({ enabled: input.enabled ? 1 : 0 }).where(eq(adminAutomations.id, input.id));
      return { ok: true as const };
    }),

  remove: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(adminAutomations).where(eq(adminAutomations.id, input.id));
      return { ok: true as const };
    }),

  runNow: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [auto] = await db.select().from(adminAutomations).where(eq(adminAutomations.id, input.id)).limit(1);
      if (!auto) throw new TRPCError({ code: "NOT_FOUND", message: "Automation not found" });
      const summary = await runAutomation(auto);
      return { ok: true as const, summary };
    }),
});
