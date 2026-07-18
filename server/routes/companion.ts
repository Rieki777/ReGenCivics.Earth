/**
 * companion router: the site-wide Conversational Companion endpoint.
 *
 * One `turn` mutation drives every wrapped form (concierge intake, booking
 * request, crew profile, add-to-map, and any form added later). It is stateless:
 * the client holds the transcript and the collected values and passes them each
 * turn, so there is no session table to grow. `transcribe` is the STT fallback
 * for browsers without SpeechRecognition, live only when STT_API_KEY is set.
 *
 * Security posture (BUILD-PLAYBOOK + AI-AUTOMATION-RISKS):
 *  - publicProcedure (the conversation writes nothing) with zod caps and
 *    checkRateLimit on every call.
 *  - Guest text is untrusted: sanitized on the way in, treated as data by the
 *    system prompt, and the companion never submits. The real write still runs
 *    the existing zod-validated ship procedure with an explicit human submit.
 *  - `formId` is validated against the known form registry; unknown ids are
 *    rejected before any model call.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { checkRateLimit } from "../rate-limit";
import { sanitizeInput } from "../_core/security";
import { companionTurn, isCompanionConfigured, isSttConfigured, isTtsConfigured, transcribeAudio } from "../lib/companion";
import { hostedVoicesForPersona, synthesizeSignatureVoice } from "../lib/tts";
import { COMPANION_FORMS, type CompanionFormId } from "../../shared/companions";

const turnMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

export const companionRouter = router({
  /** What the voice layer can do here (so the client can degrade gracefully). */
  flags: publicProcedure.query(() => ({
    companion: isCompanionConfigured(),
    serverStt: isSttConfigured(),
    hostedTts: isTtsConfigured(),
  })),

  /** One conversational turn. Returns the next line, field updates, and review flag. */
  turn: publicProcedure
    .input(
      z.object({
        formId: z.string().max(64),
        history: z.array(turnMessage).max(60),
        collected: z.record(z.string().max(64), z.string().max(2000)).optional(),
        context: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "companion_turn");
      if (!isCompanionConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The companion is not aboard yet. You can type this out instead." });
      }
      const form = COMPANION_FORMS[input.formId as CompanionFormId];
      if (!form) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown form." });

      // Sanitize every user turn; assistant turns are ours already.
      const history = input.history.map((m) =>
        m.role === "user" ? { role: m.role, content: sanitizeInput(m.content) } : { role: m.role, content: m.content },
      );
      const collected: Record<string, string> = {};
      for (const [k, v] of Object.entries(input.collected ?? {})) {
        collected[k.slice(0, 64)] = sanitizeInput(String(v)).slice(0, 2000);
      }

      try {
        const result = await companionTurn({
          form,
          history,
          collected,
          context: input.context ? sanitizeInput(input.context) : undefined,
        });
        return result;
      } catch (err) {
        console.error("[companion] turn failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "I lost the thread for a second. Say that again, or type it below." });
      }
    }),

  /** STT fallback for browsers without SpeechRecognition. Guarded by STT_API_KEY. */
  transcribe: publicProcedure
    .input(z.object({ audioBase64: z.string().max(8_000_000), mimeType: z.string().max(100) }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "companion_transcribe");
      if (!isSttConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Voice typing is not set up here. Please type instead." });
      }
      try {
        const text = await transcribeAudio({ audioBase64: input.audioBase64, mimeType: input.mimeType });
        return { text };
      } catch (err) {
        console.error("[companion] transcribe failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "I couldn't hear that clearly. Try again, or type it." });
      }
    }),

  /**
   * The signature character voices available to one persona's voice picker.
   * Empty until TTS_API_KEY is set, so the client shows nothing extra.
   */
  voices: publicProcedure
    .input(z.object({ persona: z.string().max(64) }))
    .query(({ input }) => hostedVoicesForPersona(input.persona)),

  /**
   * Speak one line in a signature voice. The text is the assistant's own reply
   * being read aloud, so the cap is a spoken sentence or three; the client
   * falls back to its browser Kokoro voices on any failure here.
   */
  speak: publicProcedure
    .input(z.object({ voice: z.string().max(64), text: z.string().min(1).max(600) }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "companion_tts");
      if (!isTtsConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Signature voices are not aboard yet." });
      }
      try {
        return await synthesizeSignatureVoice(input.voice, sanitizeInput(input.text));
      } catch (err) {
        console.error("[companion] speak failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "That voice is resting. The browser voice will carry the line." });
      }
    }),
});
