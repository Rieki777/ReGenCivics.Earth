/**
 * Edited-recording letter, and the later session-notes letter.
 * Inline HTML. Callers pass a fresh chapter list from the description at send time.
 */
import {
  EMAIL_BANNER_BG,
  EMAIL_BODY_TEXT,
  EMAIL_CARD_BG,
  EMAIL_HEADER_TEXT,
  EMAIL_SUMMARY_BG,
  emailBannerHtml,
  emailDocumentHtml,
} from "./emailChrome";
import { newsletterLegalFooterHtml } from "./letterHtml";
import { NEWSLETTER_POSTAL_ADDRESS } from "./letterLayout";
import { gistBullets, recapSectionsHtml, type RecapItem } from "./recapDigest";
import { SITE_ORIGIN } from "./siteContext";
import {
  chapterStamp,
  chapterWatchUrl,
  type YoutubeChapter,
} from "./youtubeChapters";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function editedRecordingSubject(week: number | null, title: string): string {
  const name = title.trim() || "Community session";
  return week ? `Week ${week} recording: ${name} (edited)` : `Recording: ${name} (edited)`;
}

export function sessionNotesSubject(title: string): string {
  return `Session notes: ${title.trim() || "Community session"}`;
}

export function chaptersEmailSection(chapters: YoutubeChapter[], videoId: string): string {
  if (!chapters.length || !videoId) return "";
  const items = chapters.map((chapter) => {
    const stamp = esc(chapterStamp(chapter));
    const title = esc(chapter.title);
    const href = esc(chapterWatchUrl(videoId, chapter.tSeconds));
    return `<li style="margin:0 0 10px 0;line-height:1.45;"><a href="${href}" style="color:${EMAIL_BODY_TEXT};text-decoration:none;"><span style="display:inline-block;min-width:4.6em;font-variant-numeric:tabular-nums;color:${EMAIL_BANNER_BG};font-weight:700;">${stamp}</span>${title}</a></li>`;
  }).join("");
  return `<p class="rc-heading" style="color:${EMAIL_BODY_TEXT};font-weight:700;font-size:16px;margin:28px 0 10px;">Jump to a moment</p><ul style="list-style:none;padding:0;margin:0;">${items}</ul>`;
}

function blockButton(href: string, label: string): string {
  return `<a class="rc-button" href="${esc(href)}" style="display:block;background-color:${EMAIL_BANNER_BG};color:${EMAIL_HEADER_TEXT};text-align:center;padding:18px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:18px;line-height:1.3;">${esc(label)}</a>`;
}

function voteLink(origin: string): string {
  return `<p style="margin:18px 0 0;"><a href="${esc(`${origin}/season-schedule`)}" style="color:${EMAIL_BODY_TEXT};font-weight:700;">Vote on call times</a></p>`;
}

function shell(opts: {
  eyebrow: string;
  heading: string;
  videoId: string;
  week: number | null;
  chapters: YoutubeChapter[];
  prefsUrl: string;
  digest?: string;
  postalAddress?: string;
  origin?: string;
}): string {
  const origin = opts.origin ?? SITE_ORIGIN;
  const chapters = chaptersEmailSection(opts.chapters, opts.videoId);
  const opener = opts.week
    ? blockButton(`${origin}/season2/week/${opts.week}`, `Open the Week ${opts.week} board`)
    : blockButton(`https://youtu.be/${opts.videoId}`, "Watch the recording");
  const body = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      ${emailBannerHtml(opts.eyebrow)}
      <div class="rc-card" style="padding:28px 24px;background-color:${EMAIL_CARD_BG};border:1px solid #e0e0e0;border-top:none;">
        <h2 class="rc-heading" style="color:${EMAIL_BODY_TEXT};margin:0 0 18px 0;font-size:22px;line-height:1.3;">${esc(opts.heading)}</h2>
        ${opts.digest ?? ""}
        ${opener}
        ${chapters}
        ${voteLink(origin)}
      </div>
      <div class="rc-card" style="background-color:${EMAIL_SUMMARY_BG};padding:20px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;">
        ${newsletterLegalFooterHtml(opts.prefsUrl, opts.postalAddress ?? NEWSLETTER_POSTAL_ADDRESS)}
      </div>
    </div>
  `;
  return emailDocumentHtml(body, opts.heading);
}

function digestHtml(opts: {
  summary?: string | null;
  gist?: string[];
  insights?: RecapItem[];
  steps?: RecapItem[];
}): string {
  const gist = (opts.gist?.length ? opts.gist : gistBullets(opts.summary)).slice(0, 3);
  const steps = (opts.steps ?? []).slice(0, 3);
  return recapSectionsHtml({ gist, steps });
}

export function buildEditedRecordingEmailHtml(opts: {
  week: number | null;
  title: string;
  videoId: string;
  chapters: YoutubeChapter[];
  prefsUrl: string;
  summary?: string | null;
  gist?: string[];
  insights?: RecapItem[];
  steps?: RecapItem[];
  postalAddress?: string;
  origin?: string;
}): string {
  return shell({
    eyebrow: "Edited recording",
    heading: opts.title,
    videoId: opts.videoId,
    week: opts.week,
    chapters: opts.chapters,
    prefsUrl: opts.prefsUrl,
    digest: digestHtml(opts),
    postalAddress: opts.postalAddress,
    origin: opts.origin,
  });
}

export function buildSessionNotesEmailHtml(opts: {
  week: number | null;
  title: string;
  videoId: string;
  summary: string;
  chapters: YoutubeChapter[];
  prefsUrl: string;
  gist?: string[];
  insights?: RecapItem[];
  steps?: RecapItem[];
  postalAddress?: string;
  origin?: string;
}): string {
  return shell({
    eyebrow: "Session notes",
    heading: opts.title,
    videoId: opts.videoId,
    week: opts.week,
    chapters: opts.chapters,
    prefsUrl: opts.prefsUrl,
    digest: digestHtml(opts),
    postalAddress: opts.postalAddress,
    origin: opts.origin,
  });
}
