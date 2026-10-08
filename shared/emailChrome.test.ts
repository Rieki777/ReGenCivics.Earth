import { describe, expect, it } from "vitest";
import { buildEditedRecordingEmailHtml } from "./editedCutEmail";
import {
  EMAIL_BANNER_BG,
  EMAIL_BODY_TEXT,
  EMAIL_CARD_BG,
  EMAIL_HEADER_TEXT,
  EMAIL_MUTED_TEXT,
  EMAIL_SUMMARY_BG,
  contrastRatio,
  emailBannerHtml,
  emailColorSchemeHead,
  emailDocumentHtml,
} from "./emailChrome";
import { buildRecordingReadyEmailHtml } from "./recordingReadyEmail";

describe("email contrast", () => {
  it("keeps header and body at WCAG AA in the light palette and the dark-mode lock", () => {
    expect(contrastRatio(EMAIL_HEADER_TEXT, EMAIL_BANNER_BG)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(EMAIL_BODY_TEXT, EMAIL_CARD_BG)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(EMAIL_BODY_TEXT, EMAIL_SUMMARY_BG)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(EMAIL_MUTED_TEXT, EMAIL_CARD_BG)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(EMAIL_MUTED_TEXT, EMAIL_SUMMARY_BG)).toBeGreaterThanOrEqual(4.5);
    const head = emailColorSchemeHead();
    expect(head).toContain('<meta name="color-scheme" content="light dark">');
    expect(head).toContain('<meta name="supported-color-schemes" content="light dark">');
    expect(head).toContain(`color: ${EMAIL_HEADER_TEXT} !important`);
    expect(head).toContain(`background-color: ${EMAIL_BANNER_BG} !important`);
    expect(head).toContain(`color: ${EMAIL_BODY_TEXT} !important`);
    expect(emailBannerHtml("Recording ready")).toContain(`color:${EMAIL_HEADER_TEXT}`);
    expect(emailBannerHtml("Recording ready")).not.toContain("#7dd87d");
    expect(emailBannerHtml("Recording ready")).not.toContain("linear-gradient");
  });

  it("renders recording-ready and edited-cut as one light document", () => {
    const ready = buildRecordingReadyEmailHtml({
      title: "Intro: ReGen Civics QUESTS & GAMES",
      sessionDate: "Saturday, March 29, 2025",
      youtubeUrl: "https://www.youtube.com/watch?v=abc123xyz01",
      aiSummary: "This session introduced the ReGen Civics Quest Series, emphasizing the importance of community health and engagement in regeneration.",
      prefsUrl: "https://regencivics.earth/email-preferences?token=abc",
    });
    const edited = buildEditedRecordingEmailHtml({
      week: 2,
      title: "Incubator Overview",
      videoId: "JS8YoJE1PUI",
      chapters: [{ tSeconds: 0, title: "Welcome" }],
      prefsUrl: "https://regencivics.earth/email-preferences?token=abc",
    });
    for (const html of [ready, edited]) {
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("color-scheme");
      expect(html).toContain("supported-color-schemes");
      expect(html).toContain(`color:${EMAIL_HEADER_TEXT}`);
      expect(html).not.toContain("#7dd87d");
      expect(html).not.toContain("#a8e6a8");
    }
    expect(emailDocumentHtml("<p class=\"rc-text\">Hello</p>")).toContain("rc-text");
  });
});
