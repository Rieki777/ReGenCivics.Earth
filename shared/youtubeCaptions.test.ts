import { describe, expect, it } from "vitest";
import {
  assembleTranscriptResult,
  parseCaptionFile,
  pickCaptionTrack,
  redactOauthSecrets,
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

describe("parseCaptionFile", () => {
  it("reads SRT cues into start seconds and text", () => {
    const segments = parseCaptionFile(SRT);
    expect(segments[0]).toEqual({ start: 1, text: "Welcome to week two" });
    expect(segments[1]?.start).toBe(64);
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
