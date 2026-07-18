// Scans recent forum posts for potential new terms and proposes them
import { invokeLLM } from "../_core/llm";
import * as db from "../db";

export async function runGlossaryJob() {
  try {
    const posts = await db.getRecentForumPostsForDigest();
    if (posts.length === 0) return;

    const postText = posts.map(p => `${p.title}: ${p.content.slice(0, 200)}`).join("\n");

    const prompt = `You are reviewing forum posts from the ReGen Civics community -- a regenerative civilization fund and game. Extract 2-5 domain-specific terms that appear to be used with specific meaning in this community. For each term, provide: term name, a 1-2 sentence definition based on how it is used. Return as JSON array: [{"term": "...", "definition": "..."}]. Only include terms genuinely specific to regenerative land stewardship, governance, or this community. No common words.\n\nPosts:\n${postText}`;

    const response = await invokeLLM({ messages: [{ role: "user", content: prompt }], maxTokens: 600, task: "light" });
    const content = (response as any).choices?.[0]?.message?.content ?? "";

    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return;

    const terms: { term: string; definition: string }[] = JSON.parse(match[0]);
    for (const t of terms) {
      if (!t.term || !t.definition) continue;
      const existing = await db.getGlossaryTermByName(t.term);
      if (!existing) {
        await db.addGlossaryTerm({ term: t.term, definition: t.definition, status: "proposed" });
        console.log(`[GlossaryJob] Proposed: ${t.term}`);
      }
    }
  } catch (e) {
    console.error("[GlossaryJob] Error:", e);
    try { const Sentry = await import("@sentry/node"); Sentry.captureException(e, { tags: { job: "glossary" } }); } catch {}
  }
}
