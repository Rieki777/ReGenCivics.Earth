/**
 * Pure helpers for YouTube caption tracks. Network calls live in
 * server/lib/youtubeCaptions.ts.
 */

export const TRANSCRIPT_SOURCE_OWNER = "youtube_owner";
export const TRANSCRIPT_SOURCE_TIMEDTEXT = "youtube_timedtext";

export type TranscriptSource = typeof TRANSCRIPT_SOURCE_OWNER | typeof TRANSCRIPT_SOURCE_TIMEDTEXT;

export type CaptionTrackChoice = {
  id: string;
  language: string;
  trackKind: string;
};

export type CaptionSegment = { start: number; text: string };

const MIN_TRANSCRIPT_CHARS = 40;

/** English manual track, then English auto-captions, then any other track. */
export function pickCaptionTrack(tracks: CaptionTrackChoice[]): CaptionTrackChoice | null {
  const usable = tracks.filter((track) => track.id.trim().length > 0);
  if (usable.length === 0) return null;
  const rank = (track: CaptionTrackChoice) => {
    const english = track.language.toLowerCase().startsWith("en") ? 0 : 2;
    const manual = track.trackKind.toLowerCase() === "asr" ? 1 : 0;
    return english + manual;
  };
  return [...usable].sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

export function segmentsToText(segments: CaptionSegment[]): string {
  return segments.map((segment) => segment.text).join(" ").replace(/\s+/g, " ").trim();
}

export function transcriptIsUsable(text: string): boolean {
  return text.trim().length >= MIN_TRANSCRIPT_CHARS;
}

/** Strip tokens and codes before anything is logged or saved as lastError. */
export function redactOauthSecrets(value: string): string {
  return value
    .replace(/ya29\.[A-Za-z0-9_\-]+/g, "[redacted]")
    .replace(/\b1\/\/[A-Za-z0-9_\-]+/g, "[redacted]")
    .replace(/(refresh_token|access_token|id_token|client_secret|code)=([^&\s]+)/gi, "$1=[redacted]")
    .replace(/"(refresh_token|access_token|id_token|client_secret)"\s*:\s*"[^"]*"/gi, '"$1":"[redacted]"')
    .slice(0, 500);
}

function decodeCaptionText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stampToSeconds(stamp: string): number {
  const parts = stamp.trim().split(":");
  if (parts.length < 2) return 0;
  const secondsPart = parts[parts.length - 1].replace(",", ".");
  const seconds = Number.parseFloat(secondsPart);
  const minutes = Number.parseInt(parts[parts.length - 2] ?? "0", 10);
  const hours = parts.length > 2 ? Number.parseInt(parts[0] ?? "0", 10) : 0;
  if (!Number.isFinite(seconds) || !Number.isFinite(minutes) || !Number.isFinite(hours)) return 0;
  return Math.max(0, Math.floor(hours * 3600 + minutes * 60 + seconds));
}

function parseSrt(raw: string): CaptionSegment[] {
  const blocks = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split(/\n{2,}/);
  const segments: CaptionSegment[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timeLine = lines.find((line) => line.includes("-->"));
    if (!timeLine) continue;
    const startStamp = timeLine.split("-->")[0]?.trim() ?? "";
    const textLines = lines.slice(lines.indexOf(timeLine) + 1);
    const text = decodeCaptionText(textLines.join(" "));
    if (!text) continue;
    segments.push({ start: stampToSeconds(startStamp), text });
  }
  return segments;
}

function parseTimedTextXml(raw: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  const re = /<text[^>]*\bstart="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    const text = decodeCaptionText(match[2] ?? "");
    if (!text) continue;
    segments.push({ start: Math.max(0, Math.floor(Number.parseFloat(match[1] ?? "0") || 0)), text });
  }
  return segments;
}

/** SRT, WebVTT, or YouTube timedtext XML. */
export function parseCaptionFile(raw: string): CaptionSegment[] {
  const body = raw.replace(/^\uFEFF/, "").trim();
  if (!body) return [];
  if (body.startsWith("<")) return parseTimedTextXml(body);
  const withoutHeader = body.replace(/^WEBVTT[^\n]*\n+/i, "").replace(/^NOTE[^\n]*\n+/gim, "");
  return parseSrt(withoutHeader);
}

export type OwnerCaptionAttempt =
  | { status: "skipped" }
  | { status: "ok"; text: string; segments: CaptionSegment[] }
  | { status: "error"; error: string };

export type LoadedTranscript =
  | { ok: true; source: TranscriptSource; text: string; segments: CaptionSegment[] }
  | { ok: false; error: string };

/**
 * Owner captions win. Public timedtext is the fallback. A failure string
 * names both attempts when neither returned usable text.
 */
export function assembleTranscriptResult(
  owner: OwnerCaptionAttempt,
  timedtext: { text: string; segments: CaptionSegment[] } | null,
): LoadedTranscript {
  if (owner.status === "ok" && transcriptIsUsable(owner.text)) {
    return {
      ok: true,
      source: TRANSCRIPT_SOURCE_OWNER,
      text: owner.text,
      segments: owner.segments,
    };
  }
  if (timedtext && transcriptIsUsable(timedtext.text)) {
    return {
      ok: true,
      source: TRANSCRIPT_SOURCE_TIMEDTEXT,
      text: timedtext.text,
      segments: timedtext.segments,
    };
  }
  const parts: string[] = [];
  if (owner.status === "skipped") parts.push("YouTube channel is not connected");
  else if (owner.status === "error") parts.push(owner.error);
  else parts.push("owner captions were too short");
  parts.push(timedtext ? "public captions were too short" : "public captions were not available");
  return { ok: false, error: redactOauthSecrets(parts.join("; ")).slice(0, 500) };
}
