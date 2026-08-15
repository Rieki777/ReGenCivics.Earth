import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { sql, desc, eq } from "drizzle-orm";

/**
 * Public columns of a `local_food_applications` row.
 *
 * A food-producer application carries the producer's personal contact
 * details and the exact coordinates of their land. `SELECT *` published
 * both. Withheld: contactEmail, contactName, locationLat, locationLng.
 * The directory shows the producer, their description and their own public
 * links; anyone who wants to reach them goes through the website URL or the
 * needs/offers board, which is what those fields are for.
 *
 * Narrowed in the SQL rather than filtered afterwards, so the private
 * columns never leave the database.
 */
export const PUBLIC_LOCAL_FOOD_FIELDS = [
  "id",
  "producerName",
  "bioregionId",
  "description",
  "productsOffered",
  "regenerativePractices",
  "websiteUrl",
  "localScaleProfileUrl",
  "needsText",
  "offersText",
  "status",
  "communityRatingsCount",
  "regenerativeScore",
  "createdAt",
  "updatedAt",
] as const;

// sql.raw is safe here: the list above is a compile-time constant of column
// identifiers, never anything derived from a request.
const PUBLIC_LOCAL_FOOD_COLUMNS = sql.raw(PUBLIC_LOCAL_FOOD_FIELDS.join(", "));

export const localFoodRouter = router({
  // List approved/active local food applications (public projection)
  list: publicProcedure
    .input(z.object({
      bioregionId: z.number().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Note the identifiers: this table is camelCase in the live schema
      // (drizzle/ci-baseline.sql:2048). The snake_case `bioregion_id` /
      // `created_at` that used to be here cannot resolve to a column.
      if (input.bioregionId) {
        return db.execute(sql`
          SELECT ${PUBLIC_LOCAL_FOOD_COLUMNS} FROM local_food_applications
          WHERE (status = 'approved' OR status = 'active')
            AND bioregionId = ${input.bioregionId}
          ORDER BY createdAt DESC
        `).then((r: any) => r[0] ?? []);
      }

      return db.execute(sql`
        SELECT ${PUBLIC_LOCAL_FOOD_COLUMNS} FROM local_food_applications
        WHERE status = 'approved' OR status = 'active'
        ORDER BY createdAt DESC
      `).then((r: any) => r[0] ?? []);
    }),

  // Submit a food producer application
  submitApplication: publicProcedure
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
      // Optional needs/offers capture (Phase B2), mirrored to the board tables
      needsText: z.string().max(2000).optional(),
      offersText: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      const productsJson = input.productsOffered
        ? JSON.stringify(input.productsOffered)
        : null;

      const [result] = await db.execute(sql`
        INSERT INTO local_food_applications
          (producer_name, contact_email, contact_name, bioregion_id,
           description, products_offered, regenerative_practices,
           website_url, local_scale_profile_url, needsText, offersText, status, created_at)
        VALUES
          (${input.producerName}, ${input.contactEmail}, ${input.contactName},
           ${input.bioregionId ?? null}, ${input.description ?? null},
           ${productsJson}, ${input.regenerativePractices ?? null},
           ${input.websiteUrl ?? null}, ${input.localScaleProfileUrl ?? null},
           ${input.needsText ?? null}, ${input.offersText ?? null},
           'submitted', NOW())
      `);
      const id = (result as any).insertId as number;

      // Mirror the optional needs/offers capture to the board tables (Phase B2, non-fatal).
      {
        const { captureFormNeedsOffers } = await import("../lib/needsOffersStore");
        await captureFormNeedsOffers({
          source: "local_food_application",
          sourceId: id,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          bioregionId: input.bioregionId ?? null,
          needsText: input.needsText,
          offersText: input.offersText,
        });
      }
      return { id };
    }),

  // Get a single application by ID (public projection).
  // The id is enumerable and there was no status filter, so this returned
  // the contact email and land coordinates of every application ever
  // submitted, including the ones still under review and the declined ones.
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const rows = await db.execute(sql`
        SELECT ${PUBLIC_LOCAL_FOOD_COLUMNS} FROM local_food_applications
        WHERE id = ${input.id}
          AND (status = 'approved' OR status = 'active')
        LIMIT 1
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
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      await db.execute(sql`
        UPDATE local_food_applications
        SET status = ${input.status}
        WHERE id = ${input.id}
      `);
      return { success: true };
    }),
});
