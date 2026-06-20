// server/routes/admin.ts
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql, count, like, gte, and, inArray } from "drizzle-orm";
import { applicationEvents, adminNotifications, forumPosts, forumReplies, forumReports, campaigns as campaignsTable, gifts, playerProfiles, govProposals, events as eventsTable, recordings, newsletterSubscribers } from "../../drizzle/schema";
import { applications as applicationsTable } from "../../drizzle/schema";
import { getBannerByKey, getActiveBanners, upsertBanner, deleteBanner, toggleBannerActive } from "../bannerHelpers";
import { ENV } from "../_core/env";
import { generateImage, buildImagePrompt } from "../_core/imageGeneration";
import { invokeLLM } from "../_core/llm";

/**
 * computeEcosystemSnapshot: a single read-only aggregate of the ecosystem's
 * health across the core domains. Powers both the admin.ecosystemSnapshot KPI
 * query and the on-demand admin.briefing (the C-suite update). Phase 1 covers
 * applications, investors, inquiries, community (forum + players), and
 * campaigns; later phases extend it to governance, events, recordings, etc.
 */
async function computeEcosystemSnapshot() {
  const drizzleDb = await getDb();
  if (!drizzleDb) return null;

  const [appStats] = await drizzleDb
    .select({
      total: count(),
      pending: sql<number>`SUM(CASE WHEN ${applicationsTable.status} IN ('submitted','under_review') THEN 1 ELSE 0 END)`,
      approved: sql<number>`SUM(CASE WHEN ${applicationsTable.status} = 'approved' THEN 1 ELSE 0 END)`,
      active: sql<number>`SUM(CASE WHEN ${applicationsTable.status} = 'active' THEN 1 ELSE 0 END)`,
      hectares: sql<number>`SUM(${applicationsTable.projectSizeHectares})`,
    })
    .from(applicationsTable);

  const investors = await db.getAllInvestorInquiries();
  const inquiries = await db.getAllGeneralInquiries();

  // "Since last visit" is approximated as the trailing 7 days. No per-admin
  // state to store, and it still answers the CEO's "what changed?".
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    forumRows, replyRows, playerRows, campaignRows,
    openProposalRows, upcomingEventRows, recordingRows, newsletterRows, pendingReportRows,
    appNew7dRows, forumNew7dRows, replyNew7dRows, playerNew7dRows,
  ] = await Promise.all([
    drizzleDb.select({ c: count() }).from(forumPosts),
    drizzleDb.select({ c: count() }).from(forumReplies),
    drizzleDb.select({ c: count() }).from(playerProfiles),
    drizzleDb.select({ c: count() }).from(campaignsTable),
    drizzleDb.select({ c: count() }).from(govProposals).where(inArray(govProposals.status, ["discussion", "polling", "staged"])),
    drizzleDb.select({ c: count() }).from(eventsTable).where(eq(eventsTable.status, "upcoming")),
    drizzleDb.select({ c: count() }).from(recordings),
    drizzleDb.select({ c: count() }).from(newsletterSubscribers).where(eq(newsletterSubscribers.isActive, 1)),
    drizzleDb.select({ c: count() }).from(forumReports).where(eq(forumReports.status, "pending")),
    drizzleDb.select({ c: count() }).from(applicationsTable).where(gte(applicationsTable.createdAt, weekAgo)),
    drizzleDb.select({ c: count() }).from(forumPosts).where(gte(forumPosts.createdAt, weekAgo)),
    drizzleDb.select({ c: count() }).from(forumReplies).where(gte(forumReplies.createdAt, weekAgo)),
    drizzleDb.select({ c: count() }).from(playerProfiles).where(gte(playerProfiles.createdAt, weekAgo)),
  ]);

  const invBy = (s: string) => investors.filter((i) => ((i.status as string) || "new") === s).length;
  const inqBy = (s: string) => inquiries.filter((i) => ((i.status as string) || "new") === s).length;
  const n = (rows: { c: number }[]) => Number(rows[0]?.c ?? 0);

  return {
    generatedAt: new Date().toISOString(),
    applications: {
      total: Number(appStats?.total ?? 0),
      pending: Number(appStats?.pending ?? 0),
      approved: Number(appStats?.approved ?? 0),
      active: Number(appStats?.active ?? 0),
      hectares: Number(appStats?.hectares ?? 0),
    },
    investors: {
      total: investors.length,
      new: invBy("new"),
      contacted: invBy("contacted"),
      inDiscussion: invBy("in_discussion"),
      committed: invBy("committed"),
    },
    inquiries: {
      total: inquiries.length,
      needsReview: inqBy("new") + inqBy("pending"),
    },
    community: {
      forumPosts: n(forumRows),
      forumReplies: n(replyRows),
      players: n(playerRows),
      newsletterActive: n(newsletterRows),
    },
    moderation: {
      pendingReports: n(pendingReportRows),
    },
    governance: {
      openProposals: n(openProposalRows),
    },
    events: {
      upcoming: n(upcomingEventRows),
      recordings: n(recordingRows),
    },
    campaigns: {
      total: n(campaignRows),
    },
    weekly: {
      newApplications: n(appNew7dRows),
      newForumPosts: n(forumNew7dRows),
      newForumReplies: n(replyNew7dRows),
      newPlayers: n(playerNew7dRows),
    },
  };
}

export type EcosystemSnapshot = NonNullable<Awaited<ReturnType<typeof computeEcosystemSnapshot>>>;

// Admin router
export const adminRouter = router({
  // Get aggregate admin stats for alert banner and overview
  getStats: adminProcedure.query(async () => {
    const drizzleDb = await getDb();
    const [appStats] = await drizzleDb!
      .select({
        totalApplications: count(),
        pendingApplications: sql<number>`SUM(CASE WHEN ${applicationsTable.status} = 'submitted' OR ${applicationsTable.status} = 'under_review' THEN 1 ELSE 0 END)`,
        totalHectares: sql<number>`SUM(${applicationsTable.projectSizeHectares})`,
        totalHouseholds: sql<number>`SUM(${applicationsTable.intendedHouseholdCount})`,
        totalPeople: sql<number>`SUM(${applicationsTable.intendedPeopleCount})`,
      })
      .from(applicationsTable);

    const allInvestors = await db.getAllInvestorInquiries();
    const allInquiries = await db.getAllGeneralInquiries();

    const newInvestorCount = allInvestors.filter((i) => i.status === 'new' || !i.status).length;
    const pendingInquiryCount = allInquiries.filter((i) => (i.status as string) === 'new' || (i.status as string) === 'pending').length;

    return {
      totalApplications: appStats?.totalApplications ?? 0,
      pendingApplications: Number(appStats?.pendingApplications ?? 0),
      pendingInquiries: pendingInquiryCount,
      newInvestors: newInvestorCount,
      totalHectares: Number(appStats?.totalHectares ?? 0),
      totalHouseholds: Number(appStats?.totalHouseholds ?? 0),
      totalPeople: Number(appStats?.totalPeople ?? 0),
    };
  }),

  // Ecosystem snapshot: aggregate KPIs across domains for the Overview dashboard.
  ecosystemSnapshot: adminProcedure.query(async () => {
    return computeEcosystemSnapshot();
  }),

  // C-suite briefing: on-demand AI update. Recomputes the snapshot, then has
  // the "leadership team" report to the CEO grounded only in that data. Returns
  // the snapshot alongside so the client can render KPIs + narrative together.
  briefing: adminProcedure
    .input(z.object({ focus: z.string().max(280).optional() }).optional())
    .mutation(async ({ input }) => {
      const snapshot = await computeEcosystemSnapshot();
      if (!snapshot) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Snapshot unavailable" });
      }

      const system = [
        "You are the senior leadership team of ReGen Civics, a fund and in-real-life game for regenerative land projects, reporting to the CEO in a C-suite standup.",
        "Five chiefs report: Operations (applications, incubator pipeline, upcoming events, recordings), Growth & Community (forum posts and replies, players, inquiries, newsletter, content moderation), Capital & Fund (investors by stage, campaigns), People & Citizenship (members, tiers, who needs welcoming), and Governance (open proposals, decisions, coordination, moderation reports).",
        "The data includes a 'weekly' block: those are the changes in the last 7 days, i.e. what moved since the CEO last checked in. Lead each chief with what changed, then what it means.",
        "Use ONLY the data provided. Never invent numbers. If a domain is zero or empty, say so in one line or omit that chief.",
        "Each chief: 2 to 4 tight bullet updates, then up to 2 decisions that genuinely need the CEO, then up to 2 recommended actions the team could take.",
        "Voice: direct, specific, grounded, the voice of a sharp executive. No fluff, no hype, no em-dashes.",
      ].join(" ");

      const userMsg = [
        "Ecosystem data (JSON):",
        JSON.stringify(snapshot),
        input?.focus ? `\nThe CEO asked this briefing to focus on: ${input.focus}` : "",
      ].join("\n");

      const result = await invokeLLM({
        maxTokens: 2000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        outputSchema: {
          name: "csuite_briefing",
          schema: {
            type: "object",
            properties: {
              headline: { type: "string", description: "One-sentence state of the ecosystem for the CEO." },
              chiefs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    role: { type: "string", description: "e.g. Operations, Growth & Community, Capital & Fund, People & Citizenship, Governance" },
                    bullets: { type: "array", items: { type: "string" } },
                    decisions: { type: "array", items: { type: "string" } },
                    actions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          detail: { type: "string" },
                        },
                        required: ["label"],
                      },
                    },
                  },
                  required: ["role", "bullets"],
                },
              },
            },
            required: ["headline", "chiefs"],
          },
        },
      });

      const content = result.choices?.[0]?.message?.content ?? "{}";
      let briefing: { headline?: string; chiefs?: unknown[] };
      try {
        briefing = JSON.parse(content);
      } catch {
        briefing = { headline: "Briefing could not be generated. Try again.", chiefs: [] };
      }

      return { snapshot, briefing };
    }),

  // Get notification preferences (admin only)
  getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    return db.getNotificationPreferences();
  }),

  // Update notification preferences (admin only)
  updateNotificationPreferences: protectedProcedure
    .input(z.object({
      // Toggle fields (tinyint: 0 or 1)
      applicationSubmissions: z.number().min(0).max(1).optional(),
      investorInquiries: z.number().min(0).max(1).optional(),
      allianceRequests: z.number().min(0).max(1).optional(),
      workWithRegens: z.number().min(0).max(1).optional(),
      roleRequests: z.number().min(0).max(1).optional(),
      loiSubmissions: z.number().min(0).max(1).optional(),
      campaignContributions: z.number().min(0).max(1).optional(),
      newsletterSignups: z.number().min(0).max(1).optional(),
      // Email routing fields (comma-separated emails or null)
      applicationEmails: z.string().nullable().optional(),
      investorEmails: z.string().nullable().optional(),
      allianceEmails: z.string().nullable().optional(),
      workWithRegensEmails: z.string().nullable().optional(),
      roleRequestEmails: z.string().nullable().optional(),
      loiEmails: z.string().nullable().optional(),
      campaignEmails: z.string().nullable().optional(),
      newsletterEmails: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      await db.updateNotificationPreferences(input);
      return { success: true };
    }),

  // ─── Token Stats ─────────────────────────────────────────────────────────
  getTokenStats: adminProcedure.query(async () => {
    const drizzleDb = await getDb();
    if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const [stats] = await drizzleDb.execute(sql`
      SELECT
        COUNT(*) AS totalPlayers,
        SUM(CASE WHEN walletAddress IS NOT NULL AND walletAddress != '' THEN 1 ELSE 0 END) AS playersWithWallet,
        SUM(rvoiceBalance) AS totalRvoice,
        SUM(rgenBalance) AS totalRgen,
        SUM(CASE WHEN isVerified = 1 THEN 1 ELSE 0 END) AS verifiedPlayers
      FROM player_profiles WHERE isActive = 1
    `) as any;
    const row = (stats as any)?.[0] ?? stats;
    const topHolders = await drizzleDb.execute(sql`
      SELECT displayName, walletAddress, rvoiceBalance, rgenBalance, isVerified
      FROM player_profiles WHERE isActive = 1
      ORDER BY (rvoiceBalance + rgenBalance) DESC LIMIT 10
    `) as any;
    return {
      totalPlayers: Number(row?.totalPlayers ?? 0),
      playersWithWallet: Number(row?.playersWithWallet ?? 0),
      totalRvoice: Number(row?.totalRvoice ?? 0),
      totalRgen: Number(row?.totalRgen ?? 0),
      verifiedPlayers: Number(row?.verifiedPlayers ?? 0),
      topHolders: ((topHolders as any)?.[0] ?? topHolders ?? []) as any[],
    };
  }),

  // ─── Application Events ───────────────────────────────────────────────────
  getApplicationEvents: adminProcedure
    .input(z.object({ applicationId: z.number() }))
    .query(async ({ input }) => {
      const drizzleDb = await getDb();
      if (!drizzleDb) return [];
      const events = await drizzleDb.select().from(applicationEvents)
        .where(eq(applicationEvents.applicationId, input.applicationId))
        .orderBy(sql`${applicationEvents.createdAt} DESC`);
      return events;
    }),

  // ─── Notifications sub-router ─────────────────────────────────────────────
  notifications: router({
    list: adminProcedure.query(async () => {
      const drizzleDb = await getDb();
      if (!drizzleDb) return [];
      const now = new Date();
      const rows = await drizzleDb.select().from(adminNotifications)
        .where(sql`${adminNotifications.handledAt} IS NULL`)
        .orderBy(sql`${adminNotifications.createdAt} DESC`);
      return rows.filter((r: any) => !r.snoozedUntil || new Date(r.snoozedUntil) < now);
    }),

    handle: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const drizzleDb = await getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await drizzleDb.update(adminNotifications)
          .set({ handledAt: new Date() })
          .where(eq(adminNotifications.id, input.id));
        return { success: true };
      }),

    snooze: adminProcedure
      .input(z.object({ id: z.number(), days: z.number().min(1).max(30) }))
      .mutation(async ({ input }) => {
        const drizzleDb = await getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const snoozedUntil = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000);
        await drizzleDb.update(adminNotifications)
          .set({ snoozedUntil })
          .where(eq(adminNotifications.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Broadcast sub-router ────────────────────────────────────────────────
  broadcast: router({
    // Get connected Buffer profiles
    getBufferProfiles: adminProcedure.query(async () => {
      const token = ENV.bufferAccessToken;
      if (!token) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Buffer not configured" });
      }
      const response = await fetch(
        `https://api.bufferapp.com/1/profiles.json?access_token=${encodeURIComponent(token)}`
      );
      if (!response.ok) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch Buffer profiles" });
      }
      const profiles = await response.json() as Array<{
        id: string;
        service: string;
        service_username: string;
        formatted_username?: string;
      }>;
      return profiles;
    }),

    // Post to Buffer channels
    postToBuffer: adminProcedure
      .input(z.object({
        text: z.string().min(1).max(500),
        link: z.string().url().optional(),
        profileIds: z.array(z.string()).min(1),
        scheduledAt: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const token = ENV.bufferAccessToken;
        if (!token) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Buffer not configured" });
        }

        const results: Array<{ profileId: string; success: boolean; updateId?: string; error?: string }> = [];

        for (const profileId of input.profileIds) {
          try {
            const params = new URLSearchParams();
            params.append("access_token", token);
            params.append("profile_ids[]", profileId);
            params.append("text", input.text);
            if (input.link) params.append("media[link]", input.link);
            if (input.scheduledAt) {
              params.append("scheduled_at", input.scheduledAt);
              params.append("now", "false");
            } else {
              params.append("now", "true");
            }

            const response = await fetch("https://api.bufferapp.com/1/updates/create.json", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: params.toString(),
            });

            if (!response.ok) {
              const errText = await response.text();
              results.push({ profileId, success: false, error: errText });
            } else {
              const data = await response.json() as {
                updates?: Array<{ id?: string }>;
                update?: { id?: string };
              };
              const updateId =
                data.update?.id ??
                (Array.isArray(data.updates) && data.updates[0]?.id ? data.updates[0].id : undefined);
              results.push({ profileId, success: true, updateId });
            }
          } catch (err) {
            results.push({ profileId, success: false, error: String(err) });
          }
        }

        return { results };
      }),

    // Build a Farcaster compose intent URL
    farcasterIntent: adminProcedure
      .input(z.object({ text: z.string().min(1).max(320) }))
      .mutation(async ({ input }) => {
        const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(input.text)}`;
        return { url };
      }),
  }),

  // Audit log, immutable record of all admin actions
  auditLog: adminProcedure
    .input(z.object({
      adminUserId: z.number().optional(),
      entityType: z.string().optional(),
      limit: z.number().min(1).max(500).optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getAdminAuditLog({
        adminUserId: input?.adminUserId,
        entityType: input?.entityType,
        limit: input?.limit ?? 100,
      });
    }),
});

// ─── Admin AI Chat ────────────────────────────────────────────────────────────
export const adminAIRouter = router({
  chat: adminProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).max(30),
      // Live context snapshot passed from the client
      context: z.object({
        activeTab: z.string().optional(),
        investorCount: z.number().optional(),
        inquiryCount: z.number().optional(),
        applicationCount: z.number().optional(),
        selectedContactEmail: z.string().optional(),
        selectedContactName: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const ctx = input.context ?? {};
      const contextBlock = [
        ctx.activeTab ? `Active admin tab: ${ctx.activeTab}` : null,
        ctx.investorCount !== undefined ? `Total investors in DB: ${ctx.investorCount}` : null,
        ctx.inquiryCount !== undefined ? `Total general inquiries: ${ctx.inquiryCount}` : null,
        ctx.applicationCount !== undefined ? `Total applications: ${ctx.applicationCount}` : null,
        ctx.selectedContactEmail ? `Currently viewing contact: ${ctx.selectedContactName ?? ''} <${ctx.selectedContactEmail}>` : null,
      ].filter(Boolean).join("\n");

      const systemPrompt = `You are an AI admin assistant for ReGen Civics  -  a regenerative civilization project coordinating land projects, alliance organizations, and investors.

You live inside the /admin dashboard and help administrators (like Rieki and the team) coordinate the Infinite Game.

## Your Role
- Help the admin navigate, search, and make sense of the data in the dashboard
- Suggest next actions based on contact status, age of inquiry, and pipeline health
- Draft emails, plan follow-ups, and help prioritize attention
- Explain what each table/tab does and how to use it
- Learn the team's patterns and suggest automations

## Admin Dashboard Tabs
- **Overview**: Key metrics and stats (investor count, inquiry count, applications)
- **Applications**: Land project applications from potential season participants
- **Investors**: Investor inquiry pipeline with status tracking
- **Alliance**: General inquiries (alliance orgs, collaborations, etc.)
- **Live**: People wanting to live at a land project
- **Create**: "Create with ReGens" collaboration requests
- **Other**: Catch-all inquiries
- **Kanban**: Drag-and-drop view of investor/inquiry/application pipelines
- **Settings**: Email templates, newsletter subscribers, scheduled emails

## Available Actions
When you want the admin to take an action, include a JSON action block in your response wrapped in <action> tags. The UI will render these as buttons.

Examples:
<action>{"type":"navigate","tab":"investors","label":"Go to Investors tab"}</action>
<action>{"type":"compose","to":"email@example.com","subject":"Following up on your inquiry","label":"Draft email to contact"}</action>
<action>{"type":"search","query":"search term","label":"Search for this contact"}</action>
<action>{"type":"focus","contactEmail":"email@example.com","label":"Open contact card"}</action>

## Executable actions (you can actually do these)
For reversible operational work, use the "execute" action. The UI runs it through a safety-checked registry: it auto-runs safe actions, asks the admin to confirm medium ones, and refuses high-stakes ones. Available actions:
- inquiry_mark_reviewed {id} - mark a general inquiry reviewed (safe)
- inquiry_archive {id} - archive a general inquiry (safe)
- investor_set_status {id, status} - move an investor to a stage like contacted, in_discussion, committed (confirm)
- banner_toggle {key} - turn a site banner on or off (safe)

Example:
<action>{"type":"execute","actionId":"inquiry_archive","input":{"id":42},"label":"Archive inquiry #42"}</action>

Only propose an execute action when you have the specific id or key from the conversation or context. Never invent ids. For anything destructive or high-stakes (deleting records, bans, rejections, sending money, mass email, public posts), do NOT use execute; tell the admin to do it themselves.

## Current Context
${contextBlock || "No specific context provided."}

## Communication Style
- Be direct, warm, and efficient
- Use bullet points for lists
- Flag urgent items (old inquiries, stale applications)
- Suggest concrete next steps
- When you don't know something specific about the data, say so  -  you can only see what the admin shares with you`;

      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      const response = await invokeLLM({ messages: llmMessages, maxTokens: 1500 });
      const content = response.choices?.[0]?.message?.content ?? "I'm not sure how to help with that. Could you rephrase?";
      return { content };
    }),
});

// ─── Admin Image Studio ───────────────────────────────────────────────────────
export const imageStudioRouter = router({
  generateVariations: adminProcedure
    .input(z.object({
      mode: z.enum(["create", "edit"]),
      contentType: z.enum(["forum", "quest", "campaign", "blog", "video", "profile", "default"]),
      title: z.string().min(1).max(300),
      description: z.string().max(500).optional(),
      editUrl: z.string().optional(),
      editPrompt: z.string().max(300).optional(),
      count: z.number().min(1).max(4).default(4),
    }))
    .mutation(async ({ input }) => {
      const promptTitle = input.mode === "edit" && input.editPrompt
        ? `${input.title}: ${input.editPrompt}`
        : input.title;
      const contextText = buildImagePrompt(input.contentType, promptTitle, input.description);
      const jobs = Array.from({ length: input.count }, (_, i) =>
        generateImage({
          contentType: input.contentType,
          contentId: `studio-${Date.now()}-${i}`,
          contextText,
          temp: true,
        })
      );
      const results = await Promise.all(jobs);
      return { variations: results.map(r => r.url), keys: results.map(r => r.key) };
    }),

  applyVariation: adminProcedure
    .input(z.object({
      selectedKey: z.string(),
      allKeys: z.array(z.string()),
      contentType: z.enum(["forum", "quest", "campaign", "blog", "video", "profile", "default"]),
      title: z.string().min(1).max(300),
      oldFilename: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      const ts = new Date().toISOString().replace(/[-:T]/g, "-").slice(0, 19);
      const newKey = `generated/${ts}-${input.contentType}-${slug}.png`;
      const publicBase = "https://assets.regencivics.earth/";

      // Call the worker to promote: copy selected to permanent key, delete all temps
      const workerUrl = (await import("../_core/env")).ENV.imageGenWorkerUrl;
      const secret = (await import("../_core/env")).ENV.imageGenSecret;
      if (!workerUrl || !secret) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Image gen not configured" });

      const promoteRes = await fetch(`${workerUrl}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${secret}` },
        body: JSON.stringify({ selectedKey: input.selectedKey, allKeys: input.allKeys, newKey }),
      });
      if (!promoteRes.ok) {
        const detail = await promoteRes.text();
        throw new TRPCError({ code: "BAD_GATEWAY", message: `Worker promote failed: ${promoteRes.status} ${detail}` });
      }

      const publicUrl = `${publicBase}${newKey}`;
      let replaced = 0;

      if (input.oldFilename) {
        const d = await getDb();
        if (d) {
          const likeVal = `%${input.oldFilename}%`;
          const fRes = await d.update(forumPosts)
            .set({ generatedImageUrl: publicUrl })
            .where(like(forumPosts.generatedImageUrl, likeVal));
          const cRes = await d.update(campaignsTable)
            .set({ generatedImageUrl: publicUrl })
            .where(like(campaignsTable.generatedImageUrl, likeVal));
          replaced = ((fRes as any)?.rowsAffected ?? 0) + ((cRes as any)?.rowsAffected ?? 0);
        }
      }

      return { publicUrl, replaced };
    }),

  findUsages: adminProcedure
    .input(z.object({ filename: z.string().min(1) }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return { usages: [] };
      const likeVal = `%${input.filename}%`;
      const forumRows = await d.select({ id: forumPosts.id, title: forumPosts.title })
        .from(forumPosts)
        .where(like(forumPosts.generatedImageUrl, likeVal));
      const campaignRows = await d.select({ id: campaignsTable.id, title: campaignsTable.title })
        .from(campaignsTable)
        .where(like(campaignsTable.generatedImageUrl, likeVal));
      const usages = [
        ...forumRows.map(r => ({ source: "forum", id: String(r.id), title: r.title })),
        ...campaignRows.map(r => ({ source: "campaign", id: String(r.id), title: r.title })),
      ];
      return { usages };
    }),
});

// ─── Scheduled Emails ─────────────────────────────────────────────────────────
export const scheduledEmailsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return await db.getScheduledEmails();
  }),

  schedule: protectedProcedure
    .input(z.object({
      recipientEmail: z.string().email(),
      recipientName: z.string().optional(),
      subject: z.string().min(1),
      body: z.string().min(1),
      inquiryType: z.string().optional(),
      scheduledFor: z.string(), // ISO datetime string
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return await db.createScheduledEmail({
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName,
        subject: input.subject,
        body: input.body,
        inquiryType: input.inquiryType || "general",
        scheduledFor: new Date(input.scheduledFor),
      });
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await db.updateScheduledEmailStatus(input.id, 'cancelled');
    }),
});

// ─── Banners ──────────────────────────────────────────────────────────────────
export const bannersRouter = router({
  getByKey: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      return await getBannerByKey(input.key);
    }),
  getActive: publicProcedure.query(async () => {
    return await getActiveBanners();
  }),
  upsert: adminProcedure
    .input(z.object({
      key: z.string(),
      title: z.string(),
      content: z.string(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return await upsertBanner(input);
    }),
  delete: adminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      return await deleteBanner(input.key);
    }),
  toggle: adminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      return await toggleBannerActive(input.key);
    }),
});

// Discovery router, personalized recommendations for members
export const discoveryRouter = router({
  getRecommendations: protectedProcedure.query(async ({ ctx }) => {
    const d = await getDb();
    if (!d) return { nearbyPeople: [], dreamingAlikes: [], myGifts: [] };

    // Get current user's player profile for bioregionId and dreamingOf
    const myProfile = await db.getPlayerProfileByUserId(ctx.user.id);
    // Get current user's gifts
    const myGifts = myProfile
      ? await d.select().from(gifts).where(eq(gifts.userId, ctx.user.id))
      : [];

    // 1. Nearby people: other playerProfiles with same bioregionId (if set)
    let nearbyPeople: { userId: number | null; displayName: string; avatarUrl: string | null; dreamingOf: string | null; bioregionId: number | null }[] = [];
    if (myProfile?.bioregionId) {
      const nearby = await d
        .select()
        .from(playerProfiles)
        .where(eq(playerProfiles.bioregionId, myProfile.bioregionId))
        .limit(7);
      nearbyPeople = nearby
        .filter(p => p.userId !== ctx.user.id)
        .slice(0, 6)
        .map(p => ({
          userId: p.userId,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          dreamingOf: p.dreamingOf,
          bioregionId: p.bioregionId,
        }));
    }

    // 2. Dreaming alikes: profiles with overlapping dreamingOf keywords
    let dreamingAlikes: { userId: number | null; displayName: string; avatarUrl: string | null; dreamingOf: string | null }[] = [];
    if (myProfile?.dreamingOf) {
      const keywords = myProfile.dreamingOf
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4);
      if (keywords.length > 0) {
        const allProfiles = await d.select().from(playerProfiles).limit(100);
        dreamingAlikes = allProfiles
          .filter(p => p.userId !== ctx.user.id && p.dreamingOf)
          .filter(p => keywords.some(kw => p.dreamingOf!.toLowerCase().includes(kw)))
          .slice(0, 6)
          .map(p => ({
            userId: p.userId,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
            dreamingOf: p.dreamingOf,
          }));
      }
    }

    return {
      nearbyPeople,
      dreamingAlikes,
      myGifts: myGifts.map(g => ({ type: g.type, description: g.description })),
    };
  }),
});
