/**
 * adminAutomations: standing routines the executive-assistant layer runs for
 * the CEO on a cadence.
 *
 * v1 routines are read-only digests that PREPARE an update, so nothing mutates
 * on a timer (the safety floor again). Two types ship:
 *   - briefing_digest : a quick deterministic state-of-the-ecosystem summary.
 *   - attention_digest: what currently needs the CEO's review.
 *
 * The cron endpoint (POST /api/cron/admin-automations) calls runDueAutomations()
 * which runs every enabled automation whose cadence is due. runNow lets the
 * admin trigger one immediately. Results are stored on the row (lastResult) and
 * surfaced in the Overview.
 */
import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../db";
import { adminAutomations } from "../../drizzle/schema";
import { computeEcosystemSnapshot } from "./admin";
import { runRegistryAction } from "./adminActions";

type AutomationRow = typeof adminAutomations.$inferSelect;

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
  let summary: string;
  if (auto.type === "registry_action") {
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

function cadenceDue(cadence: string, lastRunAt: Date | null): boolean {
  if (!lastRunAt) return true;
  const ms = Date.now() - new Date(lastRunAt).getTime();
  if (cadence === "hourly") return ms >= 60 * 60 * 1000;
  if (cadence === "weekly") return ms >= 7 * 24 * 60 * 60 * 1000;
  return ms >= 24 * 60 * 60 * 1000; // daily
}

/** Cron entry point: run every enabled automation whose cadence is due. */
export async function runDueAutomations(): Promise<{ ran: number; results: { id: number; name: string; summary: string }[] }> {
  const db = await getDb();
  if (!db) return { ran: 0, results: [] };
  const all = await db.select().from(adminAutomations).where(eq(adminAutomations.enabled, 1));
  const results: { id: number; name: string; summary: string }[] = [];
  for (const auto of all) {
    if (!cadenceDue(auto.cadence, auto.lastRunAt ?? null)) continue;
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
      cadence: z.enum(["hourly", "daily", "weekly"]).default("daily"),
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
