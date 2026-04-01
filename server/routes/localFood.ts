import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql, desc, eq } from "drizzle-orm";

export const localFoodRouter = router({
  // List approved/active local food applications
  list: publicProcedure
    .input(z.object({
      bioregionId: z.number().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      if (input.bioregionId) {
        return db.execute(sql`
          SELECT * FROM local_food_applications
          WHERE (status = 'approved' OR status = 'active')
            AND bioregion_id = ${input.bioregionId}
          ORDER BY created_at DESC
        `).then((r: any) => r[0] ?? []);
      }

      return db.execute(sql`
        SELECT * FROM local_food_applications
        WHERE status = 'approved' OR status = 'active'
        ORDER BY created_at DESC
      `).then((r: any) => r[0] ?? []);
    }),

  // Submit a food producer application
  apply: publicProcedure
    .input(z.object({
      producerName: z.string().max(200),
      contactEmail: z.string().max(200),
      contactName: z.string().max(200),
      bioregionId: z.number().optional(),
      description: z.string().optional(),
      productsOffered: z.any().optional(),
      regenerativePractices: z.string().optional(),
      websiteUrl: z.string().optional(),
      localScaleProfileUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const productsJson = input.productsOffered
        ? JSON.stringify(input.productsOffered)
        : null;

      const [result] = await db.execute(sql`
        INSERT INTO local_food_applications
          (producer_name, contact_email, contact_name, bioregion_id,
           description, products_offered, regenerative_practices,
           website_url, local_scale_profile_url, status, created_at)
        VALUES
          (${input.producerName}, ${input.contactEmail}, ${input.contactName},
           ${input.bioregionId ?? null}, ${input.description ?? null},
           ${productsJson}, ${input.regenerativePractices ?? null},
           ${input.websiteUrl ?? null}, ${input.localScaleProfileUrl ?? null},
           'submitted', NOW())
      `);
      const id = (result as any).insertId as number;
      return { id };
    }),

  // Get a single application by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const rows = await db.execute(sql`
        SELECT * FROM local_food_applications WHERE id = ${input.id} LIMIT 1
      `);
      const results = (rows as any)[0] ?? [];
      return results[0] ?? null;
    }),

  // Admin: update application status
  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["submitted", "under_review", "approved", "active", "declined"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      await db.execute(sql`
        UPDATE local_food_applications
        SET status = ${input.status}
        WHERE id = ${input.id}
      `);
      return { success: true };
    }),
});
