/**
 * Recordings tRPC Router
 * Admin management of Riverside.fm recordings
 */

import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { recordings, events } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

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
          riversideUrl: recordings.riversideUrl,
          thumbnailUrl: recordings.thumbnailUrl,
          overview: recordings.overview,
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

  // Public: get recording linked to a specific event
  byEventId: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;
      const [event] = await database.select({ recordingId: events.recordingId })
        .from(events)
        .where(eq(events.id, input.eventId))
        .limit(1);
      if (!event?.recordingId) return null;
      const [recording] = await database.select({
        id: recordings.id,
        title: recordings.title,
        youtubeUrl: recordings.youtubeUrl,
        riversideUrl: recordings.riversideUrl,
        thumbnailUrl: recordings.thumbnailUrl,
        durationSeconds: recordings.durationSeconds,
      }).from(recordings).where(eq(recordings.id, event.recordingId)).limit(1);
      return recording ?? null;
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
});
