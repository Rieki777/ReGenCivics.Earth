/**
 * Season Schedule tRPC router (/season-schedule).
 *
 * The land projects in a Season raise a hand for every weekly time they can
 * make, and when the vote closes the time with the most hands becomes the
 * Season's time (rules in shared/seasonSchedule.ts, the move itself in
 * server/lib/seasonSchedule.ts, ADR-64).
 *
 * Public on purpose, like the Interoperability Circle's vote: most project
 * members have no account, so the browser holds a random voterKey and that key
 * owns the vote, one row per key per Season, updated in place.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { adminProcedure, publicProcedure, rateLimited, router } from "../_core/trpc";
import { getDb, setSiteSetting } from "../db";
import { seasonScheduleVotes } from "../../drizzle/schema";
import {
  ACTIVE_SEASON,
  SEASON_FACILITATION_MAX,
  SEASON_SLOT_KEYS,
  SEASON_TOPIC_MAX,
  nextSessionWeek,
  seasonConfig,
  seasonRegister,
  seasonSettingKey,
  serializeOfferedTimes,
  serializeSeasonSlots,
  type SeasonScheduleConfig,
  type SeasonSlotTime,
} from "@shared/seasonSchedule";
import { cleanRepoUrl } from "@shared/interopTools";
import {
  recordSeasonFeedback,
  resolveSeasonState,
  seasonClosesAt,
  seasonEpisodeRows,
  seasonFeedbackCount,
  seasonFeedbackRows,
  syncSeason,
  syncSeasonSchedules,
} from "../lib/seasonSchedule";
import { cleanDisplayName } from "./interopSessions";

/**
 * Every mutation here is public and unauthenticated, so each carries a per-IP
 * ceiling. Generous, because moving your own hands a few times is normal and a
 * whole land project may share one address; it is there to make minting fresh
 * voterKeys in a loop slow.
 */
const VOTE_LIMIT = { windowMs: 60_000, max: 20 };

/** Notes are written, not tapped: a handful a minute is plenty for a real person. */
const NOTE_LIMIT = { windowMs: 60_000, max: 5 };

/** A voterKey as the client generates it. Opaque to the server, so bound, not parsed. */
const voterKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);
const seasonInput = z.string().max(50).optional();

function configFor(season: string | undefined): SeasonScheduleConfig {
  const config = seasonConfig(season ?? ACTIVE_SEASON);
  if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "That Season has no schedule." });
  return config;
}

function closeLabel(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/Los_Angeles", timeZoneName: "short",
  });
}

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return db;
}

export const seasonScheduleRouter = router({
  /**
   * Public: the offer, the live tally, where the vote stands, and every week's
   * session as scheduled. Names, projects, titles and times only.
   */
  state: publicProcedure
    .input(z.object({ season: seasonInput }).optional())
    .query(async ({ input }) => {
      const config = configFor(input?.season);
      const db = await database();
      // Throttled to one run a minute, so the close applies on the next page
      // view even between reminder sweeps.
      await syncSeasonSchedules();
      const now = new Date();
      const state = await resolveSeasonState(db, config, now, cleanDisplayName);
      const rows = await seasonEpisodeRows(db, config.season);
      const nextWeek = nextSessionWeek(
        rows.map((r) => ({ week: r.week, start: new Date(r.startTime), status: r.status })),
        now,
      );
      let notesForNext = 0;
      if (nextWeek != null) {
        try {
          notesForNext = await seasonFeedbackCount(db, config.season, nextWeek);
        } catch (err) {
          console.error("[seasonSchedule] feedback count failed:", err);
        }
      }
      return {
        season: state.season,
        name: state.name,
        offered: state.offered,
        tally: state.tally.slots,
        voters: state.tally.voters,
        leader: state.leader,
        pinned: state.pinned != null,
        closesAt: state.closesAt,
        closed: state.closed,
        scheduled: state.scheduled,
        // The projects in the room: names, projects and links people chose to
        // share. The links are cleaned again on the way out, so a row written
        // before the cleaner, or by any future caller, is still safe in an href.
        register: seasonRegister(state.votes, cleanDisplayName, cleanRepoUrl),
        nextWeek,
        notesForNext,
        sessions: rows
          .filter((r) => r.week != null && r.status !== "cancelled")
          .map((r) => ({
            week: r.week as number,
            title: r.title,
            startTime: r.startTime,
            endTime: r.endTime,
            status: r.status,
          })),
      };
    }),

  /**
   * Public: set every time this voter can make. The same voterKey always owns
   * the same row, so calling again replaces that person's hands instead of
   * stuffing the count. An empty list withdraws the vote.
   */
  setSlots: publicProcedure
    .use(rateLimited(VOTE_LIMIT))
    .input(z.object({
      season: seasonInput,
      voterKey: voterKeySchema,
      slots: z.array(z.enum(SEASON_SLOT_KEYS)).max(SEASON_SLOT_KEYS.length),
      // Bounded well above the columns so a long paste is trimmed by
      // cleanDisplayName rather than rejected with nothing to show for it.
      displayName: z.string().max(200).optional(),
      projectName: z.string().max(300).optional(),
      projectUrl: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const config = configFor(input.season);
      const db = await database();
      const now = new Date();
      const closesAt = await seasonClosesAt(config);
      if (now.getTime() >= closesAt.getTime()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Voting for ${config.name} closed ${closeLabel(closesAt)}.`,
        });
      }

      // The link is public and ends up in an href, so only http and https
      // survive. Something typed that does not clean is refused out loud,
      // rather than dropped where the person cannot see it vanish.
      const projectUrl = cleanRepoUrl(input.projectUrl);
      if (input.projectUrl && input.projectUrl.trim() && !projectUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That does not look like a link. Use a web address, like yourproject.org.",
        });
      }

      // Only times on offer count. A stale tab holding a retired time would
      // otherwise keep voting for something nobody can pick any more. An empty
      // list withdraws the hands but keeps the row, because the same row holds
      // the project and link on the register; the tally ignores it.
      const state = await resolveSeasonState(db, config, now);
      const offered = new Set(state.offered.map((o) => o.key));
      const stored = serializeSeasonSlots(input.slots.filter((k) => offered.has(k)));

      const displayName = cleanDisplayName(input.displayName);
      const projectName = cleanDisplayName(input.projectName);
      await db
        .insert(seasonScheduleVotes)
        .values({ season: config.season, voterKey: input.voterKey, slots: stored, displayName, projectName, projectUrl })
        .onDuplicateKeyUpdate({
          set: { slots: stored, displayName, projectName, projectUrl, updatedAt: sql`CURRENT_TIMESTAMP` },
        });
      return { ok: true as const };
    }),

  /**
   * Public: put a project, a link and a name on the register without touching
   * the hands. Works before, during and after voting, because the register is
   * the cohort's common ground for the whole Season: who is in the room and
   * where to find their work. Blank fields never erase what is already there.
   */
  setProject: publicProcedure
    .use(rateLimited(VOTE_LIMIT))
    .input(z.object({
      season: seasonInput,
      voterKey: voterKeySchema,
      displayName: z.string().max(200).optional(),
      projectName: z.string().max(300).optional(),
      projectUrl: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const config = configFor(input.season);
      const projectUrl = cleanRepoUrl(input.projectUrl);
      if (input.projectUrl && input.projectUrl.trim() && !projectUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That does not look like a link. Use a web address, like yourproject.org.",
        });
      }
      const displayName = cleanDisplayName(input.displayName);
      const projectName = cleanDisplayName(input.projectName);
      if (!displayName && !projectName && !projectUrl) return { ok: true as const };
      const db = await database();
      await db
        .insert(seasonScheduleVotes)
        .values({ season: config.season, voterKey: input.voterKey, slots: "", displayName, projectName, projectUrl })
        .onDuplicateKeyUpdate({
          set: {
            ...(displayName ? { displayName } : {}),
            ...(projectName ? { projectName } : {}),
            ...(projectUrl ? { projectUrl } : {}),
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        });
      return { ok: true as const };
    }),

  /**
   * Public: a note for the organizers, filed against the next session. What
   * the cohort wants to talk about, and how the facilitation is landing, taken
   * in week by week as the Season runs. Only admins can read notes back; the
   * page shows a count. A note with no name is anonymous: nothing else ties
   * it to a person.
   */
  sendFeedback: publicProcedure
    .use(rateLimited(NOTE_LIMIT))
    .input(z.object({
      season: seasonInput,
      topic: z.string().max(SEASON_TOPIC_MAX * 2).optional(),
      facilitation: z.string().max(SEASON_FACILITATION_MAX * 2).optional(),
      displayName: z.string().max(200).optional(),
      projectName: z.string().max(300).optional(),
    }))
    .mutation(async ({ input }) => {
      const config = configFor(input.season);
      if (!input.topic?.trim() && !input.facilitation?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Write something in either box first." });
      }
      const db = await database();
      const result = await recordSeasonFeedback(
        db,
        config,
        {
          topic: input.topic,
          facilitation: input.facilitation,
          displayName: cleanDisplayName(input.displayName),
          projectName: cleanDisplayName(input.projectName),
        },
        new Date(),
      );
      return { ok: true as const, week: result.week };
    }),

  /** Admin: every note for the Season, newest first. */
  adminFeedback: adminProcedure
    .input(z.object({ season: seasonInput }).optional())
    .query(async ({ input }) => {
      const config = configFor(input?.season);
      return seasonFeedbackRows(await database(), config.season);
    }),

  /** Admin: the vote, the settings, and every week with its admin-only flags. */
  adminState: adminProcedure
    .input(z.object({ season: seasonInput }).optional())
    .query(async ({ input }) => {
      const config = configFor(input?.season);
      const db = await database();
      const state = await resolveSeasonState(db, config, new Date(), cleanDisplayName);
      const rows = await seasonEpisodeRows(db, config.season);
      return {
        ...state,
        opening: config.opening,
        defaultClosesAt: config.closesAt,
        sessions: rows.map((r) => ({
          id: r.id,
          week: r.week,
          title: r.title,
          startTime: r.startTime,
          status: r.status,
          manualOverride: !!r.manualOverride,
        })),
      };
    }),

  /**
   * Admin: which weekdays the Season offers and at what Pacific hour. An empty
   * list is refused rather than stored: a vote with no times is a page with
   * nothing to tap.
   */
  adminSetOffered: adminProcedure
    .input(z.object({
      season: seasonInput,
      slots: z.array(z.object({
        key: z.enum(SEASON_SLOT_KEYS),
        hourPT: z.number().int().min(0).max(23),
      })).min(1).max(SEASON_SLOT_KEYS.length),
    }))
    .mutation(async ({ input }) => {
      const config = configFor(input.season);
      await setSiteSetting(seasonSettingKey(config.season, "offered"), serializeOfferedTimes(input.slots as SeasonSlotTime[]));
      const result = await syncSeason(await database(), config, new Date());
      return { ok: true as const, result };
    }),

  /**
   * Admin: when this round of voting closes. A time in the past closes it now;
   * a later time reopens it. null goes back to the Season's default.
   */
  adminSetClosesAt: adminProcedure
    .input(z.object({ season: seasonInput, closesAt: z.string().datetime().nullable() }))
    .mutation(async ({ input }) => {
      const config = configFor(input.season);
      await setSiteSetting(seasonSettingKey(config.season, "closes_at"), input.closesAt ?? "");
      const result = await syncSeason(await database(), config, new Date());
      return { ok: true as const, result };
    }),

  /** Admin: pin the Season to one offered time (overrides the vote), or clear the pin. */
  adminPin: adminProcedure
    .input(z.object({ season: seasonInput, slot: z.enum(SEASON_SLOT_KEYS).nullable() }))
    .mutation(async ({ input }) => {
      const config = configFor(input.season);
      await setSiteSetting(seasonSettingKey(config.season, "pinned"), input.slot ?? "");
      const result = await syncSeason(await database(), config, new Date());
      return { ok: true as const, result };
    }),

  /** Admin: run the sync now instead of waiting for the next sweep. */
  adminSync: adminProcedure
    .input(z.object({ season: seasonInput }).optional())
    .mutation(async ({ input }) => {
      const config = configFor(input?.season);
      const result = await syncSeason(await database(), config, new Date());
      return { ok: true as const, result };
    }),
});
