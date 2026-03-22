/**
 * Events + Event Signups tRPC Router
 * Powers the Schedule page (public) and Admin > Events (admin CRUD).
 * Also handles per-event reminder email signups.
 */

import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { events, eventSignups, agendaSuggestions } from "../../drizzle/schema";
import { newsletterSubscribers, recordings } from "../../drizzle/schema";
import { and, asc, desc, eq, gte, lte, lt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendEmail, APP_BASE_URL } from "../_core/email";
import { notifyNewEvent } from "../_core/notify";
import { pushEventToGoogleCalendar } from "../_core/googlecal";
import * as db from "../db";

// ─────────────────────────────────────────────────────────────
// Seed data — used to pre-populate the DB if it's empty
// These are the 15 events that were previously hardcoded in Schedule.tsx
// ─────────────────────────────────────────────────────────────
const SEED_EVENTS = [
  {
    title: "Season 2 Community Session",
    description: "Join us for an open introduction to Season 2! Learn about the program, meet the community, discover if this journey is right for your land project, and help us select the best day/time for the 13-week episodes.",
    type: "open" as const,
    startTime: new Date("2026-03-29T18:00:00Z"),
    endTime: new Date("2026-03-29T20:00:00Z"),
    timezone: "EST",
    season: "Open",
    episodeNumber: null,
    status: "upcoming" as const,
  },
  {
    title: "ReGen Civics Alliance Launch Party",
    description: "Speaking during the main portion of this event is invite only. Apply to be an alliance member if you'd like to be considered for an invitation. However, anyone can attend the call and see the magic.",
    type: "open" as const,
    startTime: new Date("2026-04-22T15:00:00Z"),
    endTime: new Date("2026-04-22T18:00:00Z"),
    timezone: "EDT",
    season: "Open",
    episodeNumber: null,
    status: "upcoming" as const,
  },
  ...Array.from({ length: 13 }, (_, i) => {
    const weekNum = i + 1;
    const titles = [
      "Week 1: Selection Day",
      "Week 2: Incubator Overview",
      "Week 3: Land & Vision",
      "Week 4: Governance Design",
      "Week 5: Financial Models",
      "Week 6: Community Building",
      "Week 7: Ecosystem Mapping",
      "Week 8: Fundraising Strategy",
      "Week 9: Legal Structures",
      "Week 10: Token Design",
      "Week 11: Alliance Partnerships",
      "Week 12: Demo Day Prep",
      "Week 13: Demo Day",
    ];
    const descriptions = [
      "First steps of the ReGen Civics Incubator. Meet the selected projects, set intentions, and begin mapping your regenerative vision together.",
      "Starting Season 2! Deep dive into the incubator structure, expectations, and how we'll journey together over the next 13 episodes.",
      "Exploring land-based projects and the visions behind them. Mapping bioregions, ecosystems, and community relationships.",
      "How do regenerative communities make decisions together? Designing governance systems that work at the land level.",
      "Alternative economic models for land projects: gift economies, contribution systems, community currencies, and cooperative finance.",
      "Building resilient communities around land projects. Onboarding members, running events, and creating belonging.",
      "Mapping the broader ecosystem of partners, resources, and organizations each project is embedded in.",
      "How to raise funds ethically and regeneratively. Grant strategy, community fundraising, and impact investing.",
      "Legal structures for land projects: land trusts, cooperatives, DAOs, and hybrid models.",
      "Introduction to the $ReGen token and ReGen Civics Fund. How community currencies support land projects.",
      "Connecting with other land projects and building alliances. The ReGen Civics Alliance and cross-project collaboration.",
      "Preparing your project for Demo Day. Synthesizing your journey and articulating your next steps.",
      "Final presentations from all Season 2 incubator projects. Celebration, feedback, and next steps.",
    ];
    // Season 2 starts Sept 26, 2026. Each episode is 7 days apart.
    const startBase = new Date("2026-09-26T15:00:00Z");
    startBase.setDate(startBase.getDate() + i * 7);
    const endDate = new Date(startBase);
    endDate.setHours(endDate.getHours() + 2);
    return {
      title: titles[i],
      description: descriptions[i],
      type: "episode" as const,
      startTime: new Date(startBase),
      endTime: endDate,
      timezone: "EDT",
      season: "Season 2",
      episodeNumber: weekNum,
      status: "upcoming" as const,
    };
  }),
];

// ─────────────────────────────────────────────────────────────
// Helper: ensure events are seeded from the hardcoded list
// ─────────────────────────────────────────────────────────────
async function ensureEventsSeed() {
  try {
    const database = await getDb();
    if (!database) return;
    const [{ count }] = await database.select({ count: sql<number>`count(*)` }).from(events);
    if (Number(count) === 0) {
      await database.insert(events).values(SEED_EVENTS as any);
    }
  } catch {
    // Non-fatal — seed runs once, fails silently if table not ready yet
  }
}

// ─────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────
export const eventsRouter = router({

  // ── Public: list upcoming events for the Schedule page ────
  list: publicProcedure
    .input(z.object({
      includeCompleted: z.boolean().default(false),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];

      await ensureEventsSeed();

      const all = await database
        .select()
        .from(events)
        .orderBy(asc(events.startTime))
        .limit(input?.limit ?? 50);

      return input?.includeCompleted
        ? all
        : all.filter(e => e.status !== "cancelled" && e.status !== "completed");
    }),

  // ── Public: signup counts for all upcoming events (#8 social proof) ──
  publicSignupCounts: publicProcedure.query(async () => {
    const database = await getDb();
    if (!database) return [];
    return database
      .select({
        eventId: eventSignups.eventId,
        count: sql<number>`count(*)`,
      })
      .from(eventSignups)
      .where(eq(eventSignups.signupType, "reminder"))
      .groupBy(eventSignups.eventId);
  }),

  // ── Public: sign up for a specific event reminder or waitlist ──────
  signup: publicProcedure
    .input(z.object({
      eventId: z.number(),
      email: z.string().email(),
      name: z.string().max(255).optional(),
      phone: z.string().max(30).optional(), // #4 SMS
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify event exists
      const [event] = await database
        .select()
        .from(events)
        .where(eq(events.id, input.eventId))
        .limit(1);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });

      // #11 — check capacity for waitlist
      let signupType: "reminder" | "waitlist" = "reminder";
      if (event.maxAttendees) {
        const [{ count }] = await database
          .select({ count: sql<number>`count(*)` })
          .from(eventSignups)
          .where(and(eq(eventSignups.eventId, input.eventId), eq(eventSignups.signupType, "reminder")));
        if (Number(count) >= event.maxAttendees) signupType = "waitlist";
      }

      // Upsert (ignore duplicate — unique constraint on eventId+email)
      try {
        await database.insert(eventSignups).values({
          eventId: input.eventId,
          email: input.email,
          name: input.name ?? null,
          phone: input.phone ?? null,
          signupType,
        });
      } catch (e: any) {
        if (e?.code === "ER_DUP_ENTRY") return { success: true, alreadySignedUp: true, signupType: "reminder" as const };
        throw e;
      }

      // #1 — Signup confirmation email (fire-and-forget)
      const dateStr = event.startTime.toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      const timeStr = event.startTime.toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit",
      });
      const tz = event.timezone ?? "UTC";
      const joinUrl = event.riversideRoomUrl ?? event.zoomUrl ?? `${APP_BASE_URL}/schedule`;
      const joinLabel = event.riversideRoomUrl ? "Join on Riverside" : "Join on Zoom";
      const joinColor = event.riversideRoomUrl ? "#7c3aed" : "#2d8cff";

      const confirmSubject = signupType === "waitlist"
        ? `You're on the waitlist: ${event.title}`
        : `You're on the list: ${event.title}`;

      const confirmHtml = signupType === "waitlist"
        ? `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#1a472a 0%,#2d5a3d 100%);padding:30px 20px;text-align:center;border-radius:8px 8px 0 0;">
              <h1 style="color:#7dd87d;margin:0;font-size:22px;">ReGen Civics</h1>
            </div>
            <div style="padding:30px 24px;background:#fff;border:1px solid #e0e0e0;border-top:none;">
              <h2 style="color:#1a472a;margin:0 0 10px 0;">You're on the waitlist</h2>
              <p style="color:#444;line-height:1.7;">${event.title} is currently full. We'll email you if a spot opens up before ${dateStr} at ${timeStr} ${tz}.</p>
              <p style="color:#888;font-size:13px;margin:20px 0 0 0;"><a href="${APP_BASE_URL}/schedule" style="color:#7dd87d;">View all events →</a></p>
            </div>
          </div>`
        : `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#1a472a 0%,#2d5a3d 100%);padding:30px 20px;text-align:center;border-radius:8px 8px 0 0;">
              <h1 style="color:#7dd87d;margin:0;font-size:22px;">ReGen Civics</h1>
              <p style="color:#a8e6a8;margin:6px 0 0 0;font-size:13px;">You're on the list</p>
            </div>
            <div style="padding:30px 24px;background:#fff;border:1px solid #e0e0e0;border-top:none;">
              <h2 style="color:#1a472a;margin:0 0 6px 0;">${event.title}</h2>
              <p style="color:#444;font-size:15px;margin:0 0 20px 0;">${dateStr} at ${timeStr} ${tz}</p>
              <p style="color:#444;line-height:1.7;margin:0 0 24px 0;">We'll send you a reminder the day before. See you there.</p>
              <a href="${joinUrl}" style="display:inline-block;background:${joinColor};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:0 8px 8px 0;">${joinLabel}</a>
              <a href="${APP_BASE_URL}/schedule" style="display:inline-block;background:#1a472a;color:#7dd87d;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;border:2px solid #7dd87d;">View Schedule</a>
            </div>
            <div style="background:#f0f7f0;padding:16px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;">
              <p style="color:#888;font-size:12px;margin:0;">You signed up for a reminder. <a href="${APP_BASE_URL}/schedule" style="color:#7dd87d;">View all events</a></p>
            </div>
          </div>`;

      sendEmail({ to: [input.email], subject: confirmSubject, html: confirmHtml, template: "event_signup_confirm" })
        .catch(err => console.error("[events.signup] confirm email error:", err));

      return { success: true, alreadySignedUp: false, signupType };
    }),

  // ── Public: submit an agenda suggestion (#9) ───────────────
  suggestAgendaItem: publicProcedure
    .input(z.object({
      eventId: z.number(),
      authorEmail: z.string().email(),
      authorName: z.string().max(255).optional(),
      suggestion: z.string().min(5).max(1000),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await database.insert(agendaSuggestions).values({
        eventId: input.eventId,
        authorEmail: input.authorEmail,
        authorName: input.authorName ?? null,
        suggestion: input.suggestion,
      });
      return { success: true };
    }),

  // ── Admin: list all events (including completed/cancelled) ─
  adminList: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) return [];
    await ensureEventsSeed();
    return database.select().from(events).orderBy(asc(events.startTime));
  }),

  // ── Admin: get signup count per event ─────────────────────
  signupCounts: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) return [];
    return database
      .select({
        eventId: eventSignups.eventId,
        count: sql<number>`count(*)`,
      })
      .from(eventSignups)
      .groupBy(eventSignups.eventId);
  }),

  // ── Admin: get signups for a specific event ───────────────
  signupsForEvent: adminProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      return database
        .select()
        .from(eventSignups)
        .where(eq(eventSignups.eventId, input.eventId))
        .orderBy(desc(eventSignups.createdAt));
    }),

  // ── Admin: list pending agenda suggestions ────────────────
  listAgendaSuggestions: adminProcedure
    .input(z.object({ eventId: z.number().optional() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      const query = database.select().from(agendaSuggestions).orderBy(desc(agendaSuggestions.createdAt));
      return input?.eventId
        ? query.where(eq(agendaSuggestions.eventId, input.eventId))
        : query;
    }),

  // ── Admin: approve/reject agenda suggestion ───────────────
  updateAgendaSuggestion: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await database.update(agendaSuggestions).set({ status: input.status }).where(eq(agendaSuggestions.id, input.id));
      return { success: true };
    }),

  // ── Admin: create a new event ─────────────────────────────
  create: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      type: z.enum(["open", "episode", "special"]).default("open"),
      startTime: z.string(), // ISO string
      endTime: z.string().optional(),
      timezone: z.string().max(10).default("UTC"),
      zoomUrl: z.string().url().optional(),
      riversideRoomUrl: z.string().url().optional(),
      youtubeUrl: z.string().url().optional(),
      season: z.string().max(50).optional(),
      episodeNumber: z.number().int().optional(),
      maxAttendees: z.number().int().optional(), // #11
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await database.insert(events).values({
        title: input.title,
        description: input.description ?? null,
        type: input.type,
        startTime: new Date(input.startTime),
        endTime: input.endTime ? new Date(input.endTime) : null,
        timezone: input.timezone,
        zoomUrl: input.zoomUrl ?? null,
        riversideRoomUrl: input.riversideRoomUrl ?? null,
        youtubeUrl: input.youtubeUrl ?? null,
        season: input.season ?? null,
        episodeNumber: input.episodeNumber ?? null,
        maxAttendees: input.maxAttendees ?? null,
        status: "upcoming",
      });

      const newEventId = (result as any).insertId;

      // #6 — Create a pre-event forum discussion thread
      const forumPostId = await db.createForumPost({
        categoryId: 1, // General; swap for your community events category ID
        authorId: 1,
        title: input.title,
        content: `**${input.title}**\n\n${input.description ?? "Join us for this upcoming session."}\n\nDrop your questions or ideas for this session below. We'll incorporate as many as we can.\n\n*${new Date(input.startTime).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · [View full schedule](${APP_BASE_URL}/schedule)*`,
        tags: ["event", "upcoming"],
        postType: "discussion",
      }).catch(() => null);

      if (forumPostId) {
        await database.update(events).set({ forumThreadId: forumPostId }).where(eq(events.id, newEventId));
      }

      // #2 — Push to Google Calendar (fire-and-forget)
      pushEventToGoogleCalendar({
        title: input.title,
        description: input.description ?? "",
        startTime: new Date(input.startTime),
        endTime: input.endTime ? new Date(input.endTime) : new Date(new Date(input.startTime).getTime() + 2 * 3600000),
        timezone: input.timezone,
      }).catch(err => console.error("[events.create] gcal error:", err));

      // Fire-and-forget channel announcements (Telegram + WhatsApp)
      notifyNewEvent({
        title: input.title,
        startTime: new Date(input.startTime),
        timezone: input.timezone,
        riversideRoomUrl: input.riversideRoomUrl ?? null,
        zoomUrl: input.zoomUrl ?? null,
        season: input.season ?? null,
      }).catch(err => console.error("[events.create] notify error:", err));

      return { success: true, id: newEventId };
    }),

  // ── Admin: update an event ────────────────────────────────
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().nullable().optional(),
      type: z.enum(["open", "episode", "special"]).optional(),
      startTime: z.string().optional(),
      endTime: z.string().nullable().optional(),
      timezone: z.string().max(10).optional(),
      zoomUrl: z.string().url().nullable().optional(),
      riversideRoomUrl: z.string().url().nullable().optional(),
      youtubeUrl: z.string().url().nullable().optional(),
      status: z.enum(["upcoming", "live", "completed", "cancelled"]).optional(),
      season: z.string().max(50).nullable().optional(),
      episodeNumber: z.number().int().nullable().optional(),
      recordingId: z.number().int().nullable().optional(),
      maxAttendees: z.number().int().nullable().optional(), // #11
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, startTime, endTime, ...rest } = input;
      const updateFields: Record<string, any> = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== undefined)
      );
      if (startTime !== undefined) updateFields.startTime = new Date(startTime);
      if (endTime !== undefined) updateFields.endTime = endTime ? new Date(endTime) : null;

      await database.update(events).set(updateFields).where(eq(events.id, id));
      return { success: true };
    }),

  // ── Admin: delete an event ────────────────────────────────
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Also remove all signups for this event
      await database.delete(eventSignups).where(eq(eventSignups.eventId, input.id));
      await database.delete(events).where(eq(events.id, input.id));
      return { success: true };
    }),

  // ── Admin: manually send reminder emails for an event ─────
  sendReminders: adminProcedure
    .input(z.object({
      id: z.number(),
      customSubject: z.string().max(200).optional(), // overrides default subject
      customBody: z.string().max(2000).optional(),   // overrides default body paragraph
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [event] = await database
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });

      const signups = await database
        .select()
        .from(eventSignups)
        .where(and(eq(eventSignups.eventId, input.id), eq(eventSignups.signupType, "reminder")));

      if (!signups.length) return { sent: 0, message: "No signups for this event" };

      const dateStr = event.startTime.toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
      const timeStr = event.startTime.toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit", timeZoneName: "short"
      });
      const joinUrl = event.riversideRoomUrl
        ?? event.zoomUrl
        ?? "https://us06web.zoom.us/j/5776315796?pwd=w43yb4Kpa6WAniIx1tHAqYINj3zoPx.1";
      const joinLabel = event.riversideRoomUrl ? "Join on Riverside" : "Join on Zoom";
      const joinColor = event.riversideRoomUrl ? "#7c3aed" : "#2d8cff";
      const scheduleUrl = `${APP_BASE_URL}/schedule`;

      const subject = input.customSubject?.trim() || `Reminder: ${event.title} is tomorrow`;
      const bodyText = input.customBody?.trim() || (event.description ?? "");

      // #14 — Pull most recent recording AI summary from same season for context
      let prevSummaryBlock = "";
      if (event.season) {
        // Find the most recently completed event in the same season
        const prevEvents = await database.select({ recordingId: events.recordingId })
          .from(events)
          .where(and(
            eq(events.season, event.season),
            eq(events.status, "completed"),
            lt(events.startTime, event.startTime)
          ))
          .orderBy(desc(events.startTime))
          .limit(1);

        if (prevEvents[0]?.recordingId) {
          const [rec] = await database.select({ aiSummary: recordings.aiSummary })
            .from(recordings)
            .where(eq(recordings.id, prevEvents[0].recordingId))
            .limit(1);
          if (rec?.aiSummary) {
            prevSummaryBlock = `<div style="background:#f0f7f0;border-left:4px solid #7dd87d;padding:14px 18px;border-radius:0 8px 8px 0;margin:0 0 24px 0;">
              <p style="color:#1a472a;font-weight:bold;margin:0 0 6px 0;font-size:13px;">Last session covered</p>
              <p style="color:#2d5a3d;margin:0;font-size:14px;line-height:1.6;">${rec.aiSummary}</p>
            </div>`;
          }
        }
      }

      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#1a472a 0%,#2d5a3d 100%);padding:30px 20px;text-align:center;border-radius:8px 8px 0 0;">
          <h1 style="color:#7dd87d;margin:0;font-size:22px;">ReGen Civics</h1>
          <p style="color:#a8e6a8;margin:6px 0 0 0;font-size:13px;">Event reminder</p>
        </div>
        <div style="padding:30px 24px;background:#fff;border:1px solid #e0e0e0;border-top:none;">
          <p style="color:#888;font-size:13px;margin:0 0 6px 0;">Starting in ~24 hours</p>
          <h2 style="color:#1a472a;margin:0 0 6px 0;font-size:20px;">${event.title}</h2>
          <p style="color:#444;font-size:15px;margin:0 0 20px 0;">${dateStr} at ${timeStr}</p>
          ${prevSummaryBlock}
          ${bodyText ? `<p style="color:#444;line-height:1.7;margin:0 0 24px 0;">${bodyText}</p>` : ""}
          <a href="${joinUrl}" style="display:inline-block;background:${joinColor};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:0 8px 8px 0;">${joinLabel}</a>
          <a href="${scheduleUrl}" style="display:inline-block;background:#1a472a;color:#7dd87d;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;border:2px solid #7dd87d;">View Schedule</a>
        </div>
        <div style="background:#f0f7f0;padding:20px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;">
          <p style="color:#888;font-size:12px;margin:0;">You signed up for a reminder for this event.<br/>
          <a href="${APP_BASE_URL}/schedule" style="color:#7dd87d;">View all events</a></p>
        </div>
      </div>`;

      const emails = signups.map(s => s.email);
      const BATCH = 50;
      let totalSent = 0;
      for (let i = 0; i < emails.length; i += BATCH) {
        const batch = emails.slice(i, i + BATCH);
        await sendEmail({ to: batch, subject, html, template: "event_reminder" });
        totalSent += batch.length;
      }

      await database.update(events).set({ reminderSent: 1 }).where(eq(events.id, input.id));
      return { sent: totalSent };
    }),

  // ── Admin: season rollup email (#10) ──────────────────────
  sendSeasonRollup: adminProcedure
    .input(z.object({ season: z.string() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // All completed events in this season
      const seasonEvents = await database.select()
        .from(events)
        .where(and(eq(events.season, input.season), eq(events.status, "completed")))
        .orderBy(asc(events.startTime));

      if (!seasonEvents.length) return { sent: 0, message: "No completed events in this season" };

      // Gather recordings for episode links
      const recordingIds = seasonEvents.map(e => e.recordingId).filter(Boolean) as number[];
      let recMap: Record<number, { title: string; youtubeUrl: string | null; forumPostId: number | null }> = {};
      if (recordingIds.length) {
        const recs = await database.select({ id: recordings.id, title: recordings.title, youtubeUrl: recordings.youtubeUrl, forumPostId: recordings.forumPostId })
          .from(recordings)
          .where(sql`id IN (${recordingIds.join(",")})`);
        recMap = Object.fromEntries(recs.map(r => [r.id, r]));
      }

      // Build episode list HTML
      const episodeRows = seasonEvents.map(ev => {
        const rec = ev.recordingId ? recMap[ev.recordingId] : null;
        const watchLink = rec?.youtubeUrl
          ? `<a href="${rec.youtubeUrl}" style="color:#7dd87d;font-weight:bold;">Watch →</a>`
          : rec ? `<a href="${APP_BASE_URL}/community/post/${rec.forumPostId}" style="color:#7dd87d;">Discussion →</a>` : "";
        const epLabel = ev.episodeNumber ? `Ep ${ev.episodeNumber}: ` : "";
        return `<tr><td style="padding:8px 0;color:#1a472a;font-weight:500;">${epLabel}${ev.title}</td><td style="padding:8px 0;text-align:right;">${watchLink}</td></tr>`;
      }).join("");

      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#1a472a 0%,#2d5a3d 100%);padding:40px 20px;text-align:center;border-radius:8px 8px 0 0;">
          <h1 style="color:#7dd87d;margin:0;font-size:26px;">ReGen Civics</h1>
          <p style="color:#a8e6a8;margin:8px 0 0 0;font-size:16px;">${input.season} — Season Wrap</p>
        </div>
        <div style="padding:32px 24px;background:#fff;border:1px solid #e0e0e0;border-top:none;">
          <p style="color:#444;font-size:16px;line-height:1.7;margin:0 0 28px 0;">Here's what we built together this season. Every session, every conversation, every project that showed up.</p>
          <table style="width:100%;border-collapse:collapse;border-top:2px solid #e0e0e0;">${episodeRows}</table>
          <div style="margin:32px 0 0 0;text-align:center;">
            <a href="${APP_BASE_URL}/schedule" style="display:inline-block;background:#1a472a;color:#7dd87d;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;border:2px solid #7dd87d;">See What's Next</a>
          </div>
        </div>
        <div style="background:#f0f7f0;padding:20px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;">
          <p style="color:#888;font-size:12px;margin:0;">You're receiving this because you subscribed to ReGen Civics updates.<br/>
          <a href="${APP_BASE_URL}/newsletter/unsubscribe" style="color:#7dd87d;">Unsubscribe</a></p>
        </div>
      </div>`;

      // Get all unique emails from event signups for this season + newsletter subscribers
      const seasonSignups = await database.select({ email: eventSignups.email })
        .from(eventSignups)
        .where(sql`eventId IN (${seasonEvents.map(e => e.id).join(",")})`);
      const newsletterSubs = await database.select({ email: newsletterSubscribers.email })
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.status, "active" as any));

      const allEmails = [...new Set([
        ...seasonSignups.map(s => s.email),
        ...newsletterSubs.map(s => s.email),
      ])];

      if (!allEmails.length) return { sent: 0, message: "No recipients" };

      const BATCH = 50;
      let totalSent = 0;
      for (let i = 0; i < allEmails.length; i += BATCH) {
        await sendEmail({
          to: allEmails.slice(i, i + BATCH),
          subject: `${input.season} — Here's what we built together`,
          html,
          template: "season_rollup",
        });
        totalSent += Math.min(BATCH, allEmails.length - i);
      }

      return { sent: totalSent };
    }),
});
