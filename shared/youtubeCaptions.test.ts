import { describe, expect, it } from "vitest";
import {
  assembleTranscriptResult,
  captionDownloadFormats,
  parseCaptionFile,
  pickCaptionTrack,
  redactOauthSecrets,
  summarizeCaptionList,
  TRANSCRIPT_SOURCE_OWNER,
  TRANSCRIPT_SOURCE_TIMEDTEXT,
} from "./youtubeCaptions";

const SRT = `1
00:00:01,000 --> 00:00:04,000
Welcome to week two

2
00:01:04,000 --> 00:01:08,500
The incubator overview starts here
`;

describe("pickCaptionTrack", () => {
  it("prefers an English manual track over English auto-captions", () => {
    const picked = pickCaptionTrack([
      { id: "asr", language: "en", trackKind: "asr" },
      { id: "manual", language: "en-US", trackKind: "standard" },
      { id: "es", language: "es", trackKind: "standard" },
    ]);
    expect(picked?.id).toBe("manual");
  });

  it("uses English auto-captions when that is the only English track", () => {
    const picked = pickCaptionTrack([
      { id: "es", language: "es", trackKind: "standard" },
      { id: "asr", language: "en", trackKind: "ASR" },
    ]);
    expect(picked?.id).toBe("asr");
  });
});

describe("summarizeCaptionList", () => {
  it("names the count and the track kinds, and keeps asr", () => {
    expect(summarizeCaptionList([
      { id: "a", trackKind: "ASR" },
      { id: "b", trackKind: "standard" },
    ])).toBe("owner caption list had 2 tracks (kinds: asr, standard)");
  });

  it("says when rows came back without ids", () => {
    expect(summarizeCaptionList([{ id: "", trackKind: "asr" }])).toBe(
      "owner caption list had 1 track (kinds: asr) but no track ids",
    );
  });

  it("does not reuse the old empty-list sentence", () => {
    expect(summarizeCaptionList([])).toBe("owner caption list had 0 tracks (kinds: none)");
    expect(summarizeCaptionList([])).not.toContain("had no tracks");
  });
});

describe("captionDownloadFormats", () => {
  it("tries srt and then vtt for an asr track", () => {
    expect(captionDownloadFormats("asr")).toEqual(["srt", "vtt"]);
  });
});

describe("parseCaptionFile", () => {
  it("reads SRT cues into start seconds and text", () => {
    const segments = parseCaptionFile(SRT);
    expect(segments[0]).toEqual({ start: 1, text: "Welcome to week two" });
    expect(segments[1]?.start).toBe(64);
  });

  it("reads WebVTT and json3", () => {
    const vtt = parseCaptionFile("WEBVTT\n\n00:00:02.000 --> 00:00:04.000\nHello from the livestream\n");
    expect(vtt[0]).toEqual({ start: 2, text: "Hello from the livestream" });
    const json3 = parseCaptionFile(JSON.stringify({
      events: [{ tStartMs: 1500, segs: [{ utf8: "auto " }, { utf8: "caption" }] }],
    }));
    expect(json3).toEqual([{ start: 1, text: "auto caption" }]);
  });

  it("reads timedtext XML", () => {
    const segments = parseCaptionFile(
      `<transcript><text start="12.4">Hello &amp; welcome</text></transcript>`,
    );
    expect(segments).toEqual([{ start: 12, text: "Hello & welcome" }]);
  });
});

describe("redactOauthSecrets", () => {
  it("removes access tokens, refresh tokens, and form secrets", () => {
    const raw = 'status=400 refresh_token=1//abcDEF access_token=ya29.super-secret "client_secret":"shh"';
    const clean = redactOauthSecrets(raw);
    expect(clean).not.toContain("1//abcDEF");
    expect(clean).not.toContain("ya29.super-secret");
    expect(clean).not.toContain("shh");
    expect(clean).toContain("[redacted]");
  });
});

describe("assembleTranscriptResult", () => {
  const long = "a".repeat(80);

  it("keeps owner captions when they are usable", () => {
    const loaded = assembleTranscriptResult(
      { status: "ok", text: long, segments: [{ start: 0, text: long }] },
      { text: "public", segments: [] },
    );
    expect(loaded).toMatchObject({ ok: true, source: TRANSCRIPT_SOURCE_OWNER });
  });

  it("falls back to public captions and names the owner error only when both fail", () => {
    const fallback = assembleTranscriptResult(
      { status: "error", error: "owner captions HTTP 403" },
      { text: long, segments: [{ start: 0, text: long }] },
    );
    expect(fallback).toMatchObject({ ok: true, source: TRANSCRIPT_SOURCE_TIMEDTEXT });

    const failed = assembleTranscriptResult(
      { status: "error", error: "owner captions HTTP 403 refresh_token=1//secret" },
      null,
    );
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.error).toContain("owner captions HTTP 403");
      expect(failed.error).toContain("public captions were not available");
      expect(failed.error).not.toContain("1//secret");
    }
  });

  it("says the channel is not connected when there is no owner token", () => {
    const failed = assembleTranscriptResult({ status: "skipped" }, null);
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error).toContain("YouTube channel is not connected");
  });
});
