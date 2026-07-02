/**
 * Build the elder retrieval corpus for Ask Anastasia.
 *
 * Reads a canon markdown file, splits it into book/section chunks (via the pure
 * parser in server/lib/elder-corpus.ts), optionally embeds each chunk with
 * Voyage AI, and writes rows into `elder_corpus_chunks`. Re-runnable: it deletes
 * the elder's existing rows first, then inserts the fresh set.
 *
 * This WRITES to the Railway DB, so RYE runs it (handoff task 6):
 *   npx tsx scripts/build-elder-corpus.ts                # embeds if VOYAGE_API_KEY is set
 *   npx tsx scripts/build-elder-corpus.ts --no-embed     # FULLTEXT-only, no Voyage
 *   npx tsx scripts/build-elder-corpus.ts --dry-run      # parse + stats only, no DB/network
 *   npx tsx scripts/build-elder-corpus.ts --file=path.md --elder=anastasia
 *
 * Claude Code tests the parsing logic against the real canon with --dry-run.
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { join, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCanon, type CorpusChunk } from "../server/lib/elder-corpus";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

const VOYAGE_MODEL = "voyage-3";
const EMBED_BATCH = 96;

function arg(name: string, fallback?: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ input: texts, model: VOYAGE_MODEL, input_type: "document" }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Voyage embeddings failed: ${resp.status} ${detail.slice(0, 300)}`);
  }
  const json = (await resp.json()) as { data: Array<{ embedding: number[] }> };
  return json.data.map((d) => d.embedding);
}

async function main() {
  const elder = arg("elder", "anastasia")!;
  const fileArg = arg("file", "anastasia_canon.md")!;
  const filePath = isAbsolute(fileArg) ? fileArg : join(REPO_ROOT, fileArg);
  const dryRun = hasFlag("dry-run");
  const noEmbed = hasFlag("no-embed");

  const md = readFileSync(filePath, "utf8");
  const chunks: CorpusChunk[] = parseCanon(md, elder);

  const books = new Set(chunks.map((c) => c.book));
  const totalTokens = chunks.reduce((s, c) => s + c.contentTokens, 0);
  console.log(`Parsed ${chunks.length} chunks from ${fileArg}`);
  console.log(`  books: ${books.size}, ~${totalTokens} tokens total, ~${Math.round(totalTokens / Math.max(1, chunks.length))} tokens/chunk`);
  console.log(`  longest chunk: ${Math.max(...chunks.map((c) => c.contentTokens))} tokens`);

  if (dryRun) {
    console.log("\n--dry-run: no DB writes, no embeddings. Sample chunks:");
    for (const c of chunks.slice(0, 3)) {
      console.log(`  [${c.book} / ${c.section}] (${c.contentTokens} tok) ${c.content.slice(0, 80).replace(/\n/g, " ")}...`);
    }
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set. Run with --dry-run to test parsing without a DB.");

  const voyageKey = process.env.VOYAGE_API_KEY;
  const willEmbed = Boolean(voyageKey) && !noEmbed;
  console.log(willEmbed ? "\nEmbedding with Voyage (voyage-3)..." : "\nNo embeddings (FULLTEXT-only retrieval).");

  let embeddings: (number[] | null)[] = chunks.map(() => null);
  if (willEmbed) {
    embeddings = [];
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const vecs = await embedBatch(batch.map((c) => c.content), voyageKey!);
      embeddings.push(...vecs);
      console.log(`  embedded ${Math.min(i + EMBED_BATCH, chunks.length)}/${chunks.length}`);
    }
  }

  const pool = mysql.createPool({ uri: dbUrl, connectionLimit: 5 });
  try {
    const [del] = await pool.query("DELETE FROM elder_corpus_chunks WHERE elder = ?", [elder]);
    console.log(`Cleared existing rows for elder=${elder} (${(del as { affectedRows?: number }).affectedRows ?? 0}).`);

    let inserted = 0;
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const emb = embeddings[i];
      await pool.query(
        `INSERT INTO elder_corpus_chunks (elder, book, section, chunkIndex, content, contentTokens, embedding, embeddingModel)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.elder, c.book, c.section, c.chunkIndex, c.content, c.contentTokens, emb ? JSON.stringify(emb) : null, emb ? VOYAGE_MODEL : null],
      );
      inserted++;
    }
    console.log(`Inserted ${inserted} chunks for elder=${elder}. Retrieval mode: ${willEmbed ? "embeddings + FULLTEXT fallback" : "FULLTEXT"}.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
