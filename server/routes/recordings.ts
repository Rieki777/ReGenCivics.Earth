/**
 * Recordings tRPC Router
 * Admin management of Riverside.fm recordings
 */

import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { recordings, events as eventsTable, roleHolders } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  RECORDING_CLOSEOUT_FILTERS,
  RECORDING_CLOSEOUT_STATUSES,
  closeoutFilterMatch,
  countCloseoutFilters,
  isRecordingCloseoutFilter,
  resolveCloseoutRow,
  type RecordingCloseoutFilter,
  type RecordingCloseoutStatus,
} from "../../shared/recordingCloseout";
import { loadCloseoutMetaBag, patchCloseoutMeta } from "../lib/recordingCloseoutStore";

export const recordingsRouter = router({
  // Public: list recordings (for a future /recordings page)
  list: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      return database
        .select({
          id: recordings.id,
          title: recordings.title,
          sessionDate: recordings.sessionDate,
          durationSeconds: recordings.durationSeconds,
          youtubeUrl: recordings.youtubeUrl,
          thumbnailUrl: recordings.thumbnailUrl,
          aiSummary: recordings.aiSummary,
          overview: recordings.overview,
          forumPostId: recordings.forumPostId,
          featured: recordings.featured,
          createdAt: recordings.createdAt,
        })
        .from(recordings)
        .orderBy(desc(recordings.sessionDate))
        .limit(input?.limit ?? 20);
    }),

  // Public: full detail for the Schedule page. Overview, chapters (deep-link
  // into the YouTube player), decisions, action items, and the timestamped
  // transcript. Fetched on demand when a recording card is expanded.
  getPublic: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;
      const [rec] = await database
        .select({
          id: recordings.id,
          title: recordings.title,
          sessionDate: recordings.sessionDate,
          durationSeconds: recordings.durationSeconds,
          youtubeUrl: recordings.youtubeUrl,
          editedYoutubeUrl: recordings.editedYoutubeUrl,
          riversideUrl: recordings.riversideUrl,
          thumbnailUrl: recordings.thumbnailUrl,
          overview: recordings.overview,
          aiSummary: recordings.aiSummary,
          decisionsJson: recordings.decisionsJson,
          actionItemsJson: recordings.actionItemsJson,
          chaptersJson: recordings.chaptersJson,
          transcriptJson: recordings.transcriptJson,
          forumPostId: recordings.forumPostId,
        })
        .from(recordings)
        .where(eq(recordings.id, input.id))
        .limit(1);
      return rec ?? null;
    }),

  // Public: get recording linked to a specific event (or unique YouTube match)
  byEventId: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const { findRecordingForEventPublic } = await import("../lib/recordingEventLink");
      return findRecordingForEventPublic(input.eventId);
    }),

  // Admin: full list with all fields
  adminList: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) return [];
    return database
      .select()
      .from(recordings)
      .orderBy(desc(recordings.createdAt));
  }),

  // Admin: get single recording with full details
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rec] = await database
        .select()
        .from(recordings)
        .where(eq(recordings.id, input.id))
        .limit(1);
      if (!rec) throw new TRPCError({ code: "NOT_FOUND" });
      return rec;
    }),

  // Admin: update a recording (set YouTube URL, summary, featured flag, etc.)
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      youtubeUrl: z.string().url().nullable().optional(),
      aiSummary: z.string().nullable().optional(),
      featured: z.number().min(0).max(1).optional(),
      emailSent: z.number().min(0).max(1).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...fields } = input;
      // Filter out undefined values
      const updateFields = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== undefined)
      );
      await database.update(recordings).set(updateFields).where(eq(recordings.id, id));
      return { success: true };
    }),

  // Admin: manually trigger email send for a recording
  sendEmail: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rec] = await database
        .select()
        .from(recordings)
        .where(eq(recordings.id, input.id))
        .limit(1);
      if (!rec) throw new TRPCError({ code: "NOT_FOUND" });

      const { sendRecordingEmail } = await import("../lib/recording-finalize");
      const sent = await sendRecordingEmail(rec);
      await database.update(recordings).set({ emailSent: 1 }).where(eq(recordings.id, input.id));
      return { sent };
    }),

  // Admin: delete a recording record (doesn't touch Riverside, just removes from our DB)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await database.delete(recordings).where(eq(recordings.id, input.id));
      return { success: true };
    }),

  // Admin: list recordings with editorial fields for the edited-cut tab
  adminListRecordings: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      return database
        .select({
          id: recordings.id,
          title: recordings.title,
          sessionDate: recordings.sessionDate,
          youtubeVideoId: recordings.youtubeVideoId,
          editedYoutubeUrl: recordings.editedYoutubeUrl,
          recordingKind: recordings.recordingKind,
          overview: recordings.overview,
          createdAt: recordings.createdAt,
        })
        .from(recordings)
        .orderBy(desc(recordings.createdAt))
        .limit(input?.limit ?? 50);
    }),

  // Admin: force an already-ingested recording through the understand + publish path.
  // Runs transcript -> synthesize -> extract-tasks -> finalize; idempotent.
  reprocess: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { reprocessRecording } = await import("../jobs/coordinationPipeline");
      return reprocessRecording(input.id);
    }),

  // Admin: attach or update the edited YouTube cut for a recording
  setEditedCut: adminProcedure
    .input(z.object({
      recordingId: z.number().int().positive(),
      editedYoutubeUrl: z.string().min(1).max(512).nullable(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [rec] = await database
        .select({ id: recordings.id })
        .from(recordings)
        .where(eq(recordings.id, input.recordingId))
        .limit(1);
      if (!rec) throw new TRPCError({ code: "NOT_FOUND" });
      const raw = input.editedYoutubeUrl?.trim() ?? "";
      let normalized: string | null = null;
      if (raw.length > 0) {
        const candidate = raw.startsWith("http") ? raw : `https://www.youtube.com/watch?v=${raw}`;
        try { new URL(candidate); } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Not a valid URL or video id" }); }
        normalized = candidate;
      }
      await database
        .update(recordings)
        .set({ editedYoutubeUrl: normalized })
        .where(eq(recordings.id, input.recordingId));
      return { ok: true, notified: 0 };
    }),

  // Admin: backfill unique recording↔event links for honesty (Historical Watch).
  repairEventLinks: adminProcedure
    .mutation(async () => {
      const { repairPastEventRecordingLinks } = await import("../lib/recordingEventLink");
      return repairPastEventRecordingLinks({ limit: 200 });
    }),


  // Admin: which recordings already have a post-session Outbound letter (draft/sent).
  postSessionLetterStatuses: adminProcedure
    .input(z.object({
      recordingIds: z.array(z.number().int().positive()).max(200),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database || input.recordingIds.length === 0) return [] as Array<{
        recordingId: number;
        issueId: number;
        status: string;
      }>;
      const { newsletterIssues } = await import("../../drizzle/schema");
      const { inArray } = await import("drizzle-orm");
      const { postSessionLetterIdempotencyKey } = await import("../../shared/postSessionLetter");
      const keys = input.recordingIds.map((id) => postSessionLetterIdempotencyKey(id));
      const rows = await database
        .select({
          id: newsletterIssues.id,
          status: newsletterIssues.status,
          idempotencyKey: newsletterIssues.idempotencyKey,
        })
        .from(newsletterIssues)
        .where(inArray(newsletterIssues.idempotencyKey, keys));
      const out: Array<{ recordingId: number; issueId: number; status: string }> = [];
      for (const row of rows) {
        const key = row.idempotencyKey ?? "";
        const m = /^post-session-letter:rec:(\d+)$/.exec(key);
        if (!m) continue;
        out.push({ recordingId: Number(m[1]), issueId: row.id, status: row.status });
      }
      return out;
    }),

  // Admin: upsert Outbound draft summarizing this session (never auto-sends).
  draftPostSessionLetter: adminProcedure
    .input(z.object({
      recordingId: z.number().int().positive(),
      refreshDraft: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { draftPostSessionLetter } = await import("../lib/postSessionLetter");
      return draftPostSessionLetter({
        recordingId: input.recordingId,
        createdBy: ctx.user.id,
        refreshDraft: input.refreshDraft,
      });
    }),

  /**
   * Admin: recording closeout queue (ownership + due dates).
   * Extends Edited Cuts — sessions that still need cut / publish / link.
   * Meta (assignee, dueDate, workflow status) lives in site_settings; Done is
   * always derived from published editedYoutubeUrl.
   */
  adminCloseoutQueue: adminProcedure
    .input(z.object({
      filter: z.enum(RECORDING_CLOSEOUT_FILTERS).default("open"),
      limit: z.number().int().min(1).max(200).default(100),
    }).optional())
    .query(async ({ input }) => {
      const filter = (input?.filter && isRecordingCloseoutFilter(input.filter)
        ? input.filter
        : "open") as RecordingCloseoutFilter;
      const limit = input?.limit ?? 100;
      const database = await getDb();
      if (!database) {
        return {
          rows: [] as Array<Record<string, unknown>>,
          counts: countCloseoutFilters([]),
          roleOptions: [] as Array<{ roleSlug: string; roleTitle: string; holderName: string | null }>,
        };
      }

      const [recRows, eventRows, holderRows, bag] = await Promise.all([
        database
          .select({
            id: recordings.id,
            title: recordings.title,
            sessionDate: recordings.sessionDate,
            createdAt: recordings.createdAt,
            editedYoutubeUrl: recordings.editedYoutubeUrl,
            youtubeVideoId: recordings.youtubeVideoId,
            youtubeUrl: recordings.youtubeUrl,
            riversideUrl: recordings.riversideUrl,
            recordingKind: recordings.recordingKind,
          })
          .from(recordings)
          .orderBy(desc(recordings.sessionDate), desc(recordings.createdAt))
          .limit(limit),
        database
          .select({
            id: eventsTable.id,
            title: eventsTable.title,
            recordingId: eventsTable.recordingId,
          })
          .from(eventsTable),
        database
          .select({
            roleSlug: roleHolders.roleSlug,
            roleTitle: roleHolders.roleTitle,
            isActive: roleHolders.isActive,
            userId: roleHolders.userId,
          })
          .from(roleHolders),
        loadCloseoutMetaBag(),
      ]);

      const eventByRecording = new Map<number, { id: number; title: string | null }>();
      for (const ev of eventRows) {
        if (ev.recordingId == null) continue;
        if (!eventByRecording.has(ev.recordingId)) {
          eventByRecording.set(ev.recordingId, { id: ev.id, title: ev.title ?? null });
        }
      }

      const nowMs = Date.now();
      const resolved = recRows.map((row) => {
        const meta = bag[String(row.id)] ?? null;
        const event = eventByRecording.get(row.id);
        const r = resolveCloseoutRow(row, meta, {
          eventId: event?.id ?? null,
          nowMs,
        });
        return {
          id: row.id,
          title: row.title,
          sessionDate: row.sessionDate,
          createdAt: row.createdAt,
          editedYoutubeUrl: row.editedYoutubeUrl,
          youtubeVideoId: row.youtubeVideoId,
          recordingKind: row.recordingKind,
          eventId: event?.id ?? null,
          eventTitle: event?.title ?? null,
          status: r.status,
          assignee: r.assignee,
          roleSlug: r.roleSlug,
          unassigned: r.unassigned,
          dueDate: r.dueDate,
          overdue: r.overdue,
          editedHref: r.editedHref,
          eventsHref: r.eventsHref,
        };
      });

      const counts = countCloseoutFilters(resolved);
      const rows = resolved.filter((r) => closeoutFilterMatch(r, filter));

      const roleOptions = holderRows
        .filter((h) => Number(h.isActive) === 1)
        .map((h) => ({
          roleSlug: h.roleSlug,
          roleTitle: h.roleTitle,
          holderName: null as string | null,
        }))
        .sort((a, b) => a.roleTitle.localeCompare(b.roleTitle));

      return { rows, counts, roleOptions };
    }),

  /** Admin: set closeout assignee / due / workflow status (never emails). */
  setCloseoutMeta: adminProcedure
    .input(z.object({
      recordingId: z.number().int().positive(),
      status: z.enum(RECORDING_CLOSEOUT_STATUSES).nullable().optional(),
      assignee: z.string().max(120).nullable().optional(),
      roleSlug: z.string().max(64).nullable().optional(),
      dueDate: z.string().max(10).nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [rec] = await database
        .select({ id: recordings.id })
        .from(recordings)
        .where(eq(recordings.id, input.recordingId))
        .limit(1);
      if (!rec) throw new TRPCError({ code: "NOT_FOUND" });

      if (input.dueDate != null && input.dueDate !== "") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "dueDate must be YYYY-MM-DD" });
        }
      }

      const patch: {
        status?: RecordingCloseoutStatus | null;
        assignee?: string | null;
        roleSlug?: string | null;
        dueDate?: string | null;
      } = {};
      if (input.status !== undefined) patch.status = input.status;
      if (input.assignee !== undefined) patch.assignee = input.assignee;
      if (input.roleSlug !== undefined) patch.roleSlug = input.roleSlug;
      if (input.dueDate !== undefined) patch.dueDate = input.dueDate;

      const saved = await patchCloseoutMeta(input.recordingId, patch);
      return { ok: true as const, meta: saved };
    }),


});