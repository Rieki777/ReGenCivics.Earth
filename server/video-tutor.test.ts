/**
 * Video Tutor tests: the deterministic parts (id validation, transcript
 * windowing, daily caps, voice scrub). The LLM call itself is exercised only
 * through its guards; no network in these tests.
 */
import { describe, it, expect } from "vitest";
import { buildTranscriptContext, _videoTutorInternals } from "./lib/video-tutor";
import type { TranscriptSegment } from "./lib/videoSummary";

const {
  isValidYouTubeId,
  checkTutorRateLimit,
  recordTutorUsage,
  scrubVoice,
  parseJson3Captions,
  parseTimedtextXmlCaptions,
} = _videoTutorInternals;

describe("isValidYouTubeId", () => {
  it("accepts a real 11-char id and rejects junk", () => {
    expect(isValidYouTubeId("dQw4w9WgXcQ")).toBe(true);
    expect(isValidYouTubeId("short")).toBe(false);
    expect(isValidYouTubeId("../../etc/passwd")).toBe(false);
    expect(isValidYouTubeId("dQw4w9WgXcQ&extra=1")).toBe(false);
  });
});

describe("buildTranscriptContext", () => {
  const segments: TranscriptSegment[] = Array.from({ length: 200 }, (_, i) => ({
    start: i * 10, // one line every 10s, ~33 minutes
    text: `line at ${i * 10}s`,
  }));

  it("returns only segments within the window radius of the current time", () => {
    const { window } = buildTranscriptContext(segments, 500, 90);
    expect(window).toContain("line at 500s");
    expect(window).toContain("line at 410s");
    expect(window).toContain("line at 590s");
    expect(window).not.toContain("line at 300s");
    expect(window).not.toContain("line at 700s");
  });

  it("formats timestamps as m:ss", () => {
    const { window } = buildTranscriptContext(segments, 65, 10);
    expect(window).toContain("[1:00]");
  });

  it("clamps a negative current time to the video start", () => {
    const { window } = buildTranscriptContext(segments, -50, 90);
    expect(window).toContain("line at 0s");
  });

  it("gist samples across the whole video and stays bounded", () => {
    const { gist } = buildTranscriptContext(segments, 0, 90);
    expect(gist).toContain("line at 0s");
    expect(gist.length).toBeLessThanOrEqual(6_000);
  });
});

describe("tutor daily caps", () => {
  it("caps a single bucket at its daily limit while others continue", () => {
    const bucket = `test:${Date.now()}`;
    for (let i = 0; i < 30; i++) {
      expect(checkTutorRateLimit(bucket).ok).toBe(true);
      recordTutorUsage(bucket);
    }
    expect(checkTutorRateLimit(bucket).ok).toBe(false);
    expect(checkTutorRateLimit(`other:${Date.now()}`).ok).toBe(true);
  });
});

describe("caption parsers", () => {
  it("parses srv3/timedtext XML (what the ANDROID baseUrl actually serves)", () => {
    const xml =
      '<?xml version="1.0" encoding="utf-8" ?><timedtext format="3">\n<body>\n' +
      '<p t="4220" d="1180">This is a 3.</p>\n' +
      '<p t="6060" d="900">It&#39;s sloppy &amp; low res</p>\n' +
      '<p t="9000" d="500"><s>nested</s> <s>spans</s></p>\n' +
      "</body></timedtext>";
    const segs = parseTimedtextXmlCaptions(xml);
    expect(segs).toEqual([
      { start: 4, text: "This is a 3." },
      { start: 6, text: "It's sloppy & low res" },
      { start: 9, text: "nested spans" },
    ]);
  });

  it("parses json3 events", () => {
    const body = JSON.stringify({
      events: [
        { tStartMs: 4220, segs: [{ utf8: "This is " }, { utf8: "a 3." }] },
        { tStartMs: 6060 }, // no segs: skipped
      ],
    });
    expect(parseJson3Captions(body)).toEqual([{ start: 4, text: "This is a 3." }]);
  });

  it("returns empty on garbage instead of throwing", () => {
    expect(parseJson3Captions("not json")).toEqual([]);
    expect(parseTimedtextXmlCaptions("no p tags here")).toEqual([]);
  });
});

describe("scrubVoice", () => {
  it("converts the dash family to commas and tidies spacing", () => {
    expect(scrubVoice("healing ourselves — and our Earth")).toBe(
      "healing ourselves, and our Earth"
    );
    expect(scrubVoice("a – b – c")).toBe("a, b, c");
  });
});
