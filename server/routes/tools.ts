/**
 * Regen Civilization Tools Library tRPC router.
 * Browse, search, submit, endorse, and track usage of regenerative tools.
 */
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql, eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";

export const toolsRouter = router({
  // List approved tools with filters
  list: publicProcedure
    .input(z.object({
      categorySlug: z.string().optional(),
      pricingModel: z.string().optional(),
      isPhysical: z.boolean().optional(),
      sort: z.enum(["clicks", "newest", "alpha"]).default("clicks"),
      page: z.number().default(1),
      limit: z.number().max(50).default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const offset = (page - 1) * limit;
      const sort = input?.sort ?? "clicks";

      let orderBy = sql`t.totalClicks DESC`;
      if (sort === "newest") orderBy = sql`t.createdAt DESC`;
      if (sort === "alpha") orderBy = sql`t.name ASC`;

      let whereExtra = sql``;
      if (input?.pricingModel) whereExtra = sql`${whereExtra} AND t.pricingModel = ${input.pricingModel}`;
      if (input?.isPhysical !== undefined) whereExtra = sql`${whereExtra} AND t.isPhysical = ${input.isPhysical}`;

      if (input?.categorySlug) {
        const [tools] = await db.execute<any>(sql`
          SELECT t.*, GROUP_CONCAT(c.name) as categoryNames, GROUP_CONCAT(c.slug) as categorySlugs, GROUP_CONCAT(c.color) as categoryColors
          FROM regen_tools t
          JOIN regen_tool_category_map m ON m.toolId = t.id
          JOIN regen_tool_categories c ON c.id = m.categoryId
          WHERE t.status = 'approved' ${whereExtra}
          AND t.id IN (SELECT toolId FROM regen_tool_category_map JOIN regen_tool_categories ON regen_tool_categories.id = categoryId WHERE regen_tool_categories.slug = ${input.categorySlug})
          GROUP BY t.id
          ORDER BY ${orderBy}
          LIMIT ${limit} OFFSET ${offset}
        `);
        return (tools as unknown as unknown as any[]).map(parseToolRow);
      }

      const [tools] = await db.execute<any>(sql`
        SELECT t.*, GROUP_CONCAT(c.name) as categoryNames, GROUP_CONCAT(c.slug) as categorySlugs, GROUP_CONCAT(c.color) as categoryColors
        FROM regen_tools t
        LEFT JOIN regen_tool_category_map m ON m.toolId = t.id
        LEFT JOIN regen_tool_categories c ON c.id = m.categoryId
        WHERE t.status = 'approved' ${whereExtra}
        GROUP BY t.id
        ORDER BY ${orderBy}
        LIMIT ${limit} OFFSET ${offset}
      `);
      return (tools as unknown as unknown as any[]).map(parseToolRow);
    }),

  // Get single tool by slug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [rows] = await db.execute(sql`
        SELECT t.*, GROUP_CONCAT(c.name) as categoryNames, GROUP_CONCAT(c.slug) as categorySlugs, GROUP_CONCAT(c.color) as categoryColors
        FROM regen_tools t
        LEFT JOIN regen_tool_category_map m ON m.toolId = t.id
        LEFT JOIN regen_tool_categories c ON c.id = m.categoryId
        WHERE t.slug = ${input.slug}
        GROUP BY t.id
        LIMIT 1
      `);
      const tool = (rows as unknown as unknown as any[])[0];
      if (!tool) return null;

      // Get endorsements
      const [endorsements] = await db.execute(sql`
        SELECT e.*, u.name as userName FROM regen_tool_endorsements e
        LEFT JOIN users u ON u.id = e.userId
        WHERE e.toolId = ${tool.id}
        ORDER BY e.createdAt DESC LIMIT 20
      `);

      return { ...parseToolRow(tool), endorsements: endorsements as unknown as any[] };
    }),

  // All categories with tool counts
  categories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const [cats] = await db.execute(sql`
      SELECT c.*, COUNT(m.toolId) as toolCount
      FROM regen_tool_categories c
      LEFT JOIN regen_tool_category_map m ON m.categoryId = c.id
      LEFT JOIN regen_tools t ON t.id = m.toolId AND t.status = 'approved'
      GROUP BY c.id
      ORDER BY c.name
    `);
    return cats as unknown as any[];
  }),

  // Track a click
  trackClick: publicProcedure
    .input(z.object({ toolId: z.number(), referrer: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { ok: true };
      await db.execute(sql`
        INSERT INTO regen_tool_clicks (toolId, userId, referrer) VALUES (${input.toolId}, ${ctx.user?.id ?? null}, ${input.referrer ?? "library"})
      `);
      await db.execute(sql`UPDATE regen_tools SET totalClicks = totalClicks + 1 WHERE id = ${input.toolId}`);
      return { ok: true };
    }),

  // AI problem matcher
  aiMatch: publicProcedure
    .input(z.object({ problem: z.string().min(10).max(500) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const [tools] = await db.execute<any>(sql`
        SELECT id, name, shortSummary, problemStatements FROM regen_tools WHERE status = 'approved'
      `);

      const toolList = (tools as unknown as unknown as any[]).map(t => {
        const problems = typeof t.problemStatements === "string" ? JSON.parse(t.problemStatements) : t.problemStatements;
        return `- ${t.name}: ${t.shortSummary} (solves: ${(problems || []).join(", ")})`;
      }).join("\n");

      try {
        const result = await invokeLLM({
          messages: [
            { role: "user", content: `You are a tool matcher for regenerative communities. Given a user's problem, match them with the best tools from this list. Return JSON only: [{ "name": "Tool Name", "reason": "one sentence why" }]. Max 5 matches, ranked by relevance.\n\nAvailable tools:\n${toolList}\n\nUser's problem: ${input.problem}` }
          ],
          maxTokens: 500,
        });
        const text = typeof result === "string" ? result : (result as any)?.content?.[0]?.text ?? JSON.stringify(result);
        const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
        return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
      } catch {
        return [];
      }
    }),

  // Submit a new tool (authenticated)
  submitTool: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      websiteUrl: z.string().url(),
      shortSummary: z.string().max(1000).optional(),
      longDescription: z.string().max(5000).optional(),
      pricingModel: z.enum(["free", "freemium", "paid", "open_source"]).optional(),
      isOpenSource: z.boolean().optional(),
      isPhysical: z.boolean().optional(),
      regions: z.array(z.string()).optional(),
      problemStatements: z.array(z.string()).optional(),
      categoryIds: z.array(z.number()).optional(),
      logoUrl: z.string().optional(),
      cardImageUrl: z.string().optional(),
      gettingStartedUrl: z.string().optional(),
      contactEmail: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      await db.execute(sql`
        INSERT INTO regen_tools (name, slug, websiteUrl, shortSummary, longDescription, pricingModel, isOpenSource, isPhysical, regions, problemStatements, logoUrl, cardImageUrl, gettingStartedUrl, contactEmail, submittedBy, status)
        VALUES (${input.name}, ${slug}, ${input.websiteUrl}, ${input.shortSummary ?? null}, ${input.longDescription ?? null}, ${input.pricingModel ?? "free"}, ${input.isOpenSource ?? false}, ${input.isPhysical ?? false}, ${JSON.stringify(input.regions ?? [])}, ${JSON.stringify(input.problemStatements ?? [])}, ${input.logoUrl ?? null}, ${input.cardImageUrl ?? null}, ${input.gettingStartedUrl ?? null}, ${input.contactEmail ?? null}, ${ctx.user.id}, 'pending')
      `);

      // Map categories if provided
      if (input.categoryIds?.length) {
        const [lastId] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
        const toolId = (lastId as any)?.[0]?.id;
        if (toolId) {
          for (const catId of input.categoryIds) {
            await db.execute(sql`INSERT IGNORE INTO regen_tool_category_map (toolId, categoryId) VALUES (${toolId}, ${catId})`);
          }
        }
      }

      return { success: true };
    }),

  // Endorse a tool
  endorse: protectedProcedure
    .input(z.object({ toolId: z.number(), comment: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.execute(sql`
        INSERT IGNORE INTO regen_tool_endorsements (toolId, userId, comment)
        VALUES (${input.toolId}, ${ctx.user.id}, ${input.comment ?? null})
      `);
      return { success: true };
    }),

  // Analyze URL for AI pre-fill
  analyzeUrl: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(input.url, {
          headers: { "User-Agent": "ReGenCivicsBot/1.0" },
          signal: AbortSignal.timeout(10000),
        });
        const html = await response.text();

        const getMetaContent = (name: string) => {
          const match = html.match(new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"))
            || html.match(new RegExp(`content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, "i"));
          return match?.[1] || "";
        };

        const title = getMetaContent("og:title") || html.match(/<title>([^<]*)<\/title>/i)?.[1] || "";
        const description = getMetaContent("og:description") || getMetaContent("description") || "";
        const ogImage = getMetaContent("og:image") || "";
        const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']*)["']/i);
        const logoUrl = faviconMatch?.[1] || "";
        const docsMatch = html.match(/href=["']((?:https?:\/\/[^"']*)?\/(?:docs|getting-started|start|quickstart)[^"']*)["']/i);
        const gettingStartedUrl = docsMatch?.[1] || "";
        const isOpenSource = !!html.match(/href=["'](https:\/\/github\.com\/[^"']*)["']/i);

        function resolveUrl(base: string, relative: string): string {
          if (!relative) return "";
          if (relative.startsWith("http")) return relative;
          try { return new URL(relative, base).href; } catch { return ""; }
        }

        return {
          name: title.trim(),
          shortSummary: description.slice(0, 300),
          logoUrl: resolveUrl(input.url, logoUrl),
          cardImageUrl: resolveUrl(input.url, ogImage),
          gettingStartedUrl: resolveUrl(input.url, gettingStartedUrl),
          isOpenSource,
        };
      } catch {
        return { name: "", shortSummary: "", logoUrl: "", cardImageUrl: "", gettingStartedUrl: "", isOpenSource: false };
      }
    }),

  // Admin: list pending
  listPending: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.execute(sql`SELECT * FROM regen_tools WHERE status = 'pending' ORDER BY createdAt DESC`).then((r: any) => r[0] ?? []);
  }),

  // Admin: moderate
  moderate: adminProcedure
    .input(z.object({ toolId: z.number(), action: z.enum(["approve", "reject"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.execute(sql`
        UPDATE regen_tools SET status = ${input.action === "approve" ? "approved" : "rejected"}, approvedBy = ${ctx.user.id}
        WHERE id = ${input.toolId}
      `);
      return { success: true };
    }),
});

function parseToolRow(row: any) {
  return {
    ...row,
    regions: typeof row.regions === "string" ? JSON.parse(row.regions) : row.regions,
    problemStatements: typeof row.problemStatements === "string" ? JSON.parse(row.problemStatements) : row.problemStatements,
    integrations: typeof row.integrations === "string" ? JSON.parse(row.integrations) : row.integrations,
    categories: (row.categoryNames || "").split(",").map((name: string, i: number) => ({
      name,
      slug: (row.categorySlugs || "").split(",")[i],
      color: (row.categoryColors || "").split(",")[i],
    })).filter((c: any) => c.name),
  };
}
