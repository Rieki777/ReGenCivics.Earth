/**
 * The $ReGen builders' pool: what a visitor sees, and what an admin sees
 * (ADR-50).
 *
 * THE PUBLICATION RULE, in code. The public procedures carry the cycle, the
 * pool, and per-module counts and shares. They never carry which village runs
 * what, and they never carry a builder's address, handle, or payment state.
 *
 * That distinction survives the obvious objection, which is that each village
 * already publishes its own module list in its own signed documents. A village
 * publishing its own list is a village speaking for itself. The hub joining
 * those lists into one table is a different object: a cross-village map of who
 * runs what, published by a party none of them asked to speak for. So the hub
 * aggregates to counts, and the counts are what it publishes.
 *
 * Nothing here moves value. `execute` records that a human made transfers
 * elsewhere; it does not make them, and there is no code path in this
 * repository that could.
 */
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { modulePoolShares, modulePoolStatements } from "../../drizzle/schema";
import { MODULE_BUILDERS } from "@shared/moduleBuilders";
import { cycleBoundsByNumber } from "@shared/lunar";
import { POOL_DUST_FLOOR, statementCsv, type PoolShareLine, type PoolStatement } from "@shared/modulePool";

/** One statement's public face: module ids, counts, amounts. No people, no villages. */
function publicView(statement: any, shares: any[]) {
  return {
    cycleNumber: statement.cycleNumber,
    cycleStartsAt: statement.cycleStartsAt,
    cycleEndsAt: statement.cycleEndsAt,
    status: statement.status,
    pool: statement.poolAmount,
    carryIn: statement.carryIn,
    paid: statement.paid,
    accrued: statement.accrued,
    unallocated: statement.unallocated,
    snapshotHash: statement.snapshotHash,
    computedAt: statement.computedAt,
    /**
     * How many roster villages answered, and how. A count and three words: it
     * says the statement rested on live data without saying whose.
     */
    roster: summariseRoster(statement.roster),
    modules: shares.map((s: any) => ({
      moduleId: s.moduleId,
      builtBy: s.builtBy,
      villages: s.villages,
      amount: s.amount,
      /**
       * Whether this share was sent or is waiting. The REASON it is waiting is
       * the builder's business and stays in the admin view: "this builder has
       * not linked a wallet" is a fact about a person, published beside their
       * name, and nobody needs it to check the arithmetic.
       */
      settled: s.state === "payable",
    })),
  };
}

function summariseRoster(roster: unknown): { total: number; ok: number; carried: number; absent: number } {
  const rows = Array.isArray(roster) ? roster : typeof roster === "string" ? safeParse(roster) : [];
  const count = (state: string) => rows.filter((r: any) => r?.state === state).length;
  return { total: rows.length, ok: count("ok"), carried: count("carried"), absent: count("absent") };
}

function safeParse(value: string): any[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadStatement(db: any, cycleNumber?: number) {
  const rows = cycleNumber === undefined
    ? await db.select().from(modulePoolStatements).where(eq(modulePoolStatements.status, "computed"))
        .orderBy(desc(modulePoolStatements.cycleNumber)).limit(1)
    : await db.select().from(modulePoolStatements).where(eq(modulePoolStatements.cycleNumber, cycleNumber)).limit(1);
  const statement = rows[0];
  if (!statement) return null;
  const shares = await db.select().from(modulePoolShares)
    .where(eq(modulePoolShares.statementId, statement.id))
    .orderBy(desc(modulePoolShares.amount));
  return { statement, shares };
}

export const modulePoolRouter = router({
  /** How the pool works, as data, so the page never hardcodes a rule. */
  terms: publicProcedure.query(() => ({
    dustFloor: POOL_DUST_FLOOR,
    /** Modules the pool is able to pay at all. Ids and credits, nothing else. */
    payableModules: MODULE_BUILDERS.map((b) => ({
      moduleId: b.moduleId,
      builtBy: b.builtBy,
      reviewedOn: b.reviewedOn,
    })),
  })),

  /** The most recent settled cycle. Null before the first one closes. */
  current: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const loaded = await loadStatement(db);
    return loaded ? publicView(loaded.statement, loaded.shares) : null;
  }),

  /** One cycle by number, for a permalink. */
  cycle: publicProcedure.input(z.object({ cycleNumber: z.number().int() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const loaded = await loadStatement(db, input.cycleNumber);
    // An unsettled cycle is not published: a statement in `computing` is a
    // half-written document and publishing one would show numbers that change.
    if (!loaded || (loaded.statement.status !== "computed" && loaded.statement.status !== "executed")) return null;
    return publicView(loaded.statement, loaded.shares);
  }),

  /** Recent cycles, newest first, as headline numbers only. */
  history: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(24).default(12) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(modulePoolStatements)
        .orderBy(desc(modulePoolStatements.cycleNumber)).limit(input?.limit ?? 12);
      return rows
        .filter((s: any) => s.status === "computed" || s.status === "executed")
        .map((s: any) => ({
          cycleNumber: s.cycleNumber,
          cycleEndsAt: s.cycleEndsAt,
          pool: s.poolAmount,
          paid: s.paid,
          status: s.status,
        }));
    }),

  /**
   * The full statement, admin only: who is owed, where it goes, and why a share
   * is waiting. Everything the public view withholds lives here.
   */
  adminStatement: adminProcedure.input(z.object({ cycleNumber: z.number().int().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const loaded = await loadStatement(db, input?.cycleNumber);
      if (!loaded) return null;
      const { statement, shares } = loaded;
      return {
        ...publicView(statement, shares),
        /** The per-village answers in full. Admin only. */
        rosterDetail: Array.isArray(statement.roster) ? statement.roster : safeParse(String(statement.roster ?? "[]")),
        executedAt: statement.executedAt,
        executedBy: statement.executedBy,
        executionNote: statement.executionNote,
        lines: shares.map((s: any) => ({
          moduleId: s.moduleId,
          builtBy: s.builtBy,
          builtByAccount: s.builtByAccount,
          address: s.address,
          villages: s.villages,
          rawShare: s.rawShare,
          amount: s.amount,
          state: s.state,
          accruedSinceCycle: s.accruedSinceCycle,
        })),
      };
    }),

  /**
   * The export a treasury tool consumes: payable lines only, because this file
   * is a to-do list and a line nobody can be paid is not a to-do.
   */
  adminExport: adminProcedure.input(z.object({ cycleNumber: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No database" });
      const loaded = await loadStatement(db, input.cycleNumber);
      if (!loaded) throw new TRPCError({ code: "NOT_FOUND", message: "No statement for that cycle" });

      const statement: PoolStatement = {
        totals: {
          pool: loaded.statement.poolAmount, carryIn: loaded.statement.carryIn,
          paid: loaded.statement.paid, accrued: loaded.statement.accrued,
          unallocated: loaded.statement.unallocated,
        },
        lines: loaded.shares.map((s: any): PoolShareLine => ({
          moduleId: s.moduleId, villages: s.villages, builtBy: s.builtBy,
          builtByAccount: s.builtByAccount, rawShare: Number(s.rawShare),
          amount: s.amount, state: s.state, address: s.address,
        })),
      };
      const bounds = cycleBoundsByNumber(loaded.statement.cycleNumber);
      return {
        cycleNumber: loaded.statement.cycleNumber,
        snapshotHash: loaded.statement.snapshotHash,
        cycleStartsAt: bounds.startsAt.toISOString(),
        cycleEndsAt: bounds.endsAt.toISOString(),
        token: "$ReGen",
        chain: "base",
        totals: statement.totals,
        payable: statement.lines.filter((l) => l.state === "payable"),
        csv: statementCsv(statement, loaded.statement.cycleNumber),
      };
    }),

  /**
   * Record that a human made the transfers.
   *
   * This is a NOTE, not an action. It writes down what somebody says they did
   * in Hypha, and the hub does not verify it on chain in v1. Nothing in this
   * procedure or anywhere behind it can move a token.
   */
  markExecuted: adminProcedure
    .input(z.object({ cycleNumber: z.number().int(), note: z.string().max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No database" });
      const loaded = await loadStatement(db, input.cycleNumber);
      if (!loaded) throw new TRPCError({ code: "NOT_FOUND", message: "No statement for that cycle" });
      if (loaded.statement.status !== "computed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `That cycle is ${loaded.statement.status}, and only a computed statement can be marked executed.`,
        });
      }
      await db.update(modulePoolStatements)
        .set({
          status: "executed",
          executedAt: new Date(),
          executedBy: String((ctx.user as any)?.handle ?? (ctx.user as any)?.name ?? "admin").slice(0, 120),
          executionNote: input.note,
        } as any)
        .where(eq(modulePoolStatements.cycleNumber, input.cycleNumber));
      return { ok: true };
    }),
});
