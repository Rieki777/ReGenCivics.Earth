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

import { adminProcedure, publicProcedure, rateLimited, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { eventSignups, interopTimeVotes, interopTools } from "../../drizzle/schema";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  INTEROP_PIN_SETTING,
  INTEROP_SLOTS_SETTING,
  INTEROP_SLOT_KEYS as INTEROP_SLOTS,
  type InteropSlotKey,
  interopSlot,
  parseOfferedSlots,
  parseSlots,
  serializeOfferedSlots,
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
import { getSiteSetting, setSiteSetting } from "../db";
import { cleanAgent, cleanRepoUrl } from "@shared/interopTools";
import { verifyPrefsToken } from "../lib/emailPrefs";

/** How many upcoming weeks the page and admin panel list. */
const SCHEDULE_PREVIEW = 4;

/** How many directory entries the page shows. */
const DIRECTORY_LIMIT = 60;

/**
 * Which slots the Circle currently offers, from site_settings.
 *
 * Read per request rather than cached, because the whole point of moving this
 * out of the code was that changing it should not need a deploy, and a cache
 * would mean it also needed a restart. It is one settings read beside reads
 * that already hit the database.
 */
async function offeredSlots() {
  return parseOfferedSlots(await getSiteSetting(INTEROP_SLOTS_SETTING));
}

/** A voterKey as the client generates it. Opaque to the server, so bound, not parsed. */
const voterKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);

/** How many named hands the page shows per slot, and how many rows we read to find them. */
const NAMES_PER_SLOT = 40;
const NAME_SCAN_LIMIT = 300;

/**
 * Every mutation on this router is public and unauthenticated, so each one
 * carries a per-IP ceiling. Two tiers:
 *
 * VOTE_LIMIT is generous, because moving your own hands a few times is normal
 * and the bucket is shared by everyone behind one office or VPN address. It is
 * there to make minting fresh voterKeys in a loop slow, not to police a person.
 *
 * CONTACT_LIMIT is tight, because join sends a welcome email to an address the
 * caller merely typed, which is the one thing here that reaches a stranger's
 * inbox. leave now needs a signed token, so it is no longer a way to cancel
 * somebody else, but it stays capped because verifying a token is still work.
 */
const VOTE_LIMIT = { windowMs: 60_000, max: 20 };
const CONTACT_LIMIT = { windowMs: 60_000, max: 5 };

/**
 * Display names are shown to everyone who opens the page, so they are trimmed,
 * length-bounded, and stripped of the characters that let a name escape its
 * own line: control characters, zero-width joiners and bidi overrides. React
 * escapes the markup; this is about a name that renders as something other
 * than what it says. Applied on the way out as well as in, because rows
 * written before this existed still have to render safely.
 */
export function cleanDisplayName(raw: string | undefined | null): string | null {
  if (typeof raw !== "string") return null;
  const stripped = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .trim()
    .slice(0, 80);
  return stripped.length > 0 ? stripped : null;
}

/**
 * Fold per-combination row counts into per-slot hand counts.
 *
 * The slot column holds a comma list, so the grouped read returns one row per
 * distinct combination ("tue", "tue,thu", ...) rather than per slot. There are
 * at most a handful of combinations however many people vote, which is what
 * lets the count stay exact without reading the table.
 *
 * Counted against the slots currently on offer, not against every weekday the
 * vocabulary allows. Retiring a day leaves its votes in the table on purpose,
 * so putting it back restores them; but while it is off the offer it must not
 * show in a count the page cannot display, or the total disagrees with the
 * columns beneath it.
 */
export function countsFromCombos(
  combos: { slot: string; count: number }[],
  offeredKeys: readonly string[] = INTEROP_SLOTS,
): { perSlot: Record<string, number>; total: number } {
  const offer = new Set(offeredKeys);
  const perSlot: Record<string, number> = {};
  for (const key of offeredKeys) perSlot[key] = 0;
  let total = 0;
  for (const row of combos) {
    const n = Number(row.count);
    if (!Number.isFinite(n) || n <= 0) continue;
    const slots = parseSlots(row.slot).filter((k) => offer.has(k));
    if (!slots.length) continue;
    // Counts people, not hands: someone who can make every slot is one voter.
    total += n;
    for (const s of slots) perSlot[s] = (perSlot[s] ?? 0) + n;
  }
  return { perSlot, total };
}

export { INTEROP_SLOT_KEYS as INTEROP_SLOTS, parseSlots, serializeSlots } from "@shared/interopCircle";

export const interopSessionsRouter = router({
  /**
   * Public: every slot's hand count plus the names people chose to show.
   * The page polls this, so it stays cheap: two grouped reads, no joins.
   */
  tally: publicProcedure.query(async () => {
    const offered = await offeredSlots();
    const keys = offered.map((s) => s.key);
    const database = await getDb();
    const empty = keys.map((slot) => ({ slot, count: 0, names: [] as string[] }));
    if (!database) return { slots: empty, total: 0, offered };
    await ensureTable(database);

    // The counts come from a grouped aggregate so they stay exact however many
    // people vote; only the names are a bounded sample. Reading every row to
    // count them capped the tally at the read limit, silently, once the Circle
    // outgrew it.
    let combos: { slot: string; count: number }[] = [];
    let named: { slot: string; displayName: string | null }[] = [];
    try {
      [combos, named] = await Promise.all([
        database
          .select({ slot: interopTimeVotes.slot, count: sql<number>`count(*)` })
          .from(interopTimeVotes)
          .groupBy(interopTimeVotes.slot),
        database
          .select({ slot: interopTimeVotes.slot, displayName: interopTimeVotes.displayName })
          .from(interopTimeVotes)
          .orderBy(desc(interopTimeVotes.updatedAt))
          .limit(NAME_SCAN_LIMIT),
      ]);
    } catch (err) {
      // The page keeps its shape on a database hiccup: zero hands, no error.
      console.error("[interopSessions] tally failed:", err);
      return { slots: empty, total: 0, offered };
    }

    const { perSlot, total } = countsFromCombos(combos, keys);
    const parsed = named.map((r) => ({ ...r, slots: parseSlots(r.slot) }));
    const slots = keys.map((slot) => {
      const names: string[] = [];
      const seen = new Set<string>();
      for (const row of parsed) {
        if (!row.slots.includes(slot) || names.length >= NAMES_PER_SLOT) continue;
        const name = cleanDisplayName(row.displayName);
        // One line per person: a wall of the same name is the cheapest way to
        // deface a public list.
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        names.push(name);
      }
      return { slot, count: perSlot[slot] ?? 0, names };
    });

    return { slots, total, offered };
  }),

  /**
   * Public: the tools directory, which is the point of the Circle collecting
   * repos at all. Names, repos and agents only. The email that owns each row
   * is the key, never the output: people gave it for reminders, not for a
   * public list, and a scrapeable page of addresses is how that becomes spam.
   */
  directory: publicProcedure.query(async () => {
    const database = await getDb();
    if (!database) return { entries: [] as { name: string | null; repoUrl: string | null; agent: string | null }[], total: 0 };
    try {
      const rows = await database
        .select({
          name: interopTools.name,
          repoUrl: interopTools.repoUrl,
          agent: interopTools.agent,
        })
        .from(interopTools)
        .orderBy(desc(interopTools.updatedAt))
        .limit(DIRECTORY_LIMIT);
      const [countRow] = await database.select({ n: sql<number>`count(*)` }).from(interopTools);
      const entries = rows
        .map((r) => ({
          name: cleanDisplayName(r.name),
          // Cleaned again on the way out: rows written before the cleaner, or
          // by any future caller, still have to be safe to put in an href.
          repoUrl: cleanRepoUrl(r.repoUrl),
          agent: cleanAgent(r.agent),
        }))
        .filter((r) => r.name || r.repoUrl || r.agent);
      return { entries, total: Number(countRow?.n ?? 0) };
    } catch (err) {
      console.error("[interopSessions] directory failed:", err);
      return { entries: [], total: 0 };
    }
  }),

  /**
   * Public: set every slot this voter can make. The same voterKey always owns
   * the same row, so calling again replaces that person's hands instead of
   * stuffing the count. An empty list withdraws the vote.
   */
  setSlots: publicProcedure
    .use(rateLimited(VOTE_LIMIT))
    .input(z.object({
      slots: z.array(z.enum(INTEROP_SLOTS)).max(INTEROP_SLOTS.length),
      voterKey: voterKeySchema,
      // Bounded well above the column so a long paste is trimmed by
      // cleanDisplayName rather than rejected with nothing to show for it.
      displayName: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) return { ok: false as const };
      await ensureTable(database);

      // Only slots currently on offer count. A stale tab holding a retired
      // slot would otherwise keep voting for a time nobody can pick any more.
      const offered = new Set((await offeredSlots()).map((o) => o.key));
      const stored = serializeSlots(input.slots.filter((k) => offered.has(k)));
      if (stored.length === 0) {
        await database.delete(interopTimeVotes).where(eq(interopTimeVotes.voterKey, input.voterKey));
        return { ok: true as const };
      }

      const name = cleanDisplayName(input.displayName);

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
   * Public: put a tool in the register against this browser's vote.
   *
   * The register used to be reachable only through the sign-up form, which
   * needs an email. But raising a hand is anonymous and comes first, and that
   * is the moment somebody is actually thinking about their tool. This writes
   * the same row the sign-up writes, keyed by voterKey instead, so the two
   * meet later: join finds this row and attaches the email to it.
   */
  setTool: publicProcedure
    .use(rateLimited(VOTE_LIMIT))
    .input(z.object({
      voterKey: voterKeySchema,
      repoUrl: z.string().max(500).optional(),
      agent: z.string().max(200).optional(),
      displayName: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) return { ok: false as const };

      const repoUrl = cleanRepoUrl(input.repoUrl);
      const agent = cleanAgent(input.agent);
      const name = cleanDisplayName(input.displayName);
      // A repo that does not survive cleaning is the one thing worth saying no
      // to, because the person typed something and would otherwise see it
      // silently vanish.
      if (input.repoUrl && input.repoUrl.trim() && !repoUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That does not look like a repo link. Use an http or https address.",
        });
      }
      if (!repoUrl && !agent && !name) return { ok: true as const };

      await database
        .insert(interopTools)
        .values({ voterKey: input.voterKey, name, repoUrl, agent })
        .onDuplicateKeyUpdate({
          set: {
            ...(name ? { name } : {}),
            ...(repoUrl ? { repoUrl } : {}),
            ...(agent ? { agent } : {}),
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        });
      return { ok: true as const };
    }),

  /**
   * Public: single-slot vote, kept for pages loaded before multi-select
   * shipped. Replaces the voter's hands with this one slot.
   */
  vote: publicProcedure
    .use(rateLimited(VOTE_LIMIT))
    .input(z.object({
      slot: z.enum(INTEROP_SLOTS),
      voterKey: voterKeySchema,
      // Bounded well above the column so a long paste is trimmed by
      // cleanDisplayName rather than rejected with nothing to show for it.
      displayName: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) return { ok: false as const };
      await ensureTable(database);

      const name = cleanDisplayName(input.displayName);

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
    .use(rateLimited(VOTE_LIMIT))
    .input(z.object({ voterKey: voterKeySchema }))
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
    .use(rateLimited(CONTACT_LIMIT))
    .input(z.object({
      email: z.string().trim().toLowerCase().email().max(320),
      name: z.string().trim().max(120).optional(),
      // The tools directory. Both optional: someone with no repo yet is still
      // part of the circle, and the sign-up stays one field for anyone in a hurry.
      repoUrl: z.string().max(500).optional(),
      agent: z.string().max(200).optional(),
      /** Lets a sign-up claim the row their raised hand already created. */
      voterKey: voterKeySchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Read first, and only sync when there is nothing to join. syncInteropCircle
      // already debounces itself to once a minute, and forcing past that on every
      // sign-up made a public endpoint able to demand a full circle rebuild on
      // demand. The one case that genuinely needs the rebuild is the first person
      // through the door before any week exists.
      const now = new Date();
      let rows = (await upcomingCircleRows(database, now)).filter((r) => r.status !== "cancelled");
      if (!rows.length) {
        await syncInteropCircle({ force: true });
        rows = (await upcomingCircleRows(database, now)).filter((r) => r.status !== "cancelled");
      }
      if (!rows.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No Circle sessions are scheduled yet." });

      const ids = rows.map((r) => r.id);
      const already = await database
        .select({ id: eventSignups.id })
        .from(eventSignups)
        .where(and(inArray(eventSignups.eventId, ids), eq(eventSignups.email, input.email), isNull(eventSignups.cancelledAt)))
        .limit(1);

      const name = input.name && input.name.length > 0 ? input.name : null;
      await addCircleSignups(database, ids, [{ email: input.email, name }]);

      // The register has two owners: the browser's voterKey, set when someone
      // raised a hand, and the email, set here. Reconciled rather than upserted
      // so one person does not end up as two rows: prefer an existing email
      // row, then the row their vote already made, and only insert when there
      // is neither. A blank field never erases what is already there.
      const repoUrl = cleanRepoUrl(input.repoUrl);
      const agent = cleanAgent(input.agent);
      const patch = {
        ...(name ? { name } : {}),
        ...(repoUrl ? { repoUrl } : {}),
        ...(agent ? { agent } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      };

      const [byEmail] = await database
        .select({ id: interopTools.id })
        .from(interopTools)
        .where(eq(interopTools.email, input.email))
        .limit(1);

      const [byVoter] = input.voterKey
        ? await database
            .select({ id: interopTools.id, email: interopTools.email })
            .from(interopTools)
            .where(eq(interopTools.voterKey, input.voterKey))
            .limit(1)
        : [];

      if (byEmail) {
        await database.update(interopTools).set(patch).where(eq(interopTools.id, byEmail.id));
      } else if (byVoter) {
        // Their vote made the row; this is the moment it gains an address.
        await database
          .update(interopTools)
          .set({ ...patch, email: input.email })
          .where(eq(interopTools.id, byVoter.id));
      } else if (repoUrl || agent || name) {
        await database
          .insert(interopTools)
          .values({ email: input.email, voterKey: input.voterKey ?? null, name, repoUrl, agent });
      }

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

  /**
   * Public: leave the Circle (every future week).
   *
   * Takes the signed token from the email footer, not a bare address. Taking an
   * address meant anyone who knew someone's email could cancel their sign-ups,
   * and the person would only find out by not being reminded. The token is the
   * same one the preferences centre issues, so it proves the caller received
   * mail at that address.
   */
  leave: publicProcedure
    .use(rateLimited(CONTACT_LIMIT))
    .input(z.object({ token: z.string().min(16).max(2048) }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const email = await verifyPrefsToken(input.token);
      if (!email) throw new TRPCError({ code: "FORBIDDEN", message: "That unsubscribe link is not valid any more." });
      await leaveCircle(database, email);
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
      // The offered set is a setting, so the panel edits what is live rather
      // than what happened to be compiled into the admin bundle.
      offered: await offeredSlots(),
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
  /**
   * Admin: choose which weekdays the Circle offers and at what Pacific hour.
   * An empty list is refused rather than stored, because a vote with no slots
   * is a page with nothing to click.
   */
  adminSetOfferedSlots: adminProcedure
    .input(z.object({
      slots: z.array(z.object({
        key: z.enum(INTEROP_SLOTS),
        hourPT: z.number().int().min(0).max(23),
      })).min(1).max(INTEROP_SLOTS.length),
    }))
    .mutation(async ({ input }) => {
      await setSiteSetting(INTEROP_SLOTS_SETTING, serializeOfferedSlots(input.slots as { key: InteropSlotKey; hourPT: number }[]));
      // The scheduled slot may no longer be on offer, so rebuild the weeks.
      const result = await syncInteropCircle({ force: true });
      return { ok: true as const, offered: await offeredSlots(), synced: result != null };
    }),

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
