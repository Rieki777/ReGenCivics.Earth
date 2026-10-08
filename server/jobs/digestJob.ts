// Runs weekly: pulls top forum threads by engagement, sends the digest, then saves the week.
// The letter is built from forum excerpts or the rotating blog list. The archive
// row stores a fixed note. It does not call a model.
import * as db from "../db";
import { sendEmail, getAppBaseUrl, msUntilStartupEmailGuardEnds } from "../_core/email";
import { providerAccepted } from "../lib/emailAttempt";
import { emailsAcceptedSince } from "../emailTracking";
import { rewriteLegacySiteUrls } from "../../shared/siteContext";
import { audienceForTopic, managePreferencesUrl } from "../lib/emailPrefs";
import { emailDocumentHtml } from "../../shared/emailChrome";
import { newsletterLegalFooterHtml } from "../../shared/letterHtml";
import {
  WHATSAPP_COMMUNITY_URL,
  DISCORD_INVITE_URL,
  YOUTUBE_CHANNEL_URL,
  HYLO_SEEDS_URL,
  HOLOS_REGEN_CIVICS_URL,
} from "../../shared/communityLinks";
import { ENV } from "../_core/env";
import { COOP } from "../../shared/fund";

const DIGEST_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const DIGEST_PARTIAL_RETRY_MS = 10 * 60 * 1000;
export const DIGEST_HELD_RETRY_MS = 60 * 60 * 1000;
export const WEEKLY_DIGEST_TEMPLATE = "weekly_digest";
/** Stored on digests.contentMd. The email does not render this string. */
export const DIGEST_ARCHIVE_NOTE = "(Blog edition. See the email for featured reading.)";

export type DigestJobResult =
  | { status: "skipped_running" }
  | { status: "skipped_recent" }
  | { status: "skipped_startup"; retryInMs: number }
  | { status: "sent" }
  | { status: "partial"; reason: "held" | "rate_limited" | "provider_error" };

let digestJobActive = false;

/** When the scheduler should try again. Null means the weekly interval is enough. */
export function digestFollowUpDelayMs(result: DigestJobResult): number | null {
  if (result.status === "skipped_startup") return result.retryInMs;
  if (result.status !== "partial") return null;
  return result.reason === "held" ? DIGEST_HELD_RETRY_MS : DIGEST_PARTIAL_RETRY_MS;
}
// Extra guard: if a digest was sent within the last 2 hours, treat it as a duplicate
// (covers Railway redeploy race conditions where two instances both start up)
const DUPLICATE_GUARD_MS = 2 * 60 * 60 * 1000; // 2 hours

// Curated blog posts for fallback sections, rotated by week so each digest
// surfaces different content. Keep this list in sync with blogPosts.ts.
// `path` overrides the /blog/<slug> link. The two investment posts
// (getting-investment-through-regen-civics, what-makes-land-project-good-investment)
// are being rewritten, so until then the digest sends readers to the
// cooperative page instead, as one entry so a single digest never lists it twice.
const BLOG_HIGHLIGHTS: Array<{ title: string; slug: string; path?: string }> = [
  { title: "What Makes ReGen Civics Different: 7 Unique Features", slug: "what-makes-regen-civics-different" },
  { title: "Introducing Games and Quests: Play Your Way to Regeneration", slug: "introducing-games-and-quests" },
  { title: `The ${COOP.name}: where the design stands`, slug: "cooperative", path: "/fund" },
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
  { label: "The Cooperative Page", url: "/fund", desc: COOP.statementShort },
  { label: "The Games and Quests Page", url: "/play", desc: "Complete real-world quests, earn tokens, and contribute to regenerative projects." },
  { label: "The Apply Page", url: "/apply", desc: "Apply anytime to bring your land project into the next season's incubator." },
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

/** Absolute link for the weekly community digest. Retired hosts become .earth. */
export function digestPublicUrl(pathWithQuery: string): string {
  if (/^https?:\/\//i.test(pathWithQuery)) return rewriteLegacySiteUrls(pathWithQuery);
  const base = getAppBaseUrl().replace(/\/$/, "");
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return `${base}${path}`;
}

/** ISO week number, used to rotate content so each digest is fresh. */
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function runDigestJob(): Promise<DigestJobResult> {
  if (digestJobActive) return { status: "skipped_running" };
  const startupLeft = msUntilStartupEmailGuardEnds();
  if (startupLeft > 0) {
    console.log(`[DigestJob] Skipping: startup email guard has ${Math.ceil(startupLeft / 1000)}s left.`);
    return { status: "skipped_startup", retryInMs: startupLeft + 1000 };
  }
  digestJobActive = true;
  try {
    const latest = await db.getLatestDigest();
    if (latest) {
      const age = Date.now() - new Date(latest.generatedAt).getTime();
      // Hard duplicate guard: skip if sent in the last 2 hours (Railway restart protection)
      if (age < DUPLICATE_GUARD_MS) {
        const minsAgo = Math.round(age / 60000);
        console.log(`[DigestJob] Skipping: last digest was ${minsAgo}m ago (duplicate guard).`);
        return { status: "skipped_recent" };
      }
      // Weekly interval guard
      if (age < DIGEST_INTERVAL_MS) {
        const hoursAgo = Math.round(age / (60 * 60 * 1000));
        console.log(`[DigestJob] Skipping: last digest was ${hoursAgo}h ago (< 7 days).`);
        return { status: "skipped_recent" };
      }
    }

    const threads = await db.getRecentForumPostsForDigest();
    const weekNum = isoWeekNumber(new Date());

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const outcome = await sendDigestEmails(threads.slice(0, 5), weekNum);
    if (outcome.dropped > 0) {
      console.log(`[DigestJob] Partial send: ${outcome.accepted} accepted, ${outcome.dropped} not sent. Week stays due.`);
      return { status: "partial", reason: outcome.reason };
    }

    await db.saveDigest({
      periodStart: weekAgo.toISOString().split("T")[0],
      periodEnd: now.toISOString().split("T")[0],
      contentMd: DIGEST_ARCHIVE_NOTE,
    });

    console.log("[DigestJob] Digest generated and saved.");

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
    return { status: "sent" };
  } catch (e) {
    console.error("[DigestJob] Error:", e);
    try { const Sentry = await import("@sentry/node"); Sentry.captureException(e, { tags: { job: "digest" } }); } catch {}
    return { status: "partial", reason: "provider_error" };
  } finally {
    digestJobActive = false;
  }
}

export function buildCommunityDigestHtml(input: {
  posts: { title: string; content: string; replyCount: number; id?: number }[];
  weekNum: number;
  weekLabel: string;
  assemblySection?: string;
}): string {
  const { posts, weekNum, weekLabel } = input;
  const assemblySection = input.assemblySection ?? "";
    const hasLivePosts = posts.length >= 3;

    // ── Forum section ─────────────────────────────────────────────────────────
    let mainSection = "";
    if (hasLivePosts) {
      const postRows = posts.map((p, i) => {
        const excerpt = p.content.replace(/<[^>]+>/g, '').slice(0, 180).trim();
        const postUrl = digestPublicUrl(
          p.id
            ? `/community/post/${p.id}?utm_source=email&utm_medium=digest&utm_campaign=weekly`
            : `/community?utm_source=email&utm_medium=digest&utm_campaign=weekly`,
        );
        return `
          <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #e8e4de;">
              <a href="${postUrl}" style="font-size: 16px; font-weight: 600; color: #1a472a; text-decoration: none;">${i + 1}. ${p.title}</a>
              <p style="margin: 6px 0 8px; font-size: 14px; color: #4a5568; line-height: 1.5;">${excerpt}${excerpt.length >= 180 ? '...' : ''}</p>
              <span class="rc-muted" style="font-size: 12px; color: #1a1a1a;">${p.replyCount} ${p.replyCount === 1 ? 'reply' : 'replies'}</span>
            </td>
          </tr>`;
      }).join('');

      mainSection = `
        <h2 style="color: #1a472a; font-size: 18px; margin: 0 0 16px;">What the community is talking about</h2>
        <table style="width: 100%; border-collapse: collapse;">${postRows}</table>
        <div style="text-align: center; margin-top: 28px;">
          <a href="${digestPublicUrl("/community?utm_source=email&utm_medium=digest&utm_campaign=weekly")}"
             class="rc-button" style="display: inline-block; background: #1a472a; color: #ffffff; padding: 12px 32px; border-radius: 9999px; font-weight: bold; text-decoration: none; font-size: 15px;">
            Join the conversation
          </a>
        </div>`;
    } else {
      // Not enough live forum activity: fall back to blog suggestions
      const blogPicks = rotatePick(BLOG_HIGHLIGHTS, 3, weekNum);
      const blogRows = blogPicks.map(b => {
        const url = digestPublicUrl(`${b.path ?? `/blog/${b.slug}`}?utm_source=email&utm_medium=digest&utm_campaign=weekly`);
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
          <a href="${digestPublicUrl("/community?utm_source=email&utm_medium=digest&utm_campaign=weekly")}"
             class="rc-button" style="display: inline-block; background: #1a472a; color: #ffffff; padding: 12px 32px; border-radius: 9999px; font-weight: bold; text-decoration: none; font-size: 15px;">
            Start a conversation
          </a>
        </div>`;
    }

    // ── "Have you seen this?" section ─────────────────────────────────────────
    const sitePick = rotatePick(SITE_HIGHLIGHTS, 1, weekNum + 3)[0];
    const sitePickUrl = digestPublicUrl(`${sitePick.url}?utm_source=email&utm_medium=digest&utm_campaign=site-explore`);

    const siteSection = `
      <div style="background: #f0f7f0; border-left: 4px solid #1a472a; padding: 18px 20px; border-radius: 0 8px 8px 0; margin-top: 32px;">
        <p style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #1a1a1a; margin: 0 0 6px; font-weight: bold;">Worth exploring</p>
        <p style="font-size: 15px; font-weight: 600; color: #1a472a; margin: 0 0 6px;">Have you seen <a href="${sitePickUrl}" style="color: #1a472a;">${sitePick.label}</a>?</p>
        <p style="font-size: 13px; color: #4a5568; margin: 0 0 12px; line-height: 1.6;">${sitePick.desc}</p>
        <a href="${sitePickUrl}" style="font-size: 13px; color: #1a472a; font-weight: bold; text-decoration: underline;">Take a look</a>
      </div>`;

    // ── Connect section ───────────────────────────────────────────────────────
    const connectSection = `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e8e4de;">
        <p style="font-size: 13px; color: #1a472a; font-weight: bold; margin: 0 0 10px;">Connect with the community</p>
        <p style="margin: 0; font-size: 13px; line-height: 2; color: #4a5568;">
          <a href="${digestPublicUrl("/community?utm_source=email&utm_medium=digest")}" style="color: #1a472a; text-decoration: none; font-weight: 600;">Community Forum</a> &nbsp;|&nbsp;
          <a href="${HYLO_SEEDS_URL}" style="color: #1a472a; text-decoration: none; font-weight: 600;">Hylo</a> &nbsp;|&nbsp;
          <a href="${HOLOS_REGEN_CIVICS_URL}" style="color: #1a472a; text-decoration: none; font-weight: 600;">Holos</a> &nbsp;|&nbsp;
          <a href="${WHATSAPP_COMMUNITY_URL}" style="color: #1a472a; text-decoration: none;">WhatsApp</a> &nbsp;|&nbsp;
          <a href="${DISCORD_INVITE_URL}" style="color: #1a472a; text-decoration: none;">Discord</a> &nbsp;|&nbsp;
          <a href="${YOUTUBE_CHANNEL_URL}" style="color: #1a472a; text-decoration: none;">YouTube</a>
        </p>
      </div>`;

  const bodyHtml = rewriteLegacySiteUrls(`
      <div style="max-width: 600px; margin: 0 auto; font-family: Georgia, serif; background: #fff;">
        <div class="rc-banner" bgcolor="#1a472a" style="background-color: #1a472a; padding: 32px 40px; text-align: center;">
          <p class="rc-banner-eyebrow" style="color: #ffffff; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px;">Weekly Round-Up · ${weekLabel}</p>
          <h1 class="rc-banner-title" style="color: #ffffff; font-size: 24px; margin: 0; font-family: Georgia, serif;">ReGen Civics Community Update</h1>
        </div>
        <div style="padding: 32px 40px;">
          ${mainSection}
          ${assemblySection}
          ${siteSection}
          ${connectSection}
        </div>
        <div style="padding: 24px 40px; background: #f4f7f4; text-align: center; font-size: 12px; color: #1a1a1a;">
          {{PREFS_FOOTER}}
        </div>
      </div>`);

  return emailDocumentHtml(bodyHtml);
}

async function sendDigestEmails(
  posts: { title: string; content: string; replyCount: number; id?: number }[],
  weekNum: number
): Promise<{ accepted: number; dropped: number; reason: "held" | "rate_limited" | "provider_error" }> {
  try {
    const subscribers = await audienceForTopic("seasonal");
    if (subscribers.length === 0) return { accepted: 0, dropped: 0, reason: "provider_error" };
    const since = new Date(Date.now() - DIGEST_INTERVAL_MS);
    let already = new Set<string>();
    try {
      already = await emailsAcceptedSince(WEEKLY_DIGEST_TEMPLATE, since);
    } catch (err) {
      console.error("[DigestJob] could not read prior sends", err);
    }
    const pending = subscribers.filter((sub) => !already.has(sub.email.trim().toLowerCase()));

    const weekLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
      <div style="background: #f0f7f0; border-left: 4px solid #1a472a; padding: 18px 20px; border-radius: 0 8px 8px 0; margin-top: 32px;">
        <p style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #1a1a1a; margin: 0 0 6px; font-weight: bold;">The Assembly</p>
        <p style="font-size: 14px; color: #1a472a; margin: 0 0 12px; line-height: 1.6;">${parts.join(" · ")}</p>
        <a href="${digestPublicUrl("/assembly?utm_source=email&utm_medium=digest&utm_campaign=weekly")}" style="font-size: 13px; color: #1a472a; font-weight: bold; text-decoration: underline;">Visit the Assembly</a>
      </div>`;
        }
      }
    } catch (err) {
      console.error("[DigestJob] assembly section failed", err);
    }

    const bodyHtml = buildCommunityDigestHtml({
      posts,
      weekNum,
      weekLabel,
      assemblySection,
    });

    let accepted = subscribers.length - pending.length;
    let dropped = 0;
    let reason: "held" | "rate_limited" | "provider_error" = "provider_error";
    let stop = false;
    for (const sub of pending) {
      if (stop) {
        dropped += 1;
        continue;
      }
      try {
        const prefsUrl = await managePreferencesUrl(sub.email, { mute: "seasonal" });
        const html = bodyHtml.replace(
          "{{PREFS_FOOTER}}",
          newsletterLegalFooterHtml(prefsUrl, ENV.harvestPostalAddress),
        );
        const result = await sendEmail({
          to: sub.email,
          subject: `This week in the community: ${weekLabel}`,
          html,
          template: WEEKLY_DIGEST_TEMPLATE,
          skipBrandedWrap: true,
        });
        if (providerAccepted(result)) {
          accepted += 1;
        } else {
          dropped += 1;
          if (result.status === "held" || result.status === "rate_limited") {
            reason = result.status === "held" ? "held" : "rate_limited";
            stop = true;
          }
        }
      } catch (err) {
        dropped += 1;
        console.warn(`[DigestJob] Failed to send to ${sub.email}:`, err);
      }
    }
    console.log(`[DigestJob] Digest accepted ${accepted}, not sent ${dropped}, of ${subscribers.length}.`);
    return { accepted, dropped, reason };
  } catch (err) {
    console.error("[DigestJob] Failed to send digest emails:", err);
    return { accepted: 0, dropped: 1, reason: "provider_error" };
  }
}
