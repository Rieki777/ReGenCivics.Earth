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

export const playsRouter = router({
  // List approved plays with filters
  list: publicProcedure
    .input(z.object({
      categorySlug: z.string().optional(),
      pricingModel: z.string().optional(),
      scale: z.string().optional(),
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

      if (input?.categorySlug) {
        const [plays] = await db.execute<any>(sql`
          SELECT p.*, GROUP_CONCAT(c.name) as categoryNames, GROUP_CONCAT(c.slug) as categorySlugs, GROUP_CONCAT(c.color) as categoryColors
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
        SELECT p.*, GROUP_CONCAT(c.name) as categoryNames, GROUP_CONCAT(c.slug) as categorySlugs, GROUP_CONCAT(c.color) as categoryColors
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

  // Get single play by slug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [rows] = await db.execute(sql`
        SELECT p.*, GROUP_CONCAT(c.name) as categoryNames, GROUP_CONCAT(c.slug) as categorySlugs, GROUP_CONCAT(c.color) as categoryColors
        FROM plays p
        LEFT JOIN play_category_map m ON m.playId = p.id
        LEFT JOIN play_categories c ON c.id = m.categoryId
        WHERE p.slug = ${input.slug}
        GROUP BY p.id
        LIMIT 1
      `);
      const play = (rows as unknown as unknown as any[])[0];
      if (!play) return null;

      // Get endorsements
      const [endorsements] = await db.execute(sql`
        SELECT e.*, u.name as userName FROM play_endorsements e
        LEFT JOIN users u ON u.id = e.userId
        WHERE e.playId = ${play.id}
        ORDER BY e.createdAt DESC LIMIT 20
      `);

      return { ...parsePlayRow(play), endorsements: endorsements as unknown as any[] };
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
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      await db.execute(sql`
        INSERT INTO plays (name, slug, summary, creatorProjectName, websiteUrl, coverImageUrl, pricingModel, priceRegenTokens, externalPaymentUrl, externalPriceLabel, scale, communityType, sectionIdentity, sectionGovernance, sectionEconomics, sectionLegal, sectionRoles, sectionSeasons, sectionLandEcology, sectionAgreements, sectionConflict, sectionHealth, sectionEducation, sectionCulture, sectionExternalRelations, sectionScaling, submittedBy, status)
        VALUES (${input.name}, ${slug}, ${input.summary ?? null}, ${input.creatorProjectName ?? null}, ${input.websiteUrl ?? null}, ${input.coverImageUrl ?? null}, ${input.pricingModel ?? "free"}, ${input.priceRegenTokens ?? null}, ${input.externalPaymentUrl ?? null}, ${input.externalPriceLabel ?? null}, ${input.scale ?? null}, ${input.communityType ?? null}, ${input.sectionIdentity ?? null}, ${input.sectionGovernance ?? null}, ${input.sectionEconomics ?? null}, ${input.sectionLegal ?? null}, ${input.sectionRoles ?? null}, ${input.sectionSeasons ?? null}, ${input.sectionLandEcology ?? null}, ${input.sectionAgreements ?? null}, ${input.sectionConflict ?? null}, ${input.sectionHealth ?? null}, ${input.sectionEducation ?? null}, ${input.sectionCulture ?? null}, ${input.sectionExternalRelations ?? null}, ${input.sectionScaling ?? null}, ${ctx.user.id}, 'pending')
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
      await db.execute(sql`
        UPDATE plays SET status = ${input.action === "approve" ? "approved" : "rejected"}, approvedBy = ${ctx.user.id}
        WHERE id = ${input.playId}
      `);
      return { success: true };
    }),
});

function parsePlayRow(row: any) {
  return {
    ...row,
    categories: (row.categoryNames || "").split(",").map((name: string, i: number) => ({
      name,
      slug: (row.categorySlugs || "").split(",")[i],
      color: (row.categoryColors || "").split(",")[i],
    })).filter((c: any) => c.name),
  };
}
