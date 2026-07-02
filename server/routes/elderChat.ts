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
import { and, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { elderChatMessages, elderCorpusChunks } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { invokeLLM } from "../_core/llm";
import { checkRateLimit } from "../rate-limit";
import { embedTexts, isVoyageConfigured, topKByEmbedding } from "../lib/elder-retrieval";
import { buildAnastasiaSystemPrompt, CRISIS_RESPONSE, detectCrisis, type RetrievedPassage } from "../lib/elder-safety";

const TOP_K = 6;

type RetrievedChunk = RetrievedPassage & { id: number };

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

async function retrieveChunks(elder: string, question: string): Promise<RetrievedChunk[]> {
  const db = await getDb();
  if (!db) return [];

  // Mode A: embeddings, if Voyage is configured and chunks carry vectors.
  if (isVoyageConfigured()) {
    const rows = await db
      .select({ id: elderCorpusChunks.id, book: elderCorpusChunks.book, section: elderCorpusChunks.section, content: elderCorpusChunks.content, embedding: elderCorpusChunks.embedding })
      .from(elderCorpusChunks)
      .where(eq(elderCorpusChunks.elder, elder));
    const embedded = rows.filter((r) => Array.isArray(r.embedding) && (r.embedding as number[]).length > 0);
    if (embedded.length > 0) {
      const [queryVec] = await embedTexts([question], "query");
      const top = topKByEmbedding(
        queryVec,
        embedded.map((r) => ({ ...r, embedding: r.embedding as number[] })),
        TOP_K,
      );
      return top.map((r) => ({ id: r.id, book: r.book ?? "", section: r.section ?? "", content: r.content }));
    }
  }

  // Mode B: MySQL FULLTEXT keyword fallback.
  const q = question.slice(0, 512);
  const rows = await db
    .select({ id: elderCorpusChunks.id, book: elderCorpusChunks.book, section: elderCorpusChunks.section, content: elderCorpusChunks.content })
    .from(elderCorpusChunks)
    .where(and(eq(elderCorpusChunks.elder, elder), sql`MATCH(content) AGAINST(${q} IN NATURAL LANGUAGE MODE)`))
    .orderBy(sql`MATCH(content) AGAINST(${q} IN NATURAL LANGUAGE MODE) DESC`)
    .limit(TOP_K);
  return rows.map((r) => ({ id: r.id, book: r.book ?? "", section: r.section ?? "", content: r.content }));
}

function uniqueCitations(chunks: RetrievedChunk[]): Array<{ book: string; section: string }> {
  const seen = new Set<string>();
  const out: Array<{ book: string; section: string }> = [];
  for (const c of chunks) {
    const key = `${c.book}|${c.section}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ book: c.book, section: c.section });
  }
  return out;
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
      const elder = input?.elder ?? "anastasia";
      const enabled = Boolean(ENV.anthropicApiKey) && (await corpusHasRows(elder));
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
      const { sessionId, question, elder } = input;

      // Rate limit: per IP (shared helper) and per session (in-process).
      await checkRateLimit(ctx, "elder_chat");
      if (!sessionRateOk(sessionId)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "You have asked a great deal in a short time. Please rest a moment and return." });
      }

      await logMessage(sessionId, elder, "user", question, null);

      // Crisis path: step out of persona, no model call, no invented canon.
      if (detectCrisis(question)) {
        await logMessage(sessionId, elder, "assistant", CRISIS_RESPONSE, null);
        return { answer: CRISIS_RESPONSE, citations: [], isCrisis: true };
      }

      if (!ENV.anthropicApiKey) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Anastasia is not available yet. Please return soon." });
      }

      const chunks = await retrieveChunks(elder, question);
      const systemPrompt = buildAnastasiaSystemPrompt(chunks);

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
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Anastasia is quiet just now. Please try again in a moment." });
      }

      if (!answer) {
        answer = "The canon does not hold a clear answer to that just now. Ask me again, perhaps in different words, and we will look together.";
      }

      await logMessage(sessionId, elder, "assistant", answer, chunks.map((c) => c.id));
      return { answer, citations: uniqueCitations(chunks), isCrisis: false };
    }),
});
