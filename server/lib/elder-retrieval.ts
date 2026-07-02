/**
 * Elder retrieval helpers for Ask Anastasia.
 *
 * Retrieval has two modes (ADR-18):
 *   A. Embeddings (preferred): Voyage AI vectors, cosine similarity computed in
 *      app over the corpus. Needs VOYAGE_API_KEY.
 *   B. Keyword fallback: MySQL FULLTEXT over the same chunks. No extra vendor.
 * The route prefers A when VOYAGE_API_KEY is set and chunks carry embeddings,
 * and falls back to B otherwise, so the chatbot works even before Voyage exists.
 *
 * The pure functions here (cosineSimilarity, topKByEmbedding) are unit-tested.
 */
import { and, eq, sql } from "drizzle-orm";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { elderCorpusChunks } from "../../drizzle/schema";

export const VOYAGE_MODEL = "voyage-3";

export type RetrievedChunk = { id: number; book: string; section: string; content: string };

export function isVoyageConfigured(): boolean {
  return Boolean(ENV.voyageApiKey);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export type EmbeddedChunk<T> = T & { embedding: number[] | null };

/** Rank chunks (those that carry an embedding) by cosine similarity to a query. */
export function topKByEmbedding<T>(
  queryVec: number[],
  chunks: EmbeddedChunk<T>[],
  k: number,
): Array<T & { score: number }> {
  const scored: Array<T & { score: number }> = [];
  for (const c of chunks) {
    if (!c.embedding || c.embedding.length === 0) continue;
    const score = cosineSimilarity(queryVec, c.embedding);
    scored.push({ ...(c as T), score });
  }
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, k);
}

/**
 * Call Voyage AI to embed one or more texts. `inputType` is "query" for a user
 * question and "document" when embedding corpus chunks (Voyage recommends this
 * for asymmetric retrieval). Throws if VOYAGE_API_KEY is not set.
 */
export async function embedTexts(texts: string[], inputType: "query" | "document"): Promise<number[][]> {
  if (!isVoyageConfigured()) throw new Error("VOYAGE_API_KEY is not configured");
  if (texts.length === 0) return [];

  const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.voyageApiKey}`,
    },
    body: JSON.stringify({ input: texts, model: VOYAGE_MODEL, input_type: inputType }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Voyage embeddings failed: ${resp.status} ${detail.slice(0, 300)}`);
  }
  const json = (await resp.json()) as { data: Array<{ embedding: number[] }> };
  return json.data.map((d) => d.embedding);
}

/**
 * Retrieve the top-k most relevant canon chunks for a free-text query. Uses
 * Voyage embeddings when configured and the chunks carry vectors, otherwise
 * falls back to MySQL FULLTEXT. Shared by the Ask Anastasia chat and her
 * community comments so both draw on the canon identically.
 */
export async function retrieveCanonPassages(elder: string, query: string, topK: number): Promise<RetrievedChunk[]> {
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
      const [queryVec] = await embedTexts([query.slice(0, 2000)], "query");
      const top = topKByEmbedding(
        queryVec,
        embedded.map((r) => ({ ...r, embedding: r.embedding as number[] })),
        topK,
      );
      return top.map((r) => ({ id: r.id, book: r.book ?? "", section: r.section ?? "", content: r.content }));
    }
  }

  // Mode B: MySQL FULLTEXT keyword fallback.
  const q = query.slice(0, 512);
  const rows = await db
    .select({ id: elderCorpusChunks.id, book: elderCorpusChunks.book, section: elderCorpusChunks.section, content: elderCorpusChunks.content })
    .from(elderCorpusChunks)
    .where(and(eq(elderCorpusChunks.elder, elder), sql`MATCH(content) AGAINST(${q} IN NATURAL LANGUAGE MODE)`))
    .orderBy(sql`MATCH(content) AGAINST(${q} IN NATURAL LANGUAGE MODE) DESC`)
    .limit(topK);
  return rows.map((r) => ({ id: r.id, book: r.book ?? "", section: r.section ?? "", content: r.content }));
}
