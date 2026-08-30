/**
 * The $ReGen builders' pool: what a visitor sees, what a builder sees, and what
 * an operator can do (ADR-50, ADR-51).
 *
 * THE PUBLICATION RULE, in code. The public procedures carry the cycle, the
 * pool, the recycled share, and per-module reach and amounts. They never carry
 * which village runs what, and they never carry a builder's address or payment
 * state.
 *
 * That distinction survives the obvious objection, which is that each village
 * already publishes its own module list in its own signed documents. A village
 * publishing its own list is a village speaking for itself. The hub joining
 * those lists into one table is a different object: a cross-village map of who
 * runs what, published by a party none of them asked to speak for. So the hub
 * aggregates to counts, and the counts are what it publishes.
 *
 * WHAT MOVES, AND WHERE IT STOPS. `openPayout` creates a Hypha Bridge handoff
 * for one payable line: a bridge row, a title marker, and a pre-filled Hypha
 * deploy-funds form carrying the recipient, the amount and the $ReGen contract
 * address. It stops there, at a URL. The treasury's Hypha space proposes and
 * executes, its own members decide, and the Alchemy webhook stamps the share
 * paid with the transaction that did it. Nothing in this repository holds a
 * key, signs anything, or moves a token, and `openPayout` does not change that.
 */
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { modulePoolShares, modulePoolStatements } from "../../drizzle/schema";
import { MODULE_BUILDERS } from "@shared/moduleBuilders";
import { cycleBoundsByNumber } from "@shared/lunar";
import { POOL_DUST_FLOOR, statementCsv, type PoolShareLine, type PoolStatement } from "@shared/modulePool";
import { bridgePageUrl, bridgeToHypha } from "../lib/hypha-bridge";
import { recycleHistory } from "../lib/gratitude-cycles";

/**
 * How much of a statement's payable total the chain has confirmed.
 *
 * The same rule `settlementWord` uses one row at a time, summed. A payable
 * line with `paidAt` was stamped by the Alchemy webhook off a real
 * transaction, so it is the only money this hub is entitled to call sent.
 */
export function sentOnChain(shares: any[]): number {
  return shares
    .filter((s: any) => s.state === "payable" && s.paidAt)
    .reduce((sum: number, s: any) => sum + Number(s.amount ?? 0), 0);
}

/** One statement's public face: module ids, reach, amounts. No people, no villages. */
function publicView(statement: any, shares: any[]) {
  const sent = sentOnChain(shares);
  return {
    cycleNumber: statement.cycleNumber,
    cycleStartsAt: statement.cycleStartsAt,
    cycleEndsAt: statement.cycleEndsAt,
    status: statement.status,
    pool: statement.poolAmount,
    carryIn: statement.carryIn,
    /**
     * PAYABLE, and the page must say that word. This is the sum of the lines
     * the hub worked out it could send, which is what the arithmetic identity
     * `pool + carryIn = paid + accrued + recycled + unallocated` balances on.
     * Until the treasury's Hypha space executes, none of it has moved.
     */
    paid: statement.paid,
    /**
     * SENT, confirmed on Base. A subset of `paid`, and the difference between
     * the two is what is still waiting on the treasury space. Published beside
     * `paid` because the reader who comes to this page wants to know whether a
     * builder was actually paid, and a page that showed only `paid` under the
     * word "sent" was answering a question nobody asked with a number that was
     * not true yet.
     */
    sent,
    accrued: statement.accrued,
    /**
     * What the platform's own modules earned and handed back to the ReGen
     * Civics gratitude pool. PUBLIC, and that is the point rather than a
     * nicety (R59): a village or an author should be able to see the
     * platform's share going back in rather than into a pocket.
     */
    recycled: statement.recycled ?? 0,
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
      /** THE WEIGHT. Summed village reach, each village capped at 1.0. */
      reach: Number(s.reach ?? 0),
      membersReached: s.membersReached ?? 0,
      villages: s.villages,
      amount: s.amount,
      platformBuilt: !!s.platformBuilt,
      /**
       * What happened to this share, in one word a reader can act on.
       *
       * `recycled` is published because R64 makes it the interesting case: it
       * is how somebody checks that ReGen Civics is not paying itself. The
       * private reasons a third-party share is waiting stay in the admin view,
       * because "this builder has not linked a wallet" is a fact about a
       * person, published beside their name, and nobody needs it to check the
       * arithmetic.
       */
      settlement: settlementWord(s.state, !!s.paidAt),
    })),
  };
}

/**
 * What happened to this share, in one word.
 *
 * `payable` IS NOT `sent`, and the page used to say it was. A payable share is
 * one the hub worked out it could send, and until the treasury's Hypha space
 * executes the proposal nothing has moved. Saying "Sent" beside an amount
 * nobody has received is a sentence the product causes to be false, and the
 * reader it misleads is the builder waiting for the money.
 *
 * `paidAt` is written by the Alchemy webhook off a real transaction, so it is
 * the only thing here entitled to the word.
 */
export function settlementWord(state: string, paid: boolean): "sent" | "ready" | "recycled" | "waiting" | "too-small" {
  if (state === "payable") return paid ? "sent" : "ready";
  if (state === "recycled") return "recycled";
  if (state === "below-floor") return "too-small";
  return "waiting";
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

/**
 * What the pool amount actually IS right now, read from the database rather
 * than assumed from a default.
 *
 * The admin page used to imply the pool could be set in the admin UI. It could
 * not: `pool.regen_per_cycle` had no row, the panel edits variables by id
 * through an UPDATE, and there was nothing to update. Migration 0228 creates
 * the row, and this procedure exists so the page states what it FOUND rather
 * than what the migration was supposed to have done. A page that assumes its
 * own migration ran is the same defect wearing a newer hat.
 */
async function readPoolVariable(db: any): Promise<
  { exists: true; value: number; minValue: number | null; maxValue: number | null }
  | { exists: false }
> {
  const rows: any = await db.execute(sql`
    SELECT value, \`minValue\`, \`maxValue\` FROM game_variables
    WHERE \`key\` = 'pool.regen_per_cycle' AND isActive = 1 LIMIT 1
  `);
  const row = rows?.[0]?.[0] ?? rows?.rows?.[0] ?? null;
  if (!row) return { exists: false };
  return {
    exists: true,
    value: Number(row.value ?? 0),
    minValue: row.minValue == null ? null : Number(row.minValue),
    maxValue: row.maxValue == null ? null : Number(row.maxValue),
  };
}

export const modulePoolRouter = router({
  /** How the pool works, as data, so the page never hardcodes a rule. */
  terms: publicProcedure.query(() => ({
    dustFloor: POOL_DUST_FLOOR,
    /**
     * Modules the hub has ATTESTED, and which side each is on.
     *
     * No longer the list of modules that can earn: since ADR-51 every module
     * any village reports earns its share, whether or not it is named here.
     * What a line here does is authorise a PAYMENT, or record that a module is
     * the platform's own.
     */
    attestations: MODULE_BUILDERS.map((b) => ({
      moduleId: b.moduleId,
      kind: b.kind,
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

  /**
   * Recent cycles, newest first, as headline numbers only.
   *
   * Carries `sent` alongside `paid` for the same reason `current` does: an
   * older cycle's payable total is not what builders received, and the list
   * used to print it under the words "to builders".
   */
  history: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(24).default(12) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(modulePoolStatements)
        .orderBy(desc(modulePoolStatements.cycleNumber)).limit(input?.limit ?? 12);
      const published = rows.filter((s: any) => s.status === "computed" || s.status === "executed");
      if (published.length === 0) return [];

      // One grouped read for every listed statement, rather than a query per
      // row. An empty map means nothing is confirmed yet, which is the honest
      // answer before the treasury space has executed anything.
      const ids = published.map((s: any) => Number(s.id));
      const sentRows: any = await db.execute(sql`
        SELECT statementId, COALESCE(SUM(amount), 0) AS sent
        FROM modulePoolShares
        WHERE state = 'payable' AND paidAt IS NOT NULL
          AND statementId IN (${sql.join(ids.map((id: number) => sql`${id}`), sql`, `)})
        GROUP BY statementId
      `);
      const list: any[] = sentRows?.[0] ?? sentRows?.rows ?? [];
      const sentById = new Map<number, number>(
        (Array.isArray(list) ? list : []).map((r: any) => [Number(r.statementId), Number(r.sent ?? 0)]),
      );

      return published.map((s: any) => ({
        cycleNumber: s.cycleNumber,
        cycleEndsAt: s.cycleEndsAt,
        pool: s.poolAmount,
        /** Payable. See the note on `paid` in `publicView`. */
        paid: s.paid,
        /** Confirmed on Base. A subset of `paid`. */
        sent: sentById.get(Number(s.id)) ?? 0,
        recycled: s.recycled ?? 0,
        status: s.status,
      }));
    }),

  /**
   * Every amount the platform's own modules earned and handed back to the
   * gratitude pool, with the gratitude cycle it landed in.
   *
   * PUBLIC. R64 says the platform's revenue "is then distributed to regen
   * civics gratitude system to give out", and R59 says the visibility is the
   * point. A recycling nobody can check is a promise, and this makes it a
   * receipt: the amount, the pool cycle it came from, and the gratitude cycle
   * whose pool it grew.
   */
  recycles: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(24).default(12) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return recycleHistory(db, input?.limit ?? 12);
    }),

  /**
   * What accrued in the signed-in person's name, and what happened to it.
   *
   * THIS IS NOT A CLAIM PATH, and it deliberately does not pretend to be one.
   * A share owed to a builder the hub could not pay does NOT wait in escrow: it
   * is added to the next cycle's pool and re-split by that cycle's reach, so a
   * builder who links an account three cycles late does not receive what
   * accrued while they were unreachable. That is the shipped behaviour, it has
   * always been the shipped behaviour, and nothing here changes it.
   *
   * What this does is stop it being SILENT. A builder can see every cycle their
   * modules earned in, what the share was, why it was not sent, and that it
   * went back to the pool. Whether the treasury honours a late claim for a
   * cycle whose statement was already executed is a money decision and it is
   * Rye's; building a payment rule for it here would be guessing at an answer
   * that money is later reconciled against.
   */
  myAccruals: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { handle: null, lines: [], total: 0 };
    const handle = String((ctx.user as any)?.handle ?? "").trim().toLowerCase();
    if (!handle) return { handle: null, lines: [], total: 0 };

    const rows: any = await db.execute(sql`
      SELECT st.cycleNumber, s.moduleId, s.amount, s.state, s.accruedSinceCycle, s.paidAt, s.paidTxHash
      FROM modulePoolShares s
      JOIN modulePoolStatements st ON st.id = s.statementId
      WHERE s.builtByAccount = ${handle}
      ORDER BY st.cycleNumber DESC
      LIMIT 60
    `);
    const list: any[] = rows?.[0] ?? rows?.rows ?? [];
    const lines = (Array.isArray(list) ? list : []).map((r: any) => ({
      cycleNumber: Number(r.cycleNumber),
      moduleId: String(r.moduleId),
      amount: Number(r.amount),
      state: String(r.state),
      accruedSinceCycle: r.accruedSinceCycle == null ? null : Number(r.accruedSinceCycle),
      paidAt: r.paidAt ? new Date(r.paidAt).toISOString() : null,
      paidTxHash: r.paidTxHash ?? null,
    }));
    return {
      handle,
      lines,
      /** Earned, never sent, and already re-split into a later cycle's pool. */
      total: lines.filter((l) => l.state !== "payable" && l.state !== "below-floor" && l.state !== "recycled")
        .reduce((sum, l) => sum + l.amount, 0),
    };
  }),

  /**
   * The full statement, admin only: who is owed, where it goes, and why a share
   * is waiting. Everything the public view withholds lives here.
   */
  adminStatement: adminProcedure.input(z.object({ cycleNumber: z.number().int().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const poolVariable = await readPoolVariable(db);
      const loaded = await loadStatement(db, input?.cycleNumber);
      if (!loaded) return { statement: null, poolVariable };
      const { statement, shares } = loaded;
      return {
        poolVariable,
        statement: {
          ...publicView(statement, shares),
          /** The per-village answers in full, including why one was refused. */
          rosterDetail: Array.isArray(statement.roster) ? statement.roster : safeParse(String(statement.roster ?? "[]")),
          executedAt: statement.executedAt,
          executedBy: statement.executedBy,
          executionNote: statement.executionNote,
          lines: shares.map((s: any) => ({
            moduleId: s.moduleId,
            builtBy: s.builtBy,
            builtByAccount: s.builtByAccount,
            platformBuilt: !!s.platformBuilt,
            attested: !!s.attested,
            address: s.address,
            villages: s.villages,
            reach: Number(s.reach ?? 0),
            membersReached: s.membersReached ?? 0,
            rawShare: s.rawShare,
            amount: s.amount,
            state: s.state,
            accruedSinceCycle: s.accruedSinceCycle,
            bridgeKey: s.bridgeKey ?? null,
            bridgeOpenedAt: s.bridgeOpenedAt,
            paidTxHash: s.paidTxHash ?? null,
            paidAt: s.paidAt,
          })),
        },
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
          recycled: loaded.statement.recycled ?? 0,
          unallocated: loaded.statement.unallocated,
        },
        lines: loaded.shares.map((s: any): PoolShareLine => ({
          moduleId: s.moduleId, villages: s.villages, reach: Number(s.reach ?? 0),
          membersReached: s.membersReached ?? 0, platformBuilt: !!s.platformBuilt,
          attested: !!s.attested, builtBy: s.builtBy,
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
   * Hand one payable line to Hypha.
   *
   * WHAT THIS IS. A Hypha Bridge handoff, the only way anything in this
   * codebase reaches an on-chain action (CLAUDE.md, and the bridge README's
   * hard rule: never construct an app.hypha.earth URL outside the module). It
   * creates a bridge row and returns a URL. The operator opens it, Hypha's
   * deploy-funds form arrives pre-filled with this builder's address, this
   * cycle's amount and the $ReGen contract, and the treasury space's own
   * members decide from there.
   *
   * WHAT IT IS NOT. It is not a transfer and there is no code path in this
   * repository that could make one. Ring 0 says the platform never mints,
   * moves or prices, and this is the furthest step that respects it: the last
   * thing the hub does is produce a link.
   *
   * THE ADDRESS COMES FROM THE STATEMENT, not from the request. The caller
   * names a cycle and a module and nothing else, so an operator cannot redirect
   * a payment by editing a form field, and the address on the line was resolved
   * from the builder's own profile when the statement was computed and frozen
   * there.
   */
  openPayout: adminProcedure
    .input(z.object({ cycleNumber: z.number().int(), moduleId: z.string().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No database" });

      const token = process.env.REGEN_TOKEN_ADDRESS_BASE;
      if (!token || !/^0x[0-9a-fA-F]{40}$/.test(token)) {
        // Refused rather than defaulted. A wrong contract address sends real
        // tokens of some other kind, or none, and a fallback here would be a
        // guess about which asset somebody is being paid in.
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "REGEN_TOKEN_ADDRESS_BASE is not set to a Base contract address, so this hub cannot say which token to send.",
        });
      }
      const dhoSlug = process.env.HYPHA_DHO_REGEN_CIVICS_SLUG;
      if (!dhoSlug) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "HYPHA_DHO_REGEN_CIVICS_SLUG is not set, so this hub does not know which Hypha space holds the treasury.",
        });
      }

      const loaded = await loadStatement(db, input.cycleNumber);
      if (!loaded) throw new TRPCError({ code: "NOT_FOUND", message: "No statement for that cycle" });
      const line: any = loaded.shares.find((s: any) => s.moduleId === input.moduleId);
      if (!line) throw new TRPCError({ code: "NOT_FOUND", message: "That module drew no share in that cycle" });
      if (line.state !== "payable") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `That share is ${line.state}, and only a payable share can be handed to Hypha.`,
        });
      }
      if (line.paidAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That share is already paid on chain." });
      }
      if (line.bridgeKey) {
        // Idempotent by re-use. Opening a second bridge for one share is how a
        // builder gets paid twice, once per link somebody kept in a tab.
        return { bridgeKey: line.bridgeKey, bridgeUrl: bridgePageUrl(String(line.bridgeKey)), reused: true };
      }

      const { bridgeKey, bridgeUrl } = await bridgeToHypha("module-pool-payout", {
        sourceId: `${input.cycleNumber}:${input.moduleId}`,
        targetDhoSlug: dhoSlug,
        title: `Builders pool cycle ${input.cycleNumber}: ${line.moduleId}`,
        description:
          `${line.amount} $ReGen from the builders' pool for cycle ${input.cycleNumber}, ` +
          `for ${line.moduleId}, built by ${line.builtBy ?? "an unnamed builder"}. ` +
          `Reach ${Number(line.reach ?? 0).toFixed(4)} across ${line.villages} village(s), ` +
          `${line.membersReached} member(s) reached. ` +
          `Statement snapshot ${loaded.statement.snapshotHash ?? "unrecorded"}.`,
        recipient: String(line.address) as `0x${string}`,
        payouts: [{ amount: String(line.amount), token: token as `0x${string}` }],
        initiatorUserId: ctx.user.id,
        metadata: {
          poolCycleNumber: input.cycleNumber,
          moduleId: line.moduleId,
          shareId: line.id,
          snapshotHash: loaded.statement.snapshotHash ?? null,
        },
      });

      await db.update(modulePoolShares)
        .set({ bridgeKey, bridgeOpenedAt: new Date() } as any)
        .where(eq(modulePoolShares.id, line.id));

      return { bridgeKey, bridgeUrl, reused: false };
    }),

  /**
   * Record that a human made transfers outside the bridge.
   *
   * STILL A NOTE, and now it says so in its own name rather than in a comment
   * nobody reading the page can see. It writes down what somebody says they did
   * and the hub does not verify it on chain. The verified path is `openPayout`
   * plus the Alchemy webhook, which stamps each share with the transaction that
   * paid it; this stays for a cycle settled by hand before that existed, and
   * for a payment made somewhere the webhook cannot see.
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
