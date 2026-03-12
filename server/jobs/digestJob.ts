// Runs weekly: pulls top forum threads by engagement, generates digest via Claude, saves to DB
import { invokeLLM } from "../_core/llm";
import * as db from "../db";

export async function runDigestJob() {
  try {
    const threads = await db.getRecentForumPostsForDigest();
    if (threads.length === 0) {
      console.log("[DigestJob] No recent forum posts found, skipping.");
      return;
    }

    const threadData = threads
      .map(t => `Title: ${t.title}\nContent: ${t.content.slice(0, 300)}\nReplies: ${t.replyCount}`)
      .join("\n\n---\n\n");

    const prompt = `You are the ReGen Civics community curator. Review the following forum threads from the past week and write a short digest for the community. For each of the 3-5 most valuable threads, write: the thread title, a 2-sentence summary of what was discussed, and why it matters to regenerative work. Keep the tone warm, human, and forward-looking. No em-dashes. Plain language throughout.\n\n${threadData}`;

    const response = await invokeLLM({ messages: [{ role: "user", content: prompt }], maxTokens: 800 });
    const digestContent = (response as any).choices?.[0]?.message?.content ?? "";

    if (!digestContent) {
      console.log("[DigestJob] No content generated, skipping save.");
      return;
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    await db.saveDigest({
      periodStart: weekAgo.toISOString().split("T")[0],
      periodEnd: now.toISOString().split("T")[0],
      contentMd: digestContent,
    });

    console.log("[DigestJob] Digest generated and saved.");
  } catch (e) {
    console.error("[DigestJob] Error:", e);
  }
}
