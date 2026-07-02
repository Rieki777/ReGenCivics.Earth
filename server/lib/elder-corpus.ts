/**
 * Elder corpus parsing (pure, no DB, no network) for the Ask Anastasia feature.
 *
 * Splits a canon markdown file into retrieval chunks tagged with book + section.
 * The build script (scripts/build-elder-corpus.ts) uses this to populate
 * elder_corpus_chunks; tests exercise it against the real canon. Elder-agnostic:
 * the same parser works for any elder's canon file.
 */

export type CorpusChunk = {
  elder: string;
  book: string;
  section: string;
  chunkIndex: number;
  content: string;
  contentTokens: number;
};

/** Rough token estimate (~4 chars/token) good enough for windowing + budgeting. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ~900 tokens target, ~120 tokens overlap, expressed in characters.
const TARGET_CHARS = 3600;
const OVERLAP_CHARS = 480;
const MIN_CHARS = 200;

/** Split one section's body into overlapping windows on paragraph boundaries. */
function windowSection(body: string): string[] {
  const text = body.trim();
  if (text.length <= TARGET_CHARS) return text ? [text] : [];

  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const windows: string[] = [];
  let current = "";
  for (const para of paras) {
    if (current && current.length + para.length + 2 > TARGET_CHARS) {
      windows.push(current);
      // start next window with a tail of the previous for continuity
      const tail = current.slice(Math.max(0, current.length - OVERLAP_CHARS));
      current = `${tail}\n\n${para}`;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current.trim()) windows.push(current.trim());
  return windows;
}

/**
 * Parse a canon markdown string into chunks. Books are `# BOOK ...` headings;
 * sections are `## ...` headings. Front-matter before the first book is ignored.
 */
export function parseCanon(markdown: string, elder = "anastasia"): CorpusChunk[] {
  const lines = markdown.split(/\r?\n/);
  const chunks: CorpusChunk[] = [];
  let book = "";
  let section = "";
  let buffer: string[] = [];
  let index = 0;

  const flush = () => {
    if (!book) {
      buffer = [];
      return;
    }
    const body = buffer.join("\n");
    for (const win of windowSection(body)) {
      if (win.length < MIN_CHARS && chunks.length > 0 && chunks[chunks.length - 1].book === book) {
        // merge a tiny trailing fragment into the previous chunk of the same book
        const prev = chunks[chunks.length - 1];
        prev.content = `${prev.content}\n\n${win}`.trim();
        prev.contentTokens = estimateTokens(prev.content);
        continue;
      }
      chunks.push({
        elder,
        book,
        section: section || book,
        chunkIndex: index++,
        content: win,
        contentTokens: estimateTokens(win),
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    if (/^#\s+BOOK/i.test(line)) {
      flush();
      book = line.replace(/^#\s+/, "").trim();
      section = "";
      continue;
    }
    if (/^##\s+/.test(line)) {
      flush();
      section = line.replace(/^##\s+/, "").trim();
      continue;
    }
    buffer.push(line);
  }
  flush();

  return chunks;
}
