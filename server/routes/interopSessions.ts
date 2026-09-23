/**
 * Interoperability Circle tRPC Router
 *
 * The Circle is a standing weekly working group for the people building the
 * tools under the land projects. Its meeting time is not fixed once: every
 * participant raises a hand for each weekly slot they can make (one, several or
 * all), and the slot with the most hands is the one the session runs in. As
 * people join and leave, the lead moves and the group follows it.
 *
 * Public on purpose. Most of the people in this circle do not have an account
 * on the site, so the browser holds a random voterKey and that key owns the
 * vote. One row per key, updated in place.
 *
 * The `slot` column holds that voter's slots as a comma list ("tue,thu"). Rows
 * written before multi-select hold a single key, which parses the same way.
 *
 * The vote decides the time; server/lib/interopCircle.ts turns it into real
 * weekly `events` rows, so sign-ups, reminders, calendar feeds and the admin
 * Events tab work the same as for every other session.
 */

import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { eventSignups, interopTimeVotes } from "../../drizzle/schema";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  INTEROP_PIN_SETTING,
  INTEROP_SLOT_KEYS as INTEROP_SLOTS,
  interopSlot,
  parseSlots,
  serializeSlots,
} from "@shared/interopCircle";
import {
  addCircleSignups,
  ensureVotesTable as ensureTable,
  leaveCircle,
  resolveCircleState,
  sendCircleWelcome,
  syncInteropCircle,
  upcomingCircleRows,
} from "../lib/interopCircle";
import { setSiteSetting } from "../db";

/** How many upcoming weeks the page and admin panel list. */
const SCHEDULE_PREVIEW = 4;

export { INTEROP_SLOT_KEYS as INTEROP_SLOTS, parseSlots, serializeSlots } from "@shared/interopCircle";

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

    const parsed = rows.map((r) => ({ ...r, slots: parseSlots(r.slot) }));
    const slots = INTEROP_SLOTS.map((slot) => {
      const forSlot = parsed.filter((r) => r.slots.includes(slot));
      const names = forSlot
        .map((r) => (r.displayName ?? "").trim())
        .filter((n) => n.length > 0)
        .slice(0, 40);
      return { slot, count: forSlot.length, names };
    });

    // total counts people, not hands: someone who can make all three is one voter.
    return { slots, total: parsed.filter((r) => r.slots.length > 0).length };
  }),

  /**
   * Public: set every slot this voter can make. The same voterKey always owns
   * the same row, so calling again replaces that person's hands instead of
   * stuffing the count. An empty list withdraws the vote.
   */
  setSlots: publicProcedure
    .input(z.object({
      slots: z.array(z.enum(INTEROP_SLOTS)).max(INTEROP_SLOTS.length),
      voterKey: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
      displayName: z.string().trim().max(80).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) return { ok: false as const };
      await ensureTable(database);

      const stored = serializeSlots(input.slots);
      if (stored.length === 0) {
        await database.delete(interopTimeVotes).where(eq(interopTimeVotes.voterKey, input.voterKey));
        return { ok: true as const };
      }

      const name = input.displayName && input.displayName.length > 0 ? input.displayName : null;

      await database
        .insert(interopTimeVotes)
        .values({ slot: stored, voterKey: input.voterKey, displayName: name })
        .onDuplicateKeyUpdate({
          set: { slot: stored, displayName: name, updatedAt: sql`CURRENT_TIMESTAMP` },
        });

      void syncInteropCircle();
      return { ok: true as const };
    }),

  /**
   * Public: single-slot vote, kept for pages loaded before multi-select
   * shipped. Replaces the voter's hands with this one slot.
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
  /**
   * Public: the Circle as scheduled, which is what the calendar and reminders
   * follow. It can trail the live vote by the settle window, and sessions
   * inside the freeze window never move.
   */
  schedule: publicProcedure.query(async () => {
    const database = await getDb();
    if (!database) return { slot: null, pinned: false, sessions: [] as { id: number; startTime: Date; status: string }[], members: 0 };
    await syncInteropCircle();
    const now = new Date();
    const state = await resolveCircleState(database, now);
    const rows = (await upcomingCircleRows(database, now)).filter((r) => r.status !== "cancelled");
    const nextId = rows[0]?.id;
    let members = 0;
    if (nextId) {
      const [row] = await database
        .select({ n: sql<number>`count(*)` })
        .from(eventSignups)
        .where(and(eq(eventSignups.eventId, nextId), eq(eventSignups.signupType, "reminder"), isNull(eventSignups.cancelledAt)));
      members = Number(row?.n ?? 0);
    }
    return {
      slot: state.slot,
      pinned: state.pinned != null,
      sessions: rows.slice(0, SCHEDULE_PREVIEW).map((r) => ({ id: r.id, startTime: r.startTime, status: r.status })),
      members,
    };
  }),

  /**
   * Public: join the Circle. Signs this email up for every upcoming week, and
   * the sync carries them onto each new week as it is added. Joining again
   * re-activates someone who left.
   */
  join: publicProcedure
    .input(z.object({
      email: z.string().trim().toLowerCase().email().max(320),
      name: z.string().trim().max(120).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await syncInteropCircle({ force: true });
      const now = new Date();
      const rows = (await upcomingCircleRows(database, now)).filter((r) => r.status !== "cancelled");
      if (!rows.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No Circle sessions are scheduled yet." });

      const ids = rows.map((r) => r.id);
      const already = await database
        .select({ id: eventSignups.id })
        .from(eventSignups)
        .where(and(inArray(eventSignups.eventId, ids), eq(eventSignups.email, input.email), isNull(eventSignups.cancelledAt)))
        .limit(1);

      const name = input.name && input.name.length > 0 ? input.name : null;
      await addCircleSignups(database, ids, [{ email: input.email, name }]);

      const state = await resolveCircleState(database, now);
      if (!already.length) {
        sendCircleWelcome({
          email: input.email,
          name,
          nextId: rows[0].id,
          nextStart: new Date(rows[0].startTime),
          slotLabel: interopSlot(state.slot).label,
        }).catch((err) => console.error("[interopSessions] welcome email failed:", err));
      }
      return { ok: true as const, alreadyMember: already.length > 0 };
    }),

  /** Public: leave the Circle (every future week). Same trust level as events.unsubscribe. */
  leave: publicProcedure
    .input(z.object({ email: z.string().trim().toLowerCase().email().max(320) }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await leaveCircle(database, input.email);
      return { ok: true as const };
    }),

  /** Admin: the vote, the pin, the applied slot, and the upcoming weeks. */
  adminState: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const now = new Date();
    const state = await resolveCircleState(database, now);
    const rows = await upcomingCircleRows(database, now);
    const ids = rows.map((r) => r.id);
    const counts = ids.length
      ? await database
          .select({ eventId: eventSignups.eventId, n: sql<number>`count(*)` })
          .from(eventSignups)
          .where(and(inArray(eventSignups.eventId, ids), eq(eventSignups.signupType, "reminder"), isNull(eventSignups.cancelledAt)))
          .groupBy(eventSignups.eventId)
      : [];
    const byId = new Map(counts.map((c) => [c.eventId, Number(c.n)]));
    return {
      ...state,
      sessions: rows.map((r) => ({
        id: r.id,
        startTime: r.startTime,
        status: r.status,
        manualOverride: !!r.manualOverride,
        signups: byId.get(r.id) ?? 0,
      })),
    };
  }),

  /** Admin: pin the Circle to a slot (overrides the vote), or clear the pin. Runs the sync now. */
  adminPin: adminProcedure
    .input(z.object({ slot: z.enum(INTEROP_SLOTS).nullable() }))
    .mutation(async ({ input }) => {
      await setSiteSetting(INTEROP_PIN_SETTING, input.slot ?? "");
      const result = await syncInteropCircle({ force: true });
      return { ok: true as const, result };
    }),

  /** Admin: run the sync now instead of waiting for the next sweep. */
  adminSync: adminProcedure.mutation(async () => {
    const result = await syncInteropCircle({ force: true });
    return { ok: true as const, result };
  }),
});
