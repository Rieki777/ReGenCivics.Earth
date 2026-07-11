/**
 * guide router: the member's personally designed ReGen Guide preferences (name,
 * face, tone, voice). One row per user, read and written only by the signed-in
 * member. The Guide's forum/governance behavior (ADR-23, regenGuide.ts) is a
 * separate system and is not touched here.
 *
 * Security: protectedProcedure, so every read/write is scoped to ctx.user.id.
 * The guide name is sanitized; the face and tone are validated against the fixed
 * option sets so nothing arbitrary is stored.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sanitizeInput } from "../_core/security";
import { checkRateLimit } from "../rate-limit";
import { userGuidePreferences } from "../../drizzle/schema";
import { GUIDE_ARCHETYPES, GUIDE_TONES } from "../../shared/guide";

const PORTRAIT_KEYS = GUIDE_ARCHETYPES.map((a) => a.key) as [string, ...string[]];
const TONE_KEYS = GUIDE_TONES.map((t) => t.id) as ["gentle", ...string[]];

async function db() {
  const d = await getDb();
  if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
  return d;
}

export const guideRouter = router({
  /** My Guide preferences, or null if I have not designed one yet. */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const d = await db();
    const [row] = await d
      .select()
      .from(userGuidePreferences)
      .where(eq(userGuidePreferences.userId, ctx.user.id))
      .limit(1);
    return row ?? null;
  }),

  /** Create or update my Guide's name, face, tone, and voice setting. */
  save: protectedProcedure
    .input(
      z.object({
        guideName: z.string().min(1).max(60),
        portraitKey: z.enum(PORTRAIT_KEYS),
        tone: z.enum(TONE_KEYS),
        voiceEnabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "guide_save");
      const d = await db();
      const values = {
        guideName: sanitizeInput(input.guideName).slice(0, 60) || "My Guide",
        portraitKey: input.portraitKey,
        tone: input.tone,
        voiceEnabled: input.voiceEnabled,
      };
      const [existing] = await d
        .select({ id: userGuidePreferences.id })
        .from(userGuidePreferences)
        .where(eq(userGuidePreferences.userId, ctx.user.id))
        .limit(1);
      if (existing) {
        await d.update(userGuidePreferences).set(values).where(eq(userGuidePreferences.id, existing.id));
        return { id: existing.id };
      }
      const [res] = await d.insert(userGuidePreferences).values({ userId: ctx.user.id, ...values });
      return { id: (res as { insertId?: number }).insertId ?? null };
    }),
});
