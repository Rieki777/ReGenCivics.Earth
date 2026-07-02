/**
 * One-time backfill: have the elders consider every EXISTING community post
 * (the ones before they came into being, which the live job deliberately skips)
 * so Rye can review their voice before it goes public.
 *
 * Reuses the exact live logic: excluded categories, crisis skip, best-fit elder
 * routing, canon-grounded generation, and the PASS gate. The only difference is
 * it ignores the no-backfill cutoff and processes old posts.
 *
 *   npx tsx scripts/elder-forum-backfill.ts              # DRY RUN (default):
 *       routes + writes every comment to ELDER_BACKFILL_REVIEW.md, posts nothing
 *   npx tsx scripts/elder-forum-backfill.ts --post       # actually post the
 *       generated comments to the live forum (skips posts already commented on)
 *   npx tsx scripts/elder-forum-backfill.ts --limit=5    # only the N most recent
 */
import "dotenv/config";
import { and, desc, eq, inArray, notInArray } from "drizzle-orm";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as db from "../server/db";
import { getDb } from "../server/db";
import { forumCategories, forumPosts, forumReplies } from "../drizzle/schema";
import { invokeLLM } from "../server/_core/llm";
import { retrieveCanonPassages } from "../server/lib/elder-retrieval";
import { buildElderForumCommentPrompt, detectCrisis } from "../server/lib/elder-safety";
import { forumElders, getElder } from "../server/lib/elders";
import {
  EXCLUDED_CATEGORY_SLUGS,
  FORUM_TOP_K,
  corpusHasRows,
  getOrCreateElderBotUser,
  parseComment,
  postQueryText,
  routePostToElder,
} from "../server/lib/elder-forum";

const POST = process.argv.includes("--post");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.slice(8), 10) : undefined;
const REPORT = join(process.cwd(), "ELDER_BACKFILL_REVIEW.md");

async function main() {
  const database = await getDb();
  if (!database) throw new Error("no db");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

  const active = [];
  for (const elder of forumElders()) {
    if (!(await corpusHasRows(elder.id))) {
      console.log(`skip ${elder.id}: no corpus`);
      continue;
    }
    const bot = await getOrCreateElderBotUser(elder);
    if (bot) active.push({ elder, bot });
  }
  if (active.length === 0) throw new Error("no active elders with corpus");
  console.log(`Active elders: ${active.map((a) => a.elder.id).join(", ")}`);

  const botIds = active.map((a) => a.bot.userId);
  const elderById = new Map(active.map((a) => [a.elder.id, a]));

  const excludedCatIds = EXCLUDED_CATEGORY_SLUGS.length
    ? (await database.select({ id: forumCategories.id }).from(forumCategories).where(inArray(forumCategories.slug, EXCLUDED_CATEGORY_SLUGS))).map((c) => c.id)
    : [];

  // Which posts already have an elder comment (so --post is re-runnable).
  const existing = await database.select({ postId: forumReplies.postId }).from(forumReplies).where(inArray(forumReplies.authorId, botIds));
  const commented = new Set(existing.map((r) => r.postId));

  let posts = await database
    .select()
    .from(forumPosts)
    .where(
      and(
        eq(forumPosts.isLocked, 0),
        notInArray(forumPosts.authorId, botIds),
        excludedCatIds.length ? notInArray(forumPosts.categoryId, excludedCatIds) : undefined,
      ),
    )
    .orderBy(desc(forumPosts.createdAt));
  if (LIMIT) posts = posts.slice(0, LIMIT);

  console.log(`Considering ${posts.length} posts (${POST ? "POST MODE" : "dry run"}).`);

  const rows: Array<{ postId: number; title: string; elder: string; comment: string }> = [];
  const declined: Array<{ postId: number; title: string; why: string }> = [];

  for (const post of posts) {
    if (commented.has(post.id)) {
      declined.push({ postId: post.id, title: post.title, why: "already has an elder comment" });
      continue;
    }
    if (detectCrisis(`${post.title}\n${post.content}`)) {
      declined.push({ postId: post.id, title: post.title, why: "crisis content, skipped" });
      continue;
    }
    const chosen = await routePostToElder(post.title, post.content, active.map((a) => a.elder));
    if (!chosen) {
      declined.push({ postId: post.id, title: post.title, why: "router: no elder fits" });
      continue;
    }
    const a = elderById.get(chosen);
    if (!a) {
      declined.push({ postId: post.id, title: post.title, why: `router returned unknown id ${chosen}` });
      continue;
    }
    const passages = await retrieveCanonPassages(a.elder.id, postQueryText(post.title, post.content), FORUM_TOP_K);
    const res = await invokeLLM({
      messages: [
        { role: "system", content: buildElderForumCommentPrompt(a.elder, passages) },
        { role: "user", content: `Community post\nTitle: ${post.title}\n\n${post.content}` },
      ],
      maxTokens: 500,
    });
    const comment = parseComment(res.choices?.[0]?.message?.content ?? "");
    if (!comment) {
      declined.push({ postId: post.id, title: post.title, why: `${a.elder.id} judged it did not call for a comment (PASS)` });
      continue;
    }
    rows.push({ postId: post.id, title: post.title, elder: a.elder.id, comment });
    console.log(`  #${post.id} -> ${a.elder.displayName}: ${post.title.slice(0, 50)}`);
  }

  // Report
  const byElder: Record<string, number> = {};
  rows.forEach((r) => { byElder[r.elder] = (byElder[r.elder] ?? 0) + 1; });
  const md = [
    "# Elder backfill review",
    "",
    `Generated ${POST ? "and POSTED" : "in dry-run"} over ${posts.length} existing posts.`,
    `Comments generated: ${rows.length}. Declined: ${declined.length}.`,
    `By elder: ${Object.entries(byElder).map(([e, n]) => `${e}=${n}`).join(", ") || "none"}.`,
    "",
    "To post these for real after review: `npx tsx scripts/elder-forum-backfill.ts --post`",
    "To silence an elder or ban a category, edit server/lib/elders.ts / elder-forum.ts.",
    "",
    "---",
    "",
    ...rows.map((r) => {
      const e = getElder(r.elder);
      return [
        `## Post #${r.postId}: ${r.title}`,
        `**${e?.displayName ?? r.elder}** would comment:`,
        "",
        "> " + r.comment.replace(/\n/g, "\n> "),
        "",
      ].join("\n");
    }),
    "---",
    "",
    "## Declined (no comment)",
    "",
    ...declined.map((d) => `- #${d.postId} "${d.title.slice(0, 60)}" - ${d.why}`),
  ].join("\n");
  writeFileSync(REPORT, md + "\n");
  console.log(`\nReport written to ${REPORT}`);

  if (POST) {
    let posted = 0;
    for (const r of rows) {
      const a = elderById.get(r.elder)!;
      await db.createForumReply({ postId: r.postId, authorId: a.bot.userId, content: r.comment });
      posted++;
    }
    console.log(`POSTED ${posted} comments to the live forum.`);
  } else {
    console.log(`Dry run: nothing posted. Review ${REPORT}, then re-run with --post.`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
