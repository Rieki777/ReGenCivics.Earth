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
  emailPrimaryButton,
} from "./emailChrome";

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
  forumUrl?: string | null;
  courseUrl?: string | null;
  courseLabel?: string | null;
  prefsUrl: string;
  chaptersHtml?: string;
  postalAddress?: string;
}): string {
  const watchHref = opts.youtubeUrl || opts.riversideUrl || "";
  const watchBtn = watchHref
    ? `<a href="${esc(watchHref)}" style="display:inline-block;background-color:#FF0000;color:${EMAIL_HEADER_TEXT};padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:0 8px 8px 0;">Watch Recording</a>`
    : "";
  const forumBtn = opts.forumUrl ? emailPrimaryButton(opts.forumUrl, "Join the Discussion") : "";
  const courseBtn = opts.courseUrl ? emailPrimaryButton(opts.courseUrl, opts.courseLabel || "Week board") : "";
  const summaryBlock = opts.aiSummary
    ? `<div class="rc-summary" style="background-color:${EMAIL_SUMMARY_BG};border-left:4px solid ${EMAIL_BANNER_BG};padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;">
        <p class="rc-heading" style="color:${EMAIL_BODY_TEXT};font-weight:bold;margin:0 0 8px 0;">What we covered</p>
        <p class="rc-text" style="color:${EMAIL_BODY_TEXT};margin:0;line-height:1.7;">${esc(opts.aiSummary)}</p>
       </div>`
    : "";

  const body = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      ${emailBannerHtml("Recording ready")}
      <div class="rc-card" style="padding:30px 24px;background-color:${EMAIL_CARD_BG};border:1px solid #e0e0e0;border-top:none;">
        <h2 class="rc-heading" style="color:${EMAIL_BODY_TEXT};margin:0 0 6px 0;font-size:20px;">${esc(opts.title)}</h2>
        <p class="rc-muted" style="color:${EMAIL_MUTED_TEXT};font-size:13px;margin:0 0 20px 0;">${esc(opts.sessionDate)}</p>
        ${summaryBlock}
        <p class="rc-text" style="color:${EMAIL_BODY_TEXT};line-height:1.7;margin:20px 0;">
          The recording from our latest community session is ready. Watch it back, share it, or drop a reply in the forum.
        </p>
        <div style="margin:24px 0;">
          ${watchBtn}
          ${forumBtn}
          ${courseBtn}
        </div>
        ${opts.chaptersHtml ?? ""}
      </div>
      <div class="rc-card" style="background-color:${EMAIL_SUMMARY_BG};padding:20px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;">
        ${newsletterLegalFooterHtml(opts.prefsUrl, opts.postalAddress ?? NEWSLETTER_POSTAL_ADDRESS)}
      </div>
    </div>`;
  return emailDocumentHtml(body, `Recording ready: ${opts.title}`);
}
