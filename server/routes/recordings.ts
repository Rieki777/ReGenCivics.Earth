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
          forumPostId: recordings.forumPostId,
          featured: recordings.featured,
          createdAt: recordings.createdAt,
        })
        .from(recordings)
        .orderBy(desc(recordings.sessionDate))
        .limit(input?.limit ?? 20);
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

      // Import and call the email sender from the webhook handler
      const { sendEmail: sendResend, APP_BASE_URL } = await import("../_core/email");
      const { getActiveNewsletterSubscribers } = await import("../db");

      const subscribers = await getActiveNewsletterSubscribers();
      if (!subscribers.length) return { sent: 0, message: "No active subscribers" };

      const sessionDateStr = rec.sessionDate
        ? rec.sessionDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        : "Recent session";

      const forumUrl = rec.forumPostId
        ? `${APP_BASE_URL}/community/post/${rec.forumPostId}`
        : null;

      const watchBtn = rec.youtubeUrl
        ? `<a href="${rec.youtubeUrl}" style="display:inline-block;background:#FF0000;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:0 8px 8px 0;">▶ Watch Recording</a>`
        : "";
      const forumBtn = forumUrl
        ? `<a href="${forumUrl}" style="display:inline-block;background:#1a472a;color:#7dd87d;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;border:2px solid #7dd87d;margin:0 8px 8px 0;">💬 Join the Discussion</a>`
        : "";
      const summaryBlock = rec.aiSummary
        ? `<div style="background:#f0f7f0;border-left:4px solid #7dd87d;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;"><p style="color:#1a472a;font-weight:bold;margin:0 0 8px 0;">What we covered</p><p style="color:#2d5a3d;margin:0;line-height:1.7;">${rec.aiSummary}</p></div>`
        : "";

      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#1a472a 0%,#2d5a3d 100%);padding:30px 20px;text-align:center;border-radius:8px 8px 0 0;">
          <h1 style="color:#7dd87d;margin:0;font-size:22px;">ReGen Civics</h1>
          <p style="color:#a8e6a8;margin:6px 0 0 0;font-size:12px;">Recording ready</p>
        </div>
        <div style="padding:30px 24px;background:#fff;border:1px solid #e0e0e0;border-top:none;">
          <h2 style="color:#1a472a;margin:0 0 6px 0;font-size:20px;">${rec.title}</h2>
          <p style="color:#888;font-size:13px;margin:0 0 20px 0;">${sessionDateStr}</p>
          ${summaryBlock}
          <p style="color:#444;line-height:1.7;margin:20px 0;">The recording from our latest community session is ready. Watch it back, share it, or drop a reply in the forum.</p>
          <div style="margin:24px 0;">${watchBtn}${forumBtn}</div>
        </div>
        <div style="background:#f0f7f0;padding:20px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;">
          <p style="color:#888;font-size:12px;margin:0;">You're receiving this because you subscribed to ReGen Civics updates.<br/><a href="${APP_BASE_URL}/settings" style="color:#7dd87d;">Update email preferences</a></p>
        </div>
      </div>`;

      const emails = subscribers.map((s) => s.email);
      const BATCH = 50;
      let totalSent = 0;
      for (let i = 0; i < emails.length; i += BATCH) {
        const batch = emails.slice(i, i + BATCH);
        await sendResend({ to: batch, subject: `Recording ready: ${rec.title}`, html, template: "recording_summary" });
        totalSent += batch.length;
      }

      await database.update(recordings).set({ emailSent: 1 }).where(eq(recordings.id, input.id));
      return { sent: totalSent };
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
});
