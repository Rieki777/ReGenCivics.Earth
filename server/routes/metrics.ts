/**
 * metrics router: the admin editor for canonical numbers, and the one public
 * read (funding engine Phase 0; see server/funding/metrics.ts).
 *
 * Security posture: every write and the full listing are adminProcedure. The
 * one public procedure returns only rows Rye has marked public AND confirmed,
 * which today is none (ruling 2026-09-27: live counts stay in admin until they
 * are meaningful).
 */
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { metrics } from "../../drizzle/schema";
import {
  clearPublicMetricsCache,
  formatMetricValue,
  publicMetrics,
  refreshComputedMetrics,
} from "../funding/metrics";

function requireDb() {
  return getDb().then((db) => {
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db;
  });
}

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const metricsRouter = router({
  /** Public: confirmed, public metrics only, keyed by metricKey. */
  public: publicProcedure.query(async () => publicMetrics()),

  /** Admin: every row, in display order. */
  list: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(metrics).orderBy(asc(metrics.sortOrder), asc(metrics.metricKey));
  }),

  /**
   * Admin: edit one row. Computed rows take their value from the live count,
   * so value edits on them are refused (the next refresh would overwrite
   * them silently). A row can be public only once it is confirmed.
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        label: z.string().min(1).max(160).optional(),
        definition: z.string().max(4000).nullable().optional(),
        valueNumeric: z.number().finite().nullable().optional(),
        displayValue: z.string().max(60).nullable().optional(),
        asOf: ymd.nullable().optional(),
        source: z.string().max(500).nullable().optional(),
        notes: z.string().max(4000).nullable().optional(),
        isPublic: z.boolean().optional(),
        confirm: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(metrics).where(eq(metrics.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Metric not found" });

      if (row.computedFrom && (input.valueNumeric !== undefined || input.displayValue !== undefined)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This number is a live count. Refresh it instead of typing a value.",
        });
      }

      const patch: Record<string, unknown> = {};
      if (input.label !== undefined) patch.label = input.label;
      if (input.definition !== undefined) patch.definition = input.definition;
      if (input.valueNumeric !== undefined) {
        patch.valueNumeric = input.valueNumeric;
        if (input.displayValue === undefined) patch.displayValue = formatMetricValue(input.valueNumeric, row.unit);
      }
      if (input.displayValue !== undefined) patch.displayValue = input.displayValue;
      if (input.asOf !== undefined) patch.asOf = input.asOf ? new Date(`${input.asOf}T00:00:00Z`) : null;
      if (input.source !== undefined) patch.source = input.source;
      if (input.notes !== undefined) patch.notes = input.notes;

      let confirmedAt = row.confirmedAt;
      if (input.confirm === true) {
        confirmedAt = new Date();
        patch.confirmedAt = confirmedAt;
        patch.confirmedBy = ctx.user.id;
      } else if (input.confirm === false) {
        confirmedAt = null;
        patch.confirmedAt = null;
        patch.confirmedBy = null;
      }

      // A value change after confirmation needs confirming again: what Rye
      // confirmed was a number, not a row.
      if (input.valueNumeric !== undefined && input.confirm === undefined && row.confirmedAt) {
        confirmedAt = null;
        patch.confirmedAt = null;
        patch.confirmedBy = null;
      }

      const wantsPublic = input.isPublic ?? row.isPublic;
      if (wantsPublic && !confirmedAt) {
        if (input.isPublic === true) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Confirm the number before making it public." });
        }
        // It was public and just lost its confirmation: take it off the site.
        patch.isPublic = false;
      } else if (input.isPublic !== undefined) {
        patch.isPublic = input.isPublic;
      }

      if (Object.keys(patch).length > 0) {
        await db.update(metrics).set(patch).where(eq(metrics.id, input.id));
      }
      clearPublicMetricsCache();
      const [updated] = await db.select().from(metrics).where(eq(metrics.id, input.id)).limit(1);
      return updated;
    }),

  /** Admin: recompute every live count now. */
  refresh: adminProcedure.mutation(async () => {
    const db = await requireDb();
    const result = await refreshComputedMetrics(db);
    clearPublicMetricsCache();
    return result;
  }),
});
