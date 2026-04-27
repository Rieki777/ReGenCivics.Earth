import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Check that the user holds Co-Creator tier or above.
 * Throws FORBIDDEN if the user is an explorer or has no profile.
 */
async function requireCoCreatorPlus(db: any, userId: number) {
  const [row] = await db
    .execute(
      sql`SELECT citizenshipTier FROM player_profiles WHERE userId = ${userId} LIMIT 1`
    )
    .then((r: any) => r[0] ?? []);
  const tier = row?.citizenshipTier;
  if (!tier || tier === "explorer") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Co-Creator tier or above required",
    });
  }
}

export const orgRatingsRouter = router({
  // Submit or update a rating for an organisation (one per user per org per season)
  rate: protectedProcedure
    .input(
      z.object({
        organisationId: z.number(),
        soilScore: z.number().min(1).max(5),
        biodiversityScore: z.number().min(1).max(5),
        waterScore: z.number().min(1).max(5),
        chemicalFreeScore: z.number().min(1).max(5),
        communityScore: z.number().min(1).max(5),
        workerWellbeingScore: z.number().min(1).max(5),
        note: z.string().max(2000).optional(),
        seasonId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      await requireCoCreatorPlus(db, ctx.user.id);

      const overallScore =
        (input.soilScore +
          input.biodiversityScore +
          input.waterScore +
          input.chemicalFreeScore +
          input.communityScore +
          input.workerWellbeingScore) /
        6;

      const seasonId = input.seasonId ?? null;

      // Upsert: one rating per user per org per season
      await db.execute(sql`
        INSERT INTO organisation_ratings
          (organisationId, userId, soilScore, biodiversityScore, waterScore,
           chemicalFreeScore, communityScore, workerWellbeingScore, overallScore, note, seasonId)
        VALUES
          (${input.organisationId}, ${ctx.user.id}, ${input.soilScore}, ${input.biodiversityScore},
           ${input.waterScore}, ${input.chemicalFreeScore}, ${input.communityScore},
           ${input.workerWellbeingScore}, ${overallScore}, ${input.note ?? null}, ${seasonId})
        ON DUPLICATE KEY UPDATE
          soilScore = VALUES(soilScore),
          biodiversityScore = VALUES(biodiversityScore),
          waterScore = VALUES(waterScore),
          chemicalFreeScore = VALUES(chemicalFreeScore),
          communityScore = VALUES(communityScore),
          workerWellbeingScore = VALUES(workerWellbeingScore),
          overallScore = VALUES(overallScore),
          note = VALUES(note),
          updatedAt = NOW()
      `);

      // Check if total ratings meet the minimum threshold for recalculating the org score
      const [countRow] = await db
        .execute(
          sql`SELECT COUNT(*) AS cnt FROM organisation_ratings WHERE organisationId = ${input.organisationId}`
        )
        .then((r: any) => r[0] ?? []);

      const totalRatings = Number(countRow?.cnt ?? 0);

      // Fetch the min_raters threshold from game_variables (default 5)
      const [thresholdRow] = await db
        .execute(
          sql`SELECT value FROM game_variables WHERE \`key\` = 'org_rating.min_raters' LIMIT 1`
        )
        .then((r: any) => r[0] ?? []);

      const minRaters = Number(thresholdRow?.value ?? 5);

      if (totalRatings >= minRaters) {
        // Recalculate the organisation's regenerativeScore as the average of all overallScores
        const [avgRow] = await db
          .execute(
            sql`SELECT AVG(overallScore) AS avgScore FROM organisation_ratings WHERE organisationId = ${input.organisationId}`
          )
          .then((r: any) => r[0] ?? []);

        const regenerativeScore = Number(avgRow?.avgScore ?? 0);

        await db.execute(
          sql`UPDATE organisations SET regenerativeScore = ${regenerativeScore} WHERE id = ${input.organisationId}`
        );
      }

      return { ok: true, overallScore, totalRatings };
    }),

  // Get all ratings for an organisation (public)
  getForOrg: publicProcedure
    .input(z.object({ organisationId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .execute(
          sql`SELECT * FROM organisation_ratings WHERE organisationId = ${input.organisationId} ORDER BY createdAt DESC`
        )
        .then((r: any) => r[0] ?? []);
    }),

  // Get the current user's ratings
  getMyRatings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .execute(
        sql`SELECT * FROM organisation_ratings WHERE userId = ${ctx.user.id} ORDER BY createdAt DESC`
      )
      .then((r: any) => r[0] ?? []);
  }),
});
