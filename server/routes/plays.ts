/**
 * Plays tRPC router.
 * Browse, search, submit, adopt, endorse, and moderate Plays.
 */
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql, eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";

/**
 * Public columns of a `plays` row, aliased `p` in every query below.
 *
 * Withheld: `creatorUserId`, `submittedBy` and `approvedBy`, the internal
 * ids that name the member who authored a play, the member who submitted it
 * and the admin who cleared it. `creatorProjectName` stays, because that is
 * the credit the creator chose to publish.
 *
 * `externalPaymentUrl` stays too. It is the buy link a paid play exists to
 * offer, and the new status filter is what keeps an unapproved play's link
 * out of reach.
 *
 * sql.raw is safe here: a compile-time constant of column identifiers.
 */
export const PUBLIC_PLAY_FIELDS = [
  "id", "name", "slug", "creatorProjectName", "summary", "coverImageUrl",
  "websiteUrl", "pricingModel", "priceRegenTokens", "externalPaymentUrl",
  "externalPriceLabel", "scale", "communityType", "kind", "needsFramework",
  "receipts", "robustness", "campaignId",
  "sectionIdentity", "sectionGovernance", "sectionEconomics", "sectionLegal",
  "sectionRoles", "sectionSeasons", "sectionLandEcology", "sectionAgreements",
  "sectionConflict", "sectionHealth", "sectionEducation", "sectionCulture",
  "sectionExternalRelations", "sectionScaling",
  "status", "totalViews", "totalAdoptions", "forumThreadId",
  "createdAt", "updatedAt",
] as const;

const PUBLIC_PLAY_COLUMNS = sql.raw(PUBLIC_PLAY_FIELDS.map((f) => `p.${f}`).join(", "));

export const playsRouter = router({
  // List approved plays with filters
  list: publicProcedure
    .input(z.object({
      categorySlug: z.string().optional(),
      pricingModel: z.string().optional(),
      scale: z.string().optional(),
      kind: z.enum(["vision", "culture"]).optional(),
      sort: z.enum(["views", "newest", "alpha"]).default("views"),
      page: z.number().default(1),
      limit: z.number().max(50).default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const offset = (page - 1) * limit;
      const sort = input?.sort ?? "views";

      let orderBy = sql`p.totalViews DESC`;
      if (sort === "newest") orderBy = sql`p.createdAt DESC`;
      if (sort === "alpha") orderBy = sql`p.name ASC`;

      let whereExtra = sql``;
      if (input?.pricingModel) whereExtra = sql`${whereExtra} AND p.pricingModel = ${input.pricingModel}`;
      if (input?.scale) whereExtra = sql`${whereExtra} AND p.scale = ${input.scale}`;
      if (input?.kind) whereExtra = sql`${whereExtra} AND p.kind = ${input.kind}`;

      if (input?.categorySlug) {
        const [plays] = await db.execute<any>(sql`
          SELECT ${PUBLIC_PLAY_COLUMNS}, GROUP_CONCAT(c.name) as categoryNames, GROUP_CONCAT(c.slug) as categorySlugs, GROUP_CONCAT(c.color) as categoryColors
          FROM plays p
          JOIN play_category_map m ON m.playId = p.id
          JOIN play_categories c ON c.id = m.categoryId
          WHERE p.status = 'approved' ${whereExtra}
          AND p.id IN (SELECT playId FROM play_category_map JOIN play_categories ON play_categories.id = categoryId WHERE play_categories.slug = ${input.categorySlug})
          GROUP BY p.id
          ORDER BY ${orderBy}
          LIMIT ${limit} OFFSET ${offset}
        `);
        return (plays as unknown as unknown as any[]).map(parsePlayRow);
      }

      const [plays] = await db.execute<any>(sql`
        SELECT ${PUBLIC_PLAY_COLUMNS}, GROUP_CONCAT(c.name) as categoryNames, GROUP_CONCAT(c.slug) as categorySlugs, GROUP_CONCAT(c.color) as categoryColors
        FROM plays p
        LEFT JOIN play_category_map m ON m.playId = p.id
        LEFT JOIN play_categories c ON c.id = m.categoryId
        WHERE p.status = 'approved' ${whereExtra}
        GROUP BY p.id
        ORDER BY ${orderBy}
        LIMIT ${limit} OFFSET ${offset}
      `);
      return (plays as unknown as unknown as any[]).map(parsePlayRow);
    }),

  // Get single play by slug (public projection).
  // The status filter is new: without it a guessed slug read a pending or
  // rejected submission, including its unpublished payment link.
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const [rows] = await db.execute(sql`
        SELECT ${PUBLIC_PLAY_COLUMNS}, GROUP_CONCAT(c.name) as categoryNames, GROUP_CONCAT(c.slug) as categorySlugs, GROUP_CONCAT(c.color) as categoryColors
        FROM plays p
        LEFT JOIN play_category_map m ON m.playId = p.id
        LEFT JOIN play_categories c ON c.id = m.categoryId
        WHERE p.slug = ${input.slug} AND p.status = 'approved'
        GROUP BY p.id
        LIMIT 1
      `);
      const play = (rows as unknown as unknown as any[])[0];
      if (!play) return null;

      // The page needs to know whether the viewer owns this play, to show
      // the Launch campaign button. It used to work that out client-side
      // from `submittedBy` / `creatorUserId`, which meant publishing both
      // ids to everyone. Answer the question on the server instead and
      // send back only the answer. The mutation re-checks ownership
      // (plays.ts submitPlay/launchCampaign), so this is display only.
      let isOwner = false;
      if (ctx.user) {
        const [ownerRows] = await db.execute<any>(sql`
          SELECT submittedBy, creatorUserId FROM plays WHERE id = ${play.id} LIMIT 1
        `);
        const owner = (ownerRows as unknown as any[])[0];
        isOwner =
          !!owner &&
          (owner.submittedBy === ctx.user.id || owner.creatorUserId === ctx.user.id);
      }

      // Get endorsements. Named columns: `e.*` carried the endorser's userId,
      // which pairs a named member with a play they back.
      const [endorsements] = await db.execute(sql`
        SELECT e.id, e.playId, e.comment, e.createdAt, u.name as userName
        FROM play_endorsements e
        LEFT JOIN users u ON u.id = e.userId
        WHERE e.playId = ${play.id}
        ORDER BY e.createdAt DESC LIMIT 20
      `);

      return { ...parsePlayRow(play), isOwner, endorsements: endorsements as unknown as any[] };
    }),

  // All categories with play counts
  categories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const [cats] = await db.execute(sql`
      SELECT c.*, COUNT(m.playId) as playCount
      FROM play_categories c
      LEFT JOIN play_category_map m ON m.categoryId = c.id
      LEFT JOIN plays p ON p.id = m.playId AND p.status = 'approved'
      GROUP BY c.id
      ORDER BY c.name
    `);
    return cats as unknown as any[];
  }),

  // Track a view
  trackView: publicProcedure
    .input(z.object({ playId: z.number(), referrer: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { ok: true };
      await db.execute(sql`
        INSERT INTO play_views (playId, userId, referrer) VALUES (${input.playId}, ${ctx.user?.id ?? null}, ${input.referrer ?? "library"})
      `);
      await db.execute(sql`UPDATE plays SET totalViews = totalViews + 1 WHERE id = ${input.playId}`);
      return { ok: true };
    }),

  // Submit a new play (authenticated)
  submitPlay: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(300),
      summary: z.string().max(2000).optional(),
      creatorProjectName: z.string().max(300).optional(),
      websiteUrl: z.string().url().optional(),
      coverImageUrl: z.string().optional(),
      pricingModel: z.enum(["free", "open_source", "paid"]).optional(),
      priceRegenTokens: z.number().optional(),
      externalPaymentUrl: z.string().optional(),
      externalPriceLabel: z.string().max(100).optional(),
      scale: z.enum(["small", "medium", "large"]).optional(),
      communityType: z.string().max(100).optional(),
      sectionIdentity: z.string().optional(),
      sectionGovernance: z.string().optional(),
      sectionEconomics: z.string().optional(),
      sectionLegal: z.string().optional(),
      sectionRoles: z.string().optional(),
      sectionSeasons: z.string().optional(),
      sectionLandEcology: z.string().optional(),
      sectionAgreements: z.string().optional(),
      sectionConflict: z.string().optional(),
      sectionHealth: z.string().optional(),
      sectionEducation: z.string().optional(),
      sectionCulture: z.string().optional(),
      sectionExternalRelations: z.string().optional(),
      sectionScaling: z.string().optional(),
      categoryIds: z.array(z.number()).optional(),
      // Vision Plays: a designed economic system (needs-first proposal from
      // the Design a Play quest). 'culture' stays the 14-section default.
      kind: z.enum(["vision", "culture"]).optional(),
      needsFramework: z.string().max(20000).optional(),
      receipts: z.string().max(10000).optional(),
      robustness: z.object({
        redundancy: z.number().min(1).max(5),
        diversity: z.number().min(1).max(5),
        biophilia: z.number().min(1).max(5),
        rootedness: z.number().min(1).max(5),
        slack: z.number().min(1).max(5),
        circularity: z.number().min(1).max(5),
        note: z.string().max(2000).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      await db.execute(sql`
        INSERT INTO plays (name, slug, summary, creatorProjectName, websiteUrl, coverImageUrl, pricingModel, priceRegenTokens, externalPaymentUrl, externalPriceLabel, scale, communityType, kind, needsFramework, receipts, robustness, sectionIdentity, sectionGovernance, sectionEconomics, sectionLegal, sectionRoles, sectionSeasons, sectionLandEcology, sectionAgreements, sectionConflict, sectionHealth, sectionEducation, sectionCulture, sectionExternalRelations, sectionScaling, submittedBy, status)
        VALUES (${input.name}, ${slug}, ${input.summary ?? null}, ${input.creatorProjectName ?? null}, ${input.websiteUrl ?? null}, ${input.coverImageUrl ?? null}, ${input.pricingModel ?? "free"}, ${input.priceRegenTokens ?? null}, ${input.externalPaymentUrl ?? null}, ${input.externalPriceLabel ?? null}, ${input.scale ?? null}, ${input.communityType ?? null}, ${input.kind ?? "culture"}, ${input.needsFramework ?? null}, ${input.receipts ?? null}, ${input.robustness ? JSON.stringify(input.robustness) : null}, ${input.sectionIdentity ?? null}, ${input.sectionGovernance ?? null}, ${input.sectionEconomics ?? null}, ${input.sectionLegal ?? null}, ${input.sectionRoles ?? null}, ${input.sectionSeasons ?? null}, ${input.sectionLandEcology ?? null}, ${input.sectionAgreements ?? null}, ${input.sectionConflict ?? null}, ${input.sectionHealth ?? null}, ${input.sectionEducation ?? null}, ${input.sectionCulture ?? null}, ${input.sectionExternalRelations ?? null}, ${input.sectionScaling ?? null}, ${ctx.user.id}, 'pending')
      `);

      // Map categories if provided
      if (input.categoryIds?.length) {
        const [lastId] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
        const playId = (lastId as any)?.[0]?.id;
        if (playId) {
          for (const catId of input.categoryIds) {
            await db.execute(sql`INSERT IGNORE INTO play_category_map (playId, categoryId) VALUES (${playId}, ${catId})`);
          }
        }
      }

      // Auto-create forum thread in 'plays' category
      try {
        const [cats] = await db.execute(sql`SELECT id FROM forumCategories WHERE slug = 'plays' LIMIT 1`);
        const playCat = (cats as unknown as any[])?.[0];
        if (playCat) {
          const [insertResult] = await db.execute(sql`
            INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned, isLocked)
            VALUES (${playCat.id}, ${ctx.user.id}, ${'Play: ' + input.name}, ${input.summary || 'Discussion thread for this Play.'}, 0, 0)
          `);
          const forumPostId = (insertResult as any)?.insertId;
          if (forumPostId) {
            await db.execute(sql`UPDATE plays SET forumThreadId = ${forumPostId} WHERE slug = ${slug}`);
          }
        }
      } catch (err) {
        console.error('Failed to create forum thread for play (non-fatal):', err);
      }

      return { success: true, slug };
    }),

  // Adopt a play
  adopt: protectedProcedure
    .input(z.object({
      playId: z.number(),
      projectName: z.string().max(300).optional(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      const [playRows] = await db.execute(sql`SELECT * FROM plays WHERE id = ${input.playId} AND status = 'approved' LIMIT 1`);
      const play = (playRows as unknown as any[])?.[0];
      if (!play) throw new TRPCError({ code: "NOT_FOUND" });

      // Check if user already adopted
      const [existing] = await db.execute(sql`SELECT id FROM play_adoptions WHERE playId = ${input.playId} AND userId = ${ctx.user.id} LIMIT 1`);
      if ((existing as unknown as any[])?.length) throw new TRPCError({ code: "CONFLICT", message: "You have already adopted this Play" });

      await db.execute(sql`INSERT INTO play_adoptions (playId, userId, projectName, notes) VALUES (${input.playId}, ${ctx.user.id}, ${input.projectName ?? null}, ${input.notes ?? null})`);
      await db.execute(sql`UPDATE plays SET totalAdoptions = totalAdoptions + 1 WHERE id = ${input.playId}`);

      if (play.pricingModel === 'open_source' && play.creatorUserId) {
        try {
          const { creditPrivateTokens } = await import("../db/tokens");
          // Read the reward from the game variable so the mechanics page and
          // the engine share one source of truth. Falls back to 500 (the
          // seeded value) if the variable is missing.
          const { getGameVariable } = await import("../game");
          let adoptionReward = 500;
          try {
            adoptionReward = await getGameVariable("plays.adoption_reward");
          } catch { /* variable missing; keep seeded fallback */ }
          await creditPrivateTokens({
            userId: play.creatorUserId,
            tokenType: 'regen',
            amount: adoptionReward,
            source: 'play_adoption',
            sourceRef: `play:${play.id}`,
            description: `Play "${play.name}" adopted`,
          });
        } catch (err) {
          console.error('Failed to credit play adoption tokens (non-fatal):', err);
        }
      }

      return { success: true };
    }),

  // Turn an approved play into a draft Crowdpooling campaign: the trial
  // bridge (envisioned -> in trial). Creator or admin only; one campaign per
  // play. The draft opens in /campaign/:id/manage where items and targets
  // get filled before it goes through the normal campaign review flow.
  launchCampaign: protectedProcedure
    .input(z.object({ playId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      const [rows] = await db.execute(sql`SELECT * FROM plays WHERE id = ${input.playId} LIMIT 1`);
      const play = (rows as unknown as any[])?.[0];
      if (!play) throw new TRPCError({ code: "NOT_FOUND" });

      const role = (ctx.user as any)?.role;
      const isOwner = play.submittedBy === ctx.user.id || play.creatorUserId === ctx.user.id;
      const isAdmin = role === "admin" || role === "superadmin";
      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the play's creator can launch its campaign" });
      }
      if (play.status !== "approved") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The play needs to be approved before it can pool resources" });
      }
      if (play.campaignId) return { campaignId: play.campaignId as number, existing: true };

      const description = [
        play.summary,
        `This campaign pools the resources to trial "${play.name}" from the Plays library.`,
      ].filter(Boolean).join("\n\n");

      const [result] = await db.execute(sql`
        INSERT INTO campaigns (userId, status, durationDays, title, description, projectName, vision, governanceModel, regenerativePractices, websiteUrl, projectImageUrl)
        VALUES (${ctx.user.id}, 'draft', 90, ${play.name}, ${description}, ${play.creatorProjectName ?? play.name}, ${play.needsFramework ?? null}, ${play.sectionGovernance ?? null}, ${play.sectionLandEcology ?? null}, ${play.websiteUrl ?? null}, ${play.coverImageUrl ?? null})
      `);
      const campaignId = (result as any)?.insertId;
      if (!campaignId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campaign insert failed" });
      await db.execute(sql`UPDATE plays SET campaignId = ${campaignId} WHERE id = ${play.id}`);
      return { campaignId: campaignId as number, existing: false };
    }),

  // Endorse a play
  endorse: protectedProcedure
    .input(z.object({ playId: z.number(), comment: z.string().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
      await db.execute(sql`
        INSERT IGNORE INTO play_endorsements (playId, userId, comment)
        VALUES (${input.playId}, ${ctx.user.id}, ${input.comment ?? null})
      `);
      return { success: true };
    }),

  // Analyze a document and extract Play section content via LLM
  analyzeDocument: protectedProcedure
    .input(z.object({ content: z.string().max(50000) }))
    .mutation(async ({ input }) => {
      const sectionNames = [
        "identity", "governance", "economics", "legal", "roles", "seasons",
        "landEcology", "agreements", "conflict", "health", "education",
        "culture", "externalRelations", "scaling",
      ];

      try {
        const result = await invokeLLM({
          messages: [
            {
              role: "user",
              content: `You are an analyst for regenerative community projects. Given the following document, extract relevant content for each of the 14 Play sections listed below. For each section, pull out the most relevant passages and summarize them. If a section has no relevant content in the document, leave it empty and include it in the "gaps" array with 2-3 questions the community could answer to fill that section.

The 14 sections:
1. identity - Community identity, vision, mission, values, origin story
2. governance - Decision-making processes, voting, councils, power structures
3. economics - Economic model, currencies, exchange, livelihoods, budgets
4. legal - Legal structure, land tenure, agreements, compliance
5. roles - Roles, responsibilities, leadership, membership tiers
6. seasons - Seasonal rhythms, cycles, ceremonies, annual calendar
7. landEcology - Land management, ecology, permaculture, regeneration practices
8. agreements - Community agreements, social contracts, conflict norms
9. conflict - Conflict resolution, mediation, restorative justice
10. health - Health, wellness, mental health, care systems
11. education - Education, learning, knowledge sharing, mentorship
12. culture - Culture, arts, music, storytelling, celebrations
13. externalRelations - External partnerships, networks, bioregional connections
14. scaling - Growth strategy, replication, scaling approach

Return JSON only in this format:
{
  "sections": {
    "identity": "extracted content...",
    "governance": "extracted content...",
    ...
  },
  "gaps": [
    { "section": "legal", "questions": ["What legal structure does the community use?", "How is land tenure organized?"] }
  ]
}

Document to analyze:
${input.content}`,
            },
          ],
          maxTokens: 4000,
        });

        const text = typeof result === "string" ? result : (result as any)?.choices?.[0]?.message?.content ?? JSON.stringify(result);
        const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
        return {
          sections: parsed.sections ?? {} as Record<string, string>,
          gaps: Array.isArray(parsed.gaps) ? parsed.gaps as Array<{ section: string; questions: string[] }> : [],
        };
      } catch {
        // Return empty sections and all sections as gaps on failure
        const sections: Record<string, string> = {};
        const gaps = sectionNames.map((s) => ({
          section: s,
          questions: [`What is your community's approach to ${s}?`],
        }));
        return { sections, gaps };
      }
    }),

  // Admin: list pending
  listPending: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.execute(sql`SELECT * FROM plays WHERE status = 'pending' ORDER BY createdAt DESC`).then((r: any) => r[0] ?? []);
  }),

  // Admin: moderate
  moderate: adminProcedure
    .input(z.object({ playId: z.number(), action: z.enum(["approve", "reject"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      const [rows] = await db.execute(sql`SELECT id, name, kind, status, submittedBy FROM plays WHERE id = ${input.playId} LIMIT 1`);
      const play = (rows as unknown as any[])?.[0];
      if (!play) throw new TRPCError({ code: "NOT_FOUND" });

      await db.execute(sql`
        UPDATE plays SET status = ${input.action === "approve" ? "approved" : "rejected"}, approvedBy = ${ctx.user.id}
        WHERE id = ${input.playId}
      `);

      // Design a Play quest reward: the first approval of a vision play pays
      // the submitter. Amounts come from game variables so the mechanics page
      // and the engine share one source of truth. The idempotencyKey makes a
      // double payout physically impossible at the DB layer even if
      // moderation races or a play is re-approved after a reject.
      if (input.action === "approve" && play.kind === "vision" && play.status !== "approved" && play.submittedBy) {
        try {
          const { creditPrivateTokens } = await import("../db/tokens");
          const { getGameVariable } = await import("../game");
          let regenReward = 2222;
          let rgvoiceReward = 1;
          try { regenReward = await getGameVariable("plays.submission_reward_regen"); } catch { /* variable missing; keep seeded fallback */ }
          try { rgvoiceReward = await getGameVariable("plays.submission_reward_rgvoice"); } catch { /* variable missing; keep seeded fallback */ }
          if (regenReward > 0) {
            await creditPrivateTokens({
              userId: play.submittedBy,
              tokenType: "regen",
              amount: regenReward,
              source: "play_submission",
              sourceRef: `play:${play.id}`,
              idempotencyKey: `play_submission:regen:${play.id}`,
              description: `Play "${play.name}" approved into the library`,
            });
          }
          if (rgvoiceReward > 0) {
            await creditPrivateTokens({
              userId: play.submittedBy,
              tokenType: "rgvoice",
              amount: rgvoiceReward,
              source: "play_submission",
              sourceRef: `play:${play.id}`,
              idempotencyKey: `play_submission:rgvoice:${play.id}`,
              description: `Play "${play.name}" approved into the library`,
            });
          }
        } catch (err) {
          console.error("Failed to credit play submission reward (non-fatal):", err);
        }
      }

      return { success: true };
    }),
});

function parsePlayRow(row: any) {
  // mysql2 may hand JSON columns back as objects or strings depending on
  // the driver path; normalize so the client always sees an object or null.
  let robustness = row.robustness ?? null;
  if (typeof robustness === "string") {
    try { robustness = JSON.parse(robustness); } catch { robustness = null; }
  }
  return {
    ...row,
    robustness,
    categories: (row.categoryNames || "").split(",").map((name: string, i: number) => ({
      name,
      slug: (row.categorySlugs || "").split(",")[i],
      color: (row.categoryColors || "").split(",")[i],
    })).filter((c: any) => c.name),
  };
}
