/**
 * Events + Event Signups tRPC Router
 * Powers the Schedule page (public) and Admin > Events (admin CRUD).
 * Also handles per-event reminder email signups.
 */

import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { events, eventSignups } from "../../drizzle/schema";
import { asc, desc, eq, gte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendEmail, APP_BASE_URL } from "../_core/email";

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

  // ── Public: sign up for a specific event reminder ─────────
  signup: publicProcedure
    .input(z.object({
      eventId: z.number(),
      email: z.string().email(),
      name: z.string().max(255).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify event exists
      const [event] = await database
        .select({ id: events.id, title: events.title, startTime: events.startTime })
        .from(events)
        .where(eq(events.id, input.eventId))
        .limit(1);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });

      // Upsert (ignore duplicate — unique constraint on eventId+email)
      try {
        await database.insert(eventSignups).values({
          eventId: input.eventId,
          email: input.email,
          name: input.name ?? null,
        });
      } catch (e: any) {
        // Duplicate entry — already signed up, not an error
        if (e?.code === "ER_DUP_ENTRY") return { success: true, alreadySignedUp: true };
        throw e;
      }

      return { success: true, alreadySignedUp: false };
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
        status: "upcoming",
      });

      return { success: true, id: (result as any).insertId };
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
        .where(eq(eventSignups.eventId, input.id));

      if (!signups.length) return { sent: 0, message: "No signups for this event" };

      const dateStr = event.startTime.toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
      const timeStr = event.startTime.toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit", timeZoneName: "short"
      });
      const zoomUrl = event.zoomUrl ?? "https://us06web.zoom.us/j/5776315796?pwd=w43yb4Kpa6WAniIx1tHAqYINj3zoPx.1";
      const scheduleUrl = `${APP_BASE_URL}/schedule`;

      const subject = input.customSubject?.trim() || `Reminder: ${event.title} is tomorrow`;
      const bodyText = input.customBody?.trim() || (event.description ?? "");

      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#1a472a 0%,#2d5a3d 100%);padding:30px 20px;text-align:center;border-radius:8px 8px 0 0;">
          <h1 style="color:#7dd87d;margin:0;font-size:22px;">ReGen Civics</h1>
          <p style="color:#a8e6a8;margin:6px 0 0 0;font-size:13px;">Event reminder</p>
        </div>
        <div style="padding:30px 24px;background:#fff;border:1px solid #e0e0e0;border-top:none;">
          <p style="color:#888;font-size:13px;margin:0 0 6px 0;">Starting in ~24 hours</p>
          <h2 style="color:#1a472a;margin:0 0 6px 0;font-size:20px;">${event.title}</h2>
          <p style="color:#444;font-size:15px;margin:0 0 20px 0;">${dateStr} at ${timeStr}</p>
          ${bodyText ? `<p style="color:#444;line-height:1.7;margin:0 0 24px 0;">${bodyText}</p>` : ""}
          <a href="${zoomUrl}" style="display:inline-block;background:#2d8cff;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:0 8px 8px 0;">Join on Zoom</a>
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
        await sendEmail({
          to: batch,
          subject,
          html,
          template: "event_reminder",
        });
        totalSent += batch.length;
      }

      await database.update(events).set({ reminderSent: 1 }).where(eq(events.id, input.id));
      return { sent: totalSent };
    }),
});
