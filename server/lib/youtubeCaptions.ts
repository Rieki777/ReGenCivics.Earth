/**
 * Recording transcripts come from YouTube.
 * The channel owner API is first (captions.list + captions.download).
 * Public timedtext is the fallback when the channel is not connected or
 * the owner call fails. The transcription worker is not used here.
 */
import {
  assembleTranscriptResult,
  parseCaptionFile,
  pickCaptionTrack,
  redactOauthSecrets,
  segmentsToText,
  transcriptIsUsable,
  type LoadedTranscript,
  type OwnerCaptionAttempt,
} from "../../shared/youtubeCaptions";
import { fetchYouTubeTranscriptSegments } from "./videoSummary";
import { getYoutubeOwnerAccessToken } from "./youtubeOwnerAuth";

const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

async function ownerCaptions(videoId: string): Promise<OwnerCaptionAttempt> {
  const access = await getYoutubeOwnerAccessToken();
  if (!access.ok) {
    if (!access.connected) return { status: "skipped" };
    return { status: "error", error: access.error };
  }
  return downloadOwnerCaptions(videoId, access.token, true);
}

async function downloadOwnerCaptions(
  videoId: string,
  accessToken: string,
  allowRefresh: boolean,
): Promise<OwnerCaptionAttempt> {
  const listed = await googleFetch(
    `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${encodeURIComponent(videoId)}`,
    accessToken,
  );
  if (listed.status === 401 && allowRefresh) {
    const refreshed = await getYoutubeOwnerAccessToken(true);
    if (!refreshed.ok) return { status: "error", error: refreshed.error };
    return downloadOwnerCaptions(videoId, refreshed.token, false);
  }
  if (!listed.ok) return { status: "error", error: listed.error };

  let items: Array<{ id?: string; snippet?: { language?: string; trackKind?: string } }> = [];
  try {
    const parsed = JSON.parse(listed.body) as {
      items?: Array<{ id?: string; snippet?: { language?: string; trackKind?: string } }>;
    };
    items = parsed.items ?? [];
  } catch {
    return { status: "error", error: "owner caption list was not readable" };
  }
  const track = pickCaptionTrack(
    items.map((item) => ({
      id: item.id ?? "",
      language: item.snippet?.language ?? "",
      trackKind: item.snippet?.trackKind ?? "",
    })),
  );
  if (!track) return { status: "error", error: "owner caption list had no tracks" };

  const file = await googleFetch(
    `https://www.googleapis.com/youtube/v3/captions/${encodeURIComponent(track.id)}?tfmt=srt`,
    accessToken,
  );
  if (!file.ok) return { status: "error", error: file.error };
  const segments = parseCaptionFile(file.body);
  const text = segmentsToText(segments);
  if (!transcriptIsUsable(text)) return { status: "error", error: "owner captions were too short" };
  return { status: "ok", text, segments };
}

async function googleFetch(
  url: string,
  accessToken: string,
): Promise<{ ok: true; status: number; body: string } | { ok: false; status: number; error: string }> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "*/*" },
      signal: ctrl.signal,
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, error: redactOauthSecrets(`owner captions HTTP ${res.status} ${body}`).slice(0, 300) };
    }
    return { ok: true, status: res.status, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : "owner captions request failed";
    return { ok: false, status: 0, error: redactOauthSecrets(message).slice(0, 300) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadYouTubeTranscript(videoId: string): Promise<LoadedTranscript> {
  if (!VIDEO_ID.test(videoId)) {
    return { ok: false, error: "video id was not a YouTube id" };
  }
  let owner: OwnerCaptionAttempt;
  try {
    owner = await ownerCaptions(videoId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "owner captions failed";
    owner = { status: "error", error: redactOauthSecrets(message).slice(0, 300) };
  }
  if (owner.status === "ok" && transcriptIsUsable(owner.text)) {
    return assembleTranscriptResult(owner, null);
  }
  const segments = await fetchYouTubeTranscriptSegments(videoId);
  const text = segments ? segments.map((segment) => segment.text).join(" ").replace(/\s+/g, " ").trim() : "";
  const timedtext = segments && text ? { text, segments } : null;
  return assembleTranscriptResult(owner, timedtext);
}
