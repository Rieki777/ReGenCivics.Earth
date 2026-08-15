/**
 * seed-ship-quest-elder-comments.ts — item 17, part 2 of 2.
 *
 * The ReGen Ship "Free Passage Quest" threads should each carry exactly one
 * comment from each AI Elder. On three of them Anastasia had commented (the
 * duplicates were removed in migration 0214) but Yeshua had not, so the two
 * elders were unbalanced. This adds the missing Yeshua comment to those three
 * threads, in his own voice, grounded in his canon (The Essene Gospel of Peace:
 * peace of body and family, the body as a garden, the living law of love).
 *
 * The elders' voice is human-reviewed before it goes public (the same governance
 * as scripts/elder-forum-backfill.ts), so these texts are fixed and reviewable,
 * not generated at post time.
 *
 * Idempotent: skips any thread where Yeshua already has a top-level comment, and
 * only touches threads where Anastasia has already commented (the curated three).
 *
 * Usage:
 *   npx tsx scripts/seed-ship-quest-elder-comments.ts            # DRY RUN:
 *       writes the proposed comments to SHIP_QUEST_ELDER_REVIEW.md, posts nothing
 *   npx tsx scripts/seed-ship-quest-elder-comments.ts --post     # insert the
 *       reviewed comments into the live forum (idempotent)
 */
import mysql from "mysql2/promise";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ quiet: true } as never);

const POST = process.argv.includes("--post");
const REPORT = join(process.cwd(), "SHIP_QUEST_ELDER_REVIEW.md");
const YESHUA_OPENID = "bot:yeshua";
const ANASTASIA_OPENID = "bot:anastasia";

/**
 * The missing Yeshua comment for each quest thread, keyed by the quest action
 * slug (robust across databases; the forum post id is looked up from it). One
 * comment per thread, in Yeshua's voice, matching the elders' writing rules
 * (plain modern prose, no em-dash, no markdown, no named sources).
 */
const YESHUA_COMMENTS: Record<string, string> = {
  "love-letter-to-a-landscape":
    "You are made of the place you come from. The water you first drank rose from its springs, the air you first breathed moved through its trees, and your body took its shape from what that ground could give. To write a love letter to a landscape is to admit how deep that belonging goes.\n\nSay it simply. Name what the place taught your body and your spirit, and what of it you still carry. There is a peace that comes when you stop living as though you were separate from the earth that fed you. Let the letter be the beginning of that peace. Then read what others have written, and see your own belonging reflected back.",
  "cook-for-your-beloved":
    "To feed someone you love is one of the oldest and gentlest laws there is. The flesh of the earth ripens in the fruit of the trees and the grain of the fields, and when you gather it close to home and cook it with care, you are handing another person the living strength of your own ground.\n\nKeep it simple and real. Let the food be what the season near you actually offers, and let the meal be a kind of peace between your body, the land, and the one you are feeding. When you have done it, tell us what grew, what you made, and who sat at your table. The body is a garden, and a meal given in love is one of the truest ways we tend each other's.",
  "plant-together":
    "When two people put their hands in the same soil and set a living thing into the ground, something passes between them that words rarely reach. You are making a small peace, with each other and with the earth that will hold what you planted. The tree knows only the hands that tend it. It grows by the same law for every person, whoever they are.\n\nPlant it together. Let one of you hold and one of you fill. Come back to it through the seasons and you will find the bond has grown along with the roots. Then show us the two of you at the work, so others can see what peace looks like when people plant it with their own hands.",
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL not set. Check your .env.");
    process.exit(1);
  }
  const conn = await mysql.createConnection(url);
  try {
    const [yRows] = await conn.execute<any[]>("SELECT id, name FROM users WHERE openId = ? LIMIT 1", [YESHUA_OPENID]);
    const yeshua = yRows[0];
    if (!yeshua) throw new Error(`Yeshua bot user (${YESHUA_OPENID}) not found`);

    const reviewBlocks: string[] = [];
    let inserted = 0, skipped = 0;

    for (const [slug, yeshuaText] of Object.entries(YESHUA_COMMENTS)) {
      const [aRows] = await conn.execute<any[]>(
        "SELECT id, forumPostId, title FROM ship_quest_actions WHERE slug = ? LIMIT 1",
        [slug],
      );
      const action = aRows[0];
      if (!action?.forumPostId) {
        console.warn(`  ! ${slug}: no linked forum thread, skipping`);
        skipped++;
        continue;
      }
      const postId: number = action.forumPostId;

      // The thread and its existing top-level elder comments (for context/guards).
      const [postRows] = await conn.execute<any[]>("SELECT title, content FROM forumPosts WHERE id = ? LIMIT 1", [postId]);
      const post = postRows[0];
      const [replies] = await conn.execute<any[]>(
        `SELECT u.openId, r.content
           FROM forumReplies r JOIN users u ON u.id = r.authorId
          WHERE r.postId = ? AND r.parentReplyId IS NULL AND u.openId IN (?, ?)
          ORDER BY r.createdAt`,
        [postId, ANASTASIA_OPENID, YESHUA_OPENID],
      );
      const anastasiaText = replies.find((r: any) => r.openId === ANASTASIA_OPENID)?.content ?? null;
      const yeshuaAlready = replies.some((r: any) => r.openId === YESHUA_OPENID);

      // Guard: only the curated three (where Anastasia has commented). Never add
      // Yeshua to a thread the design did not intend.
      if (!anastasiaText) {
        console.warn(`  ! post#${postId} [${slug}]: no Anastasia comment present, skipping (out of scope)`);
        skipped++;
        continue;
      }

      reviewBlocks.push(
        [
          `## post#${postId} — ${post?.title ?? action.title}`,
          "",
          `**Thread prompt:** ${(post?.content ?? "").replace(/\n+/g, " ")}`,
          "",
          "**AI Elder Anastasia (already live):**",
          "> " + String(anastasiaText).replace(/\n/g, "\n> "),
          "",
          `**AI Elder Yeshua (proposed${yeshuaAlready ? ", ALREADY POSTED" : ""}):**`,
          "> " + yeshuaText.replace(/\n/g, "\n> "),
          "",
        ].join("\n"),
      );

      if (yeshuaAlready) {
        skipped++;
        continue;
      }

      if (POST) {
        const [res] = await conn.execute<any>(
          "INSERT INTO forumReplies (postId, authorId, content, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())",
          [postId, yeshua.id, yeshuaText],
        );
        // Mirror db.createForumReply's bookkeeping (self-correcting count).
        await conn.execute(
          `UPDATE forumPosts
              SET replyCount = (SELECT COUNT(*) FROM forumReplies WHERE postId = ?),
                  lastReplyAt = NOW(), lastReplyBy = ?
            WHERE id = ?`,
          [postId, yeshua.id, postId],
        );
        console.log(`  + posted Yeshua on post#${postId} [${slug}] (reply#${res.insertId})`);
        inserted++;
      } else {
        console.log(`  ~ would post Yeshua on post#${postId} [${slug}]`);
      }
    }

    const md = [
      "# Ship quest elder comments — review",
      "",
      `Item 17, part 2: the missing AI Elder Yeshua comment on each curated Free`,
      `Passage Quest thread, paired with Anastasia's existing comment for context.`,
      POST ? "\nStatus: POSTED to the live forum." : "\nStatus: DRY RUN (nothing posted).",
      "",
      "To post after review: `npx tsx scripts/seed-ship-quest-elder-comments.ts --post`",
      "",
      "---",
      "",
      ...reviewBlocks,
    ].join("\n");
    writeFileSync(REPORT, md + "\n");

    console.log(`\n${POST ? "Posted" : "Dry run"}: inserted=${inserted}, skipped=${skipped}. Review written to ${REPORT}`);
    if (!POST) console.log("Nothing posted. Review the file, then re-run with --post.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
