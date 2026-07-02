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
import { ENV } from "../_core/env";

export const VOYAGE_MODEL = "voyage-3";

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
