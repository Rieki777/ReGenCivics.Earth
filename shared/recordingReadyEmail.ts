/**
 * Recording-ready letter. A full document so sendEmail can skip the
 * second branded wrap. One banner, white wordmark, dark body text.
 */
import { newsletterLegalFooterHtml } from "./letterHtml";
import { NEWSLETTER_POSTAL_ADDRESS } from "./letterLayout";
import {
  EMAIL_BANNER_BG,
  EMAIL_BODY_TEXT,
  EMAIL_CARD_BG,
  EMAIL_HEADER_TEXT,
  EMAIL_MUTED_TEXT,
  EMAIL_SUMMARY_BG,
  emailBannerHtml,
  emailDocumentHtml,
} from "./emailChrome";
import { gistBullets, recapSectionsHtml, type RecapItem } from "./recapDigest";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildRecordingReadyEmailHtml(opts: {
  title: string;
  sessionDate: string;
  youtubeUrl?: string | null;
  riversideUrl?: string | null;
  aiSummary?: string | null;
  gist?: string[];
  insights?: RecapItem[];
  steps?: RecapItem[];
  forumUrl?: string | null;
  courseUrl?: string | null;
  courseLabel?: string | null;
  prefsUrl: string;
  chaptersHtml?: string;
  postalAddress?: string;
}): string {
  const watchHref = opts.youtubeUrl || opts.riversideUrl || "";
  const boardLabel = opts.courseLabel
    ? (opts.courseLabel.startsWith("Open ") ? opts.courseLabel : `Open the ${opts.courseLabel}`)
    : "Open the week board";
  const opener = opts.courseUrl
    ? `<a class="rc-button" href="${esc(opts.courseUrl)}" style="display:block;background-color:${EMAIL_BANNER_BG};color:${EMAIL_HEADER_TEXT};text-align:center;padding:18px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:18px;line-height:1.3;">${esc(boardLabel)}</a>`
    : watchHref
      ? `<a class="rc-button" href="${esc(watchHref)}" style="display:block;background-color:${EMAIL_BANNER_BG};color:${EMAIL_HEADER_TEXT};text-align:center;padding:18px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:18px;line-height:1.3;">Watch the recording</a>`
      : "";
  const digest = recapSectionsHtml({
    gist: (opts.gist?.length ? opts.gist : gistBullets(opts.aiSummary)).slice(0, 3),
    steps: (opts.steps ?? []).slice(0, 3),
  });
  const forumLine = opts.forumUrl
    ? `<p style="margin:18px 0 0;"><a href="${esc(opts.forumUrl)}" style="color:${EMAIL_BODY_TEXT};font-weight:700;">Join the discussion</a></p>`
    : "";

  const body = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      ${emailBannerHtml("Recording ready")}
      <div class="rc-card" style="padding:30px 24px;background-color:${EMAIL_CARD_BG};border:1px solid #e0e0e0;border-top:none;">
        <h2 class="rc-heading" style="color:${EMAIL_BODY_TEXT};margin:0 0 6px 0;font-size:20px;">${esc(opts.title)}</h2>
        <p class="rc-muted" style="color:${EMAIL_MUTED_TEXT};font-size:13px;margin:0 0 20px 0;">${esc(opts.sessionDate)}</p>
        ${digest}
        ${opener}
        ${opts.chaptersHtml ?? ""}
        ${forumLine}
      </div>
      <div class="rc-card" style="background-color:${EMAIL_SUMMARY_BG};padding:20px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;">
        ${newsletterLegalFooterHtml(opts.prefsUrl, opts.postalAddress ?? NEWSLETTER_POSTAL_ADDRESS)}
      </div>
    </div>`;
  return emailDocumentHtml(body, `Recording ready: ${opts.title}`);
}
