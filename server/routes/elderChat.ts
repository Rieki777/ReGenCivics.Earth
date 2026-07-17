/**
 * elderChat router - Ask Anastasia (Church of the Regenerative Earth).
 *
 * Retrieval-grounded chat. Retrieves the most relevant passages from the elder
 * corpus (Voyage embeddings when available, MySQL FULLTEXT otherwise), then asks
 * Claude to answer in Anastasia's voice STRICTLY from those passages, with book/
 * section citations and a crisis fallback that overrides persona. Elder-agnostic:
 * a second elder is another `elder` value plus its own corpus rows.
 *
 * Security (see .ai/docs/security/AI-AUTOMATION-RISKS.md): the user's text is
 * untrusted. It is placed only in the user turn and the system prompt instructs
 * the model to treat it as data. No tools are exposed to the model.
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { elderChatMessages, elderCorpusChunks } from "../../drizzle/schema";
import { invokeLLM, isLLMConfigured } from "../_core/llm";
import { checkRateLimit } from "../rate-limit";
import { retrieveCanonPassages } from "../lib/elder-retrieval";
import { buildElderSystemPrompt, CRISIS_RESPONSE, detectCrisis } from "../lib/elder-safety";
import { getElder } from "../lib/elders";

const TOP_K = 6;

// Lightweight per-session limiter (in addition to the IP limiter). Deterministic,
// in-process; resets on restart, which is fine for abuse dampening.
const SESSION_WINDOW_MS = 15 * 60 * 1000;
const SESSION_MAX = 20;
const sessionHits = new Map<string, number[]>();
function sessionRateOk(sessionId: string): boolean {
  const now = Date.now();
  const hits = (sessionHits.get(sessionId) ?? []).filter((t) => now - t < SESSION_WINDOW_MS);
  if (hits.length >= SESSION_MAX) {
    sessionHits.set(sessionId, hits);
    return false;
  }
  hits.push(now);
  sessionHits.set(sessionId, hits);
  return true;
}

async function corpusHasRows(elder: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: elderCorpusChunks.id }).from(elderCorpusChunks).where(eq(elderCorpusChunks.elder, elder)).limit(1);
  return rows.length > 0;
}

async function logMessage(sessionId: string, elder: string, role: "user" | "assistant", content: string, chunkIds: number[] | null) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(elderChatMessages).values({ sessionId, elder, role, content, retrievedChunkIds: chunkIds });
  } catch (err) {
    console.error("[elderChat] log failed:", err);
  }
}

export const elderChatRouter = router({
  // Whether the chat should render live or keep the coming-soon placeholder.
  elderChatEnabled: publicProcedure
    .input(z.object({ elder: z.string().max(64).default("anastasia") }).optional())
    .query(async ({ input }) => {
      const elderId = input?.elder ?? "anastasia";
      if (!getElder(elderId)) return { enabled: false };
      const enabled = isLLMConfigured() && (await corpusHasRows(elderId));
      return { enabled };
    }),

  ask: publicProcedure
    .input(
      z.object({
        sessionId: z.string().min(8).max(64),
        question: z.string().min(1).max(1000),
        elder: z.string().max(64).default("anastasia"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId, question } = input;
      const elderObj = getElder(input.elder);
      if (!elderObj) {
        throw new TRPCError({ code: "NOT_FOUND", message: "That elder is not part of the circle." });
      }
      const elder = elderObj.id;

      // Rate limit: per IP (shared helper) and per session (in-process).
      await checkRateLimit(ctx, "elder_chat");
      if (!sessionRateOk(sessionId)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "You have asked a great deal in a short time. Please rest a moment and return." });
      }

      await logMessage(sessionId, elder, "user", question, null);

      // Crisis path: step out of persona, no model call, no invented canon.
      if (detectCrisis(question)) {
        await logMessage(sessionId, elder, "assistant", CRISIS_RESPONSE, null);
        return { answer: CRISIS_RESPONSE, isCrisis: true };
      }

      if (!isLLMConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: `${elderObj.displayName} is not available yet. Please return soon.` });
      }

      const chunks = await retrieveCanonPassages(elder, question, TOP_K);
      const systemPrompt = buildElderSystemPrompt(elderObj, chunks);

      let answer: string;
      try {
        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
          maxTokens: 800,
        });
        answer = result.choices?.[0]?.message?.content?.trim() || "";
      } catch (err) {
        console.error("[elderChat] LLM error:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${elderObj.displayName} is quiet just now. Please try again in a moment.` });
      }

      if (!answer) {
        answer = "There is not a clear answer to that just now. Ask me again, perhaps in different words, and we will look together.";
      }

      // Elder quest offers (improvement 12): deterministic selection from the
      // human-ratified pool, appended only where fitting, never in crisis
      // contexts (the crisis gate returned above). Off until
      // ELDER_QUEST_OFFERS_ENABLED=true and the elder's steward blesses it.
      try {
        const { maybeQuestOffer } = await import("../lib/elderQuestOffers");
        let bioregionId: number | null = null;
        if (ctx.user) {
          const { getPlayerProfileByUserId } = await import("../db");
          const profile = await getPlayerProfileByUserId(ctx.user.id);
          bioregionId = profile?.bioregionId ?? null;
        }
        const offer = await maybeQuestOffer({ elder: elderObj, playerText: question, bioregionId });
        if (offer) answer = `${answer}\n\n${offer}`;
      } catch {
        // Offers are decorative; never break a reply over one.
      }

      await logMessage(sessionId, elder, "assistant", answer, chunks.map((c) => c.id));
      return { answer, isCrisis: false };
    }),
});
