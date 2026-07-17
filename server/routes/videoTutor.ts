/**
 * Video Tutor router: the context-aware ask endpoint behind every video on
 * the site. Public by design (the intro gate plays before sign-in), bounded
 * by three layers: per-minute rateLimited middleware here, per-user/IP and
 * site-wide daily caps in video-tutor.ts, and the global LLM cost breaker in
 * server/_core/llm.ts.
 */
import { z } from "zod";
import { publicProcedure, rateLimited, router } from "../_core/trpc";
import { isLLMConfigured } from "../_core/llm";
import { askVideoTutor, getTranscriptSegments } from "../lib/video-tutor";

export const videoTutorRouter = router({
  /** Whether the tutor can run at all, and whether this video has captions. */
  status: publicProcedure
    .input(z.object({ videoId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/) }))
    .query(async ({ input }) => {
      if (!isLLMConfigured()) return { configured: false, hasTranscript: false };
      const segments = await getTranscriptSegments(input.videoId);
      return { configured: true, hasTranscript: Boolean(segments?.length) };
    }),

  ask: publicProcedure
    .use(rateLimited({ windowMs: 60_000, max: 5 }))
    .input(
      z.object({
        videoId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/),
        currentTimeSec: z.number().min(0).max(60 * 60 * 12),
        question: z.string().min(1).max(1_000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const bucket = ctx.user?.id ? `u:${ctx.user.id}` : `ip:${ctx.req?.ip ?? "unknown"}`;
      return askVideoTutor({
        videoId: input.videoId,
        currentTimeSec: input.currentTimeSec,
        question: input.question,
        bucket,
      });
    }),
});
