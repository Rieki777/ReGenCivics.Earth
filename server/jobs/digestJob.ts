// Runs weekly: pulls top forum threads by engagement, generates digest, saves to DB, sends to subscribers
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { sendEmail, APP_BASE_URL } from "../_core/email";

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

    // Send the digest email to active newsletter subscribers
    await sendDigestEmails(threads.slice(0, 5));
  } catch (e) {
    console.error("[DigestJob] Error:", e);
    try { const Sentry = await import("@sentry/node"); Sentry.captureException(e, { tags: { job: "digest" } }); } catch {}
  }
}

async function sendDigestEmails(
  posts: { title: string; content: string; replyCount: number; id?: number }[]
) {
  try {
    const subscribers = await db.getActiveNewsletterSubscribers();
    if (subscribers.length === 0) return;

    const weekLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const postRows = posts.map((p, i) => {
      const excerpt = p.content.replace(/<[^>]+>/g, '').slice(0, 180).trim();
      const postUrl = p.id
        ? `${APP_BASE_URL}/community/post/${p.id}?utm_source=email&utm_medium=digest&utm_campaign=weekly`
        : `${APP_BASE_URL}/community?utm_source=email&utm_medium=digest&utm_campaign=weekly`;
      return `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid #e8e4de;">
            <a href="${postUrl}" style="font-size: 16px; font-weight: 600; color: #1a472a; text-decoration: none;">${i + 1}. ${p.title}</a>
            <p style="margin: 6px 0 8px; font-size: 14px; color: #4a5568; line-height: 1.5;">${excerpt}${excerpt.length >= 180 ? '…' : ''}</p>
            <span style="font-size: 12px; color: #7dd87d;">${p.replyCount} ${p.replyCount === 1 ? 'reply' : 'replies'}</span>
          </td>
        </tr>`;
    }).join('');

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Georgia, serif; background: #fff;">
        <div style="background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); padding: 32px 40px; text-align: center;">
          <p style="color: #7dd87d; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px;">Weekly Round-Up · ${weekLabel}</p>
          <h1 style="color: #ffffff; font-size: 24px; margin: 0;">What the community is talking about</h1>
        </div>
        <div style="padding: 32px 40px;">
          <table style="width: 100%; border-collapse: collapse;">${postRows}</table>
          <div style="text-align: center; margin-top: 32px;">
            <a href="${APP_BASE_URL}/community?utm_source=email&utm_medium=digest&utm_campaign=weekly"
               style="display: inline-block; background: #7dd87d; color: #1a472a; padding: 12px 32px; border-radius: 9999px; font-weight: bold; text-decoration: none; font-size: 15px;">
              Join the conversation
            </a>
          </div>
        </div>
        <div style="padding: 24px 40px; background: #f8f5f0; text-align: center; font-size: 12px; color: #6b7280;">
          <p>You're receiving this because you subscribed to ReGen Civics updates.</p>
          <p><a href="${APP_BASE_URL}/unsubscribe?utm_source=email&utm_medium=digest" style="color: #1a472a;">Unsubscribe</a></p>
        </div>
      </div>`;

    // Send in batches of 20 to avoid rate limits
    const BATCH = 20;
    for (let i = 0; i < subscribers.length; i += BATCH) {
      const batch = subscribers.slice(i, i + BATCH);
      await Promise.allSettled(
        batch.map(sub =>
          sendEmail({
            to: sub.email,
            subject: `This week in the community — ${weekLabel}`,
            html,
          }).catch(err => console.warn(`[DigestJob] Failed to send to ${sub.email}:`, err))
        )
      );
      // Brief pause between batches
      if (i + BATCH < subscribers.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    console.log(`[DigestJob] Digest sent to ${subscribers.length} subscribers.`);
  } catch (err) {
    console.error("[DigestJob] Failed to send digest emails:", err);
  }
}
