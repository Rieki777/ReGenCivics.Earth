// Runs weekly: pulls top forum threads by engagement, generates digest, saves to DB, sends to subscribers
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { sendEmail, APP_BASE_URL } from "../_core/email";

const DIGEST_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// Extra guard: if a digest was sent within the last 2 hours, treat it as a duplicate
// (covers Railway redeploy race conditions where two instances both start up)
const DUPLICATE_GUARD_MS = 2 * 60 * 60 * 1000; // 2 hours

// Curated blog posts for fallback sections — rotated by week so each digest
// surfaces different content. Keep this list in sync with blogPosts.ts.
const BLOG_HIGHLIGHTS = [
  { title: "What Makes ReGen Civics Different: 7 Unique Features", slug: "what-makes-regen-civics-different" },
  { title: "Introducing Games and Quests: Play Your Way to Regeneration", slug: "introducing-games-and-quests" },
  { title: "Getting Investment Into Your Land Project Through ReGen Civics", slug: "getting-investment-through-regen-civics" },
  { title: "What Makes a Land Project a Good Investment: The Four Pillars", slug: "what-makes-land-project-good-investment" },
  { title: "How to Apply for Season 2: Complete Application Guide", slug: "how-to-apply-for-season-2" },
  { title: "The Great American Chestnut: A Story of Abundance Lost and Hope Restored", slug: "great-american-chestnut-abundance" },
  { title: "What If Organizations Were Actually Designed to Meet Human Needs?", slug: "what-if-organizations-met-needs" },
  { title: "Your SEEDS Contributions Live On", slug: "your-seeds-contributions-live-on" },
  { title: "Your Space Is Waiting: How to Claim Your Land Project or Organisation", slug: "claim-your-land-project-or-organisation" },
  { title: "How to Set Up Your Player Profile: Connect to the Game", slug: "how-to-set-up-player-profile" },
  { title: "You're Allowed to Have More Than One Honeymoon", slug: "more-than-one-honeymoon" },
];

// Site sections to rotate through in the "have you seen this?" block.
const SITE_HIGHLIGHTS = [
  { label: "The Regenerative Land Map", url: "/map", desc: "Explore land projects from across the globe in an interactive map." },
  { label: "The Bionomics Page", url: "/bionomics", desc: "The economic principles behind how regenerative land projects work." },
  { label: "The Tokenomics Page", url: "/tokenomics", desc: "How $ReGen and RGVoice tokens flow through the system." },
  { label: "The Fund Page", url: "/fund", desc: "The ReGen Civics Fund, which is in formation, and how to take part." },
  { label: "The Games and Quests Page", url: "/play", desc: "Complete real-world quests, earn tokens, and contribute to regenerative projects." },
  { label: "The Apply Page", url: "/apply", desc: "Apply to bring your land project into the incubator for Season 2." },
  { label: "Feature Suggestions", url: "/features", desc: "Suggest and vote on new features. Your input shapes what gets built." },
  { label: "The Governance Page", url: "/governance", desc: "How decisions get made in a decentralized, voice-based organization." },
  { label: "The Connection Hub", url: "/marketplace", desc: "Share what you can offer and find help with what you need." },
  { label: "The Opportunity Board", url: "/opportunity", desc: "Discover ways to contribute, collaborate, and grow within the ecosystem." },
];

/** Pick N items starting at a deterministic offset based on the week number. */
function rotatePick<T>(arr: T[], n: number, weekOffset: number): T[] {
  const start = weekOffset % arr.length;
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    result.push(arr[(start + i) % arr.length]);
  }
  return result;
}

/** ISO week number — used to rotate content so each digest is fresh. */
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function runDigestJob() {
  try {
    const latest = await db.getLatestDigest();
    if (latest) {
      const age = Date.now() - new Date(latest.generatedAt).getTime();
      // Hard duplicate guard: skip if sent in the last 2 hours (Railway restart protection)
      if (age < DUPLICATE_GUARD_MS) {
        const minsAgo = Math.round(age / 60000);
        console.log(`[DigestJob] Skipping — last digest was ${minsAgo}m ago (duplicate guard).`);
        return;
      }
      // Weekly interval guard
      if (age < DIGEST_INTERVAL_MS) {
        const hoursAgo = Math.round(age / (60 * 60 * 1000));
        console.log(`[DigestJob] Skipping — last digest was ${hoursAgo}h ago (< 7 days).`);
        return;
      }
    }

    const threads = await db.getRecentForumPostsForDigest();
    const weekNum = isoWeekNumber(new Date());

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let digestContent = "";

    if (threads.length >= 3) {
      // Enough live activity — generate LLM digest from forum threads
      const threadData = threads
        .map(t => `Title: ${t.title}\nContent: ${t.content.slice(0, 300)}\nReplies: ${t.replyCount}`)
        .join("\n\n---\n\n");

      const prompt = `You are the ReGen Civics community curator. Review the following forum threads from the past week and write a short digest for the community. For each of the 3-5 most valuable threads, write: the thread title, a 2-sentence summary of what was discussed, and why it matters to regenerative work. Keep the tone warm, human, and forward-looking. No em-dashes. Plain language throughout.\n\n${threadData}`;

      const response = await invokeLLM({ messages: [{ role: "user", content: prompt }], maxTokens: 800, task: "light" });
      digestContent = (response as any).choices?.[0]?.message?.content ?? "";
    }

    if (!digestContent) {
      digestContent = "(Blog edition — see email for featured reading.)";
    }

    await db.saveDigest({
      periodStart: weekAgo.toISOString().split("T")[0],
      periodEnd: now.toISOString().split("T")[0],
      contentMd: digestContent,
    });

    console.log("[DigestJob] Digest generated and saved.");

    await sendDigestEmails(threads.slice(0, 5), weekNum);

    // Steward weekly digest: per active campaign, nudge the steward on open
    // needs, claims to deliver, new followers, and pending reviews. Piggybacks
    // this weekly slot so it fires at most once a week. Its own try/catch keeps
    // a failure here from touching the community digest above.
    try {
      const { getDb } = await import("../db");
      const { sendStewardWeeklyDigest } = await import("./stewardDigestJob");
      const dbc = await getDb();
      if (dbc) {
        const r = await sendStewardWeeklyDigest(dbc);
        console.log(
          `[DigestJob] Steward digests: ${r.sent} sent, ${r.skippedQuiet} quiet, ${r.skippedFrequency} opted out (of ${r.campaigns} active).`,
        );
      }
    } catch (err) {
      console.error("[DigestJob] steward digest failed", err);
    }
  } catch (e) {
    console.error("[DigestJob] Error:", e);
    try { const Sentry = await import("@sentry/node"); Sentry.captureException(e, { tags: { job: "digest" } }); } catch {}
  }
}

async function sendDigestEmails(
  posts: { title: string; content: string; replyCount: number; id?: number }[],
  weekNum: number
) {
  try {
    const subscribers = await db.getActiveNewsletterSubscribers();
    if (subscribers.length === 0) return;

    const weekLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const hasLivePosts = posts.length >= 3;

    // ── Forum section ─────────────────────────────────────────────────────────
    let mainSection = "";
    if (hasLivePosts) {
      const postRows = posts.map((p, i) => {
        const excerpt = p.content.replace(/<[^>]+>/g, '').slice(0, 180).trim();
        const postUrl = p.id
          ? `${APP_BASE_URL}/community/post/${p.id}?utm_source=email&utm_medium=digest&utm_campaign=weekly`
          : `${APP_BASE_URL}/community?utm_source=email&utm_medium=digest&utm_campaign=weekly`;
        return `
          <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #e8e4de;">
              <a href="${postUrl}" style="font-size: 16px; font-weight: 600; color: #1a472a; text-decoration: none;">${i + 1}. ${p.title}</a>
              <p style="margin: 6px 0 8px; font-size: 14px; color: #4a5568; line-height: 1.5;">${excerpt}${excerpt.length >= 180 ? '...' : ''}</p>
              <span style="font-size: 12px; color: #7dd87d;">${p.replyCount} ${p.replyCount === 1 ? 'reply' : 'replies'}</span>
            </td>
          </tr>`;
      }).join('');

      mainSection = `
        <h2 style="color: #1a472a; font-size: 18px; margin: 0 0 16px;">What the community is talking about</h2>
        <table style="width: 100%; border-collapse: collapse;">${postRows}</table>
        <div style="text-align: center; margin-top: 28px;">
          <a href="${APP_BASE_URL}/community?utm_source=email&utm_medium=digest&utm_campaign=weekly"
             style="display: inline-block; background: #7dd87d; color: #1a472a; padding: 12px 32px; border-radius: 9999px; font-weight: bold; text-decoration: none; font-size: 15px;">
            Join the conversation
          </a>
        </div>`;
    } else {
      // Not enough live forum activity — fall back to blog suggestions
      const blogPicks = rotatePick(BLOG_HIGHLIGHTS, 3, weekNum);
      const blogRows = blogPicks.map(b => {
        const url = `${APP_BASE_URL}/blog/${b.slug}?utm_source=email&utm_medium=digest&utm_campaign=weekly`;
        return `
          <tr>
            <td style="padding: 14px 0; border-bottom: 1px solid #e8e4de;">
              <a href="${url}" style="font-size: 15px; font-weight: 600; color: #1a472a; text-decoration: none;">${b.title}</a>
            </td>
          </tr>`;
      }).join('');

      mainSection = `
        <h2 style="color: #1a472a; font-size: 18px; margin: 0 0 8px;">From the blog</h2>
        <p style="color: #4a5568; font-size: 14px; margin: 0 0 16px; line-height: 1.6;">The community has been quiet this week. Here are three pieces worth reading while things warm back up.</p>
        <table style="width: 100%; border-collapse: collapse;">${blogRows}</table>
        <div style="text-align: center; margin-top: 28px;">
          <a href="${APP_BASE_URL}/community?utm_source=email&utm_medium=digest&utm_campaign=weekly"
             style="display: inline-block; background: #7dd87d; color: #1a472a; padding: 12px 32px; border-radius: 9999px; font-weight: bold; text-decoration: none; font-size: 15px;">
            Start a conversation
          </a>
        </div>`;
    }

    // ── Assembly section (weekly governance movement) ────────────────────────
    let assemblySection = "";
    try {
      const { getDb } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const dbc = await getDb();
      if (dbc) {
        const [counts] = await dbc.execute(sql`
          SELECT
            SUM(CASE WHEN status = 'signaling' AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS newForming,
            SUM(CASE WHEN status = 'signaling' AND lastCallStartedAt IS NOT NULL THEN 1 ELSE 0 END) AS inLastCall,
            SUM(CASE WHEN status = 'threshold_reached' THEN 1 ELSE 0 END) AS readyToLaunch,
            SUM(CASE WHEN status = 'in_governance' THEN 1 ELSE 0 END) AS deciding,
            SUM(CASE WHEN status IN ('passed', 'implemented') AND updatedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS passedThisWeek
          FROM proposals
          WHERE isExample = 0`);
        const c: any = (counts as any)?.[0] ?? {};
        const parts: string[] = [];
        if (Number(c.newForming) > 0) parts.push(`${c.newForming} new forming`);
        if (Number(c.inLastCall) > 0) parts.push(`${c.inLastCall} in last call`);
        if (Number(c.readyToLaunch) > 0) parts.push(`${c.readyToLaunch} ready to launch`);
        if (Number(c.deciding) > 0) parts.push(`${c.deciding} at a binding vote`);
        if (Number(c.passedThisWeek) > 0) parts.push(`${c.passedThisWeek} passed this week`);
        if (parts.length > 0) {
          assemblySection = `
      <div style="background: #f0f7f0; border-left: 4px solid #7dd87d; padding: 18px 20px; border-radius: 0 8px 8px 0; margin-top: 32px;">
        <p style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #7dd87d; margin: 0 0 6px; font-weight: bold;">The Assembly</p>
        <p style="font-size: 14px; color: #1a472a; margin: 0 0 12px; line-height: 1.6;">${parts.join(" · ")}</p>
        <a href="${APP_BASE_URL}/assembly?utm_source=email&utm_medium=digest&utm_campaign=weekly" style="font-size: 13px; color: #1a472a; font-weight: bold; text-decoration: underline;">Visit the Assembly</a>
      </div>`;
        }
      }
    } catch (err) {
      console.error("[DigestJob] assembly section failed", err);
    }

    // ── "Have you seen this?" section ─────────────────────────────────────────
    const sitePick = rotatePick(SITE_HIGHLIGHTS, 1, weekNum + 3)[0];
    const sitePickUrl = `${APP_BASE_URL}${sitePick.url}?utm_source=email&utm_medium=digest&utm_campaign=site-explore`;

    const siteSection = `
      <div style="background: #f0f7f0; border-left: 4px solid #7dd87d; padding: 18px 20px; border-radius: 0 8px 8px 0; margin-top: 32px;">
        <p style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #7dd87d; margin: 0 0 6px; font-weight: bold;">Worth exploring</p>
        <p style="font-size: 15px; font-weight: 600; color: #1a472a; margin: 0 0 6px;">Have you seen <a href="${sitePickUrl}" style="color: #1a472a;">${sitePick.label}</a>?</p>
        <p style="font-size: 13px; color: #4a5568; margin: 0 0 12px; line-height: 1.6;">${sitePick.desc}</p>
        <a href="${sitePickUrl}" style="font-size: 13px; color: #1a472a; font-weight: bold; text-decoration: underline;">Take a look</a>
      </div>`;

    // ── Connect section ───────────────────────────────────────────────────────
    const connectSection = `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e8e4de;">
        <p style="font-size: 13px; color: #1a472a; font-weight: bold; margin: 0 0 10px;">Connect with the community</p>
        <p style="margin: 0; font-size: 13px; line-height: 2; color: #4a5568;">
          <a href="${APP_BASE_URL}/community?utm_source=email&utm_medium=digest" style="color: #1a472a; text-decoration: none; font-weight: 600;">Community Forum</a> &nbsp;|&nbsp;
          <a href="https://chat.whatsapp.com/GX2NiNyKNIFAJfFoqBMauT" style="color: #1a472a; text-decoration: none;">WhatsApp</a> &nbsp;|&nbsp;
          <a href="https://discord.gg/regencivics" style="color: #1a472a; text-decoration: none;">Discord</a> &nbsp;|&nbsp;
          <a href="https://youtube.com/@regencivics" style="color: #1a472a; text-decoration: none;">YouTube</a>
        </p>
      </div>`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Georgia, serif; background: #fff;">
        <div style="background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); padding: 32px 40px; text-align: center;">
          <p style="color: #7dd87d; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px;">Weekly Round-Up · ${weekLabel}</p>
          <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-family: Georgia, serif;">ReGen Civics Community Update</h1>
        </div>
        <div style="padding: 32px 40px;">
          ${mainSection}
          ${assemblySection}
          ${siteSection}
          ${connectSection}
        </div>
        <div style="padding: 24px 40px; background: #f8f5f0; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0 0 6px;">You're getting this because you subscribed to ReGen Civics updates.</p>
          <p style="margin: 0;"><a href="${APP_BASE_URL}/profile?utm_source=email&utm_medium=digest" style="color: #1a472a;">Update email preferences</a></p>
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
            subject: `This week in the community: ${weekLabel}`,
            html,
          }).catch(err => console.warn(`[DigestJob] Failed to send to ${sub.email}:`, err))
        )
      );
      if (i + BATCH < subscribers.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    console.log(`[DigestJob] Digest sent to ${subscribers.length} subscribers.`);
  } catch (err) {
    console.error("[DigestJob] Failed to send digest emails:", err);
  }
}
