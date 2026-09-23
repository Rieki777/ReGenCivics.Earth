/**
 * Interoperability Circle tRPC Router
 *
 * The Circle is a standing weekly working group for the people building the
 * tools under the land projects. Its meeting time is not fixed once: every
 * participant holds one changeable vote for a weekly slot, and the slot with
 * the most hands is the one the session runs in. As people join and leave, the
 * lead moves and the group follows it.
 *
 * Public on purpose. Most of the people in this circle do not have an account
 * on the site, so the browser holds a random voterKey and that key owns the
 * vote. One row per key, updated in place.
 */

import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { interopTimeVotes } from "../../drizzle/schema";
import { desc, eq, sql } from "drizzle-orm";

/**
 * The table this router owns (drizzle/0246_interop_time_votes.sql).
 *
 * Deploys do not run migrations, and this page went up with the Circle's first
 * invitation, so the router makes sure its own table is there before it reads
 * or writes. CREATE TABLE IF NOT EXISTS is idempotent and runs once per
 * process; when the migration has already been applied by hand, this is a
 * no-op. Remove the guard once 0246 is confirmed applied in production.
 */
let tableReady: Promise<void> | null = null;

function ensureTable(database: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<void> {
  if (!tableReady) {
    tableReady = database
      .execute(sql`CREATE TABLE IF NOT EXISTS interopTimeVotes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slot VARCHAR(24) NOT NULL,
        voterKey VARCHAR(64) NOT NULL,
        displayName VARCHAR(80) NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY interop_vote_voter_idx (voterKey),
        KEY interop_vote_slot_idx (slot)
      )`)
      .then(() => undefined)
      .catch((err) => {
        // A failed guard must not take the page down: reset so the next call
        // retries, and let the caller's own error handling answer empty.
        tableReady = null;
        console.error("[interopSessions] ensureTable failed:", err);
      });
  }
  return tableReady;
}

/** The weekly slots on offer. Keep in sync with client/src/pages/InteropSessions.tsx. */
export const INTEROP_SLOTS = ["tue", "wed", "thu"] as const;

export const interopSessionsRouter = router({
  /**
   * Public: every slot's hand count plus the names people chose to show.
   * The page polls this, so it stays cheap: two grouped reads, no joins.
   */
  tally: publicProcedure.query(async () => {
    const database = await getDb();
    const empty = INTEROP_SLOTS.map((slot) => ({ slot, count: 0, names: [] as string[] }));
    if (!database) return { slots: empty, total: 0 };
    await ensureTable(database);

    let rows: { slot: string; displayName: string | null; updatedAt: Date }[] = [];
    try {
      rows = await database
        .select({
          slot: interopTimeVotes.slot,
          displayName: interopTimeVotes.displayName,
          updatedAt: interopTimeVotes.updatedAt,
        })
        .from(interopTimeVotes)
        .orderBy(desc(interopTimeVotes.updatedAt))
        .limit(2000);
    } catch (err) {
      // The page keeps its shape on a database hiccup: zero hands, no error.
      console.error("[interopSessions] tally failed:", err);
      return { slots: empty, total: 0 };
    }

    const slots = INTEROP_SLOTS.map((slot) => {
      const forSlot = rows.filter((r) => r.slot === slot);
      const names = forSlot
        .map((r) => (r.displayName ?? "").trim())
        .filter((n) => n.length > 0)
        .slice(0, 40);
      return { slot, count: forSlot.length, names };
    });

    return { slots, total: rows.filter((r) => INTEROP_SLOTS.includes(r.slot as typeof INTEROP_SLOTS[number])).length };
  }),

  /**
   * Public: cast or move a vote. The same voterKey always owns the same row,
   * so voting again moves that person's hand instead of stuffing the count.
   */
  vote: publicProcedure
    .input(z.object({
      slot: z.enum(INTEROP_SLOTS),
      voterKey: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
      displayName: z.string().trim().max(80).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) return { ok: false as const };
      await ensureTable(database);

      const name = input.displayName && input.displayName.length > 0 ? input.displayName : null;

      await database
        .insert(interopTimeVotes)
        .values({ slot: input.slot, voterKey: input.voterKey, displayName: name })
        .onDuplicateKeyUpdate({
          set: { slot: input.slot, displayName: name, updatedAt: sql`CURRENT_TIMESTAMP` },
        });

      return { ok: true as const };
    }),

  /** Public: drop a vote entirely, for someone whose week stops working. */
  withdraw: publicProcedure
    .input(z.object({ voterKey: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/) }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) return { ok: false as const };
      await ensureTable(database);
      await database.delete(interopTimeVotes).where(eq(interopTimeVotes.voterKey, input.voterKey));
      return { ok: true as const };
    }),
});
