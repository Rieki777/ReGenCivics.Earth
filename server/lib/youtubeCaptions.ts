/**
 * Recording transcripts come from YouTube.
 * The channel owner API is first (captions.list + captions.download).
 * captions.list often omits ASR tracks that the watch page still shows,
 * so the player caption list is next. Public timedtext is last.
 * The transcription worker is not used here.
 */
import {
  assembleTranscriptResult,
  captionDownloadFormats,
  parseCaptionFile,
  pickCaptionTrack,
  redactOauthSecrets,
  segmentsToText,
  summarizeCaptionList,
  transcriptIsUsable,
  type CaptionSegment,
  type LoadedTranscript,
  type OwnerCaptionAttempt,
} from "../../shared/youtubeCaptions";
import { logger } from "../_core/logger";
import { fetchYouTubeTranscriptSegments } from "./videoSummary";
import { getYoutubeOwnerAccessToken, youtubeConnectionStatus } from "./youtubeOwnerAuth";
import {
  isYoutubeQuotaExceeded,
  isYoutubeQuotaStop,
  noteYoutubeQuotaExceeded,
  takeCaptionDownloadSlot,
  YOUTUBE_QUOTA_STOP_ERROR,
  youtubeDataApiBlocked,
} from "./youtubeQuota";

const captionLog = logger("youtube-captions");

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
  // id is required to download. snippet carries trackKind. asr is not filtered out.
  const listed = await googleFetch(
    `https://www.googleapis.com/youtube/v3/captions?part=id,snippet&videoId=${encodeURIComponent(videoId)}`,
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
  const choices = items.map((item) => ({
    id: item.id ?? "",
    language: item.snippet?.language ?? "",
    trackKind: item.snippet?.trackKind ?? "",
  }));
  const summary = summarizeCaptionList(choices);
  const track = pickCaptionTrack(choices);
  if (!track) {
    const context = await ownerListContext(accessToken, videoId);
    const error = `${summary}; ${context}`;
    captionLog.info("owner caption list empty", { videoId, summary, context });
    return { status: "error", error };
  }
  captionLog.info("owner caption list", { videoId, summary, picked: track.trackKind || "unknown" });

  const failures: string[] = [];
  for (const format of captionDownloadFormats(track.trackKind)) {
    const file = await googleFetch(
      `https://www.googleapis.com/youtube/v3/captions/${encodeURIComponent(track.id)}?tfmt=${format}`,
      accessToken,
    );
    if (!file.ok) {
      failures.push(`${format} HTTP ${file.status}`);
      continue;
    }
    const segments = parseCaptionFile(file.body);
    const text = segmentsToText(segments);
    if (!transcriptIsUsable(text)) {
      failures.push(`${format} too short`);
      continue;
    }
    return { status: "ok", text, segments };
  }
  const context = await ownerListContext(accessToken, videoId);
  return { status: "error", error: `${summary}; ${failures.join("; ")}; ${context}` };
}

/** Channel match and force-ssl, with no token in the string. */
async function ownerListContext(accessToken: string, videoId: string): Promise<string> {
  const [channelNote, scopeNote] = await Promise.all([
    videoChannelNote(accessToken, videoId),
    forceSslNote(accessToken),
  ]);
  return `${channelNote}; ${scopeNote}`;
}

async function videoChannelNote(accessToken: string, videoId: string): Promise<string> {
  const listed = await googleFetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}`,
    accessToken,
  );
  let videoChannel = "";
  if (listed.ok) {
    try {
      const parsed = JSON.parse(listed.body) as { items?: Array<{ snippet?: { channelId?: string } }> };
      videoChannel = parsed.items?.[0]?.snippet?.channelId ?? "";
    } catch {
      videoChannel = "";
    }
  }
  let connected = "";
  try {
    connected = (await youtubeConnectionStatus()).channelId ?? "";
  } catch {
    connected = "";
  }
  if (!videoChannel) return "video channel unknown";
  if (!connected) return `video channel ${videoChannel}; connected channel unknown`;
  if (videoChannel === connected) return `channels match ${videoChannel}`;
  return `channels differ: video ${videoChannel}, connected ${connected}`;
}

async function forceSslNote(accessToken: string): Promise<string> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8_000);
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
      { signal: ctrl.signal },
    );
    const body = await res.text();
    if (!res.ok) return "scope: unknown";
    const parsed = JSON.parse(body) as { scope?: string };
    const has = (parsed.scope ?? "").split(/\s+/).includes("https://www.googleapis.com/auth/youtube.force-ssl");
    return has ? "scope: force-ssl" : "scope: missing force-ssl";
  } catch {
    return "scope: unknown";
  } finally {
    clearTimeout(timeout);
  }
}

async function googleFetch(
  url: string,
  accessToken: string,
): Promise<{ ok: true; status: number; body: string } | { ok: false; status: number; error: string }> {
  if (youtubeDataApiBlocked()) {
    return { ok: false, status: 403, error: YOUTUBE_QUOTA_STOP_ERROR };
  }
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "*/*" },
      signal: ctrl.signal,
    });
    const body = await res.text();
    if (!res.ok) {
      if (isYoutubeQuotaExceeded(res.status, body)) {
        noteYoutubeQuotaExceeded();
        return { ok: false, status: 403, error: YOUTUBE_QUOTA_STOP_ERROR };
      }
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

/**
 * The watch-page player lists ASR tracks that captions.list often omits.
 * ANDROID is the client this repo already uses for the video tutor.
 */
async function fetchPlayerCaptions(videoId: string): Promise<CaptionSegment[] | null> {
  const clients = [
    {
      clientName: "ANDROID",
      clientVersion: "20.10.38",
      androidSdkVersion: 30,
      hl: "en",
      userAgent: "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip",
    },
    {
      clientName: "WEB",
      clientVersion: "2.20261007.01.00",
      hl: "en",
      gl: "US",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  ];
  for (const client of clients) {
    const segments = await playerCaptionsForClient(videoId, client);
    if (segments && transcriptIsUsable(segmentsToText(segments))) return segments;
  }
  return null;
}

async function playerCaptionsForClient(
  videoId: string,
  client: { clientName: string; clientVersion: string; userAgent: string; hl: string; gl?: string; androidSdkVersion?: number },
): Promise<CaptionSegment[] | null> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": client.userAgent },
      body: JSON.stringify({
        context: {
          client: {
            clientName: client.clientName,
            clientVersion: client.clientVersion,
            hl: client.hl,
            ...(client.gl ? { gl: client.gl } : {}),
            ...(client.androidSdkVersion ? { androidSdkVersion: client.androidSdkVersion } : {}),
          },
        },
        videoId,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const player = await res.json() as {
      captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: Array<{ baseUrl?: string; languageCode?: string; kind?: string }> } };
    };
    const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    if (tracks.length === 0) return null;
    const kinds = [...new Set(tracks.map((track) => (track.kind || "standard").toLowerCase()))];
    captionLog.info("player caption tracks", { videoId, client: client.clientName, count: tracks.length, kinds: kinds.join(", ") });
    const track =
      tracks.find((item) => (item.languageCode ?? "").startsWith("en") && item.kind !== "asr") ??
      tracks.find((item) => (item.languageCode ?? "").startsWith("en")) ??
      tracks[0];
    if (!track?.baseUrl) return null;
    const sep = track.baseUrl.includes("?") ? "&" : "?";
    const capRes = await fetch(`${track.baseUrl}${sep}fmt=json3`, {
      headers: { "User-Agent": client.userAgent },
      signal: ctrl.signal,
    });
    if (!capRes.ok) return null;
    const segments = parseCaptionFile(await capRes.text());
    return segments.length > 0 ? segments : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadYouTubeTranscript(videoId: string): Promise<LoadedTranscript> {
  if (!VIDEO_ID.test(videoId)) {
    return { ok: false, error: "video id was not a YouTube id" };
  }
  if (youtubeDataApiBlocked()) {
    return { ok: false, error: YOUTUBE_QUOTA_STOP_ERROR };
  }
  let owner: OwnerCaptionAttempt = { status: "skipped" };
  if (takeCaptionDownloadSlot()) {
    try {
      owner = await ownerCaptions(videoId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "owner captions failed";
      owner = { status: "error", error: redactOauthSecrets(message).slice(0, 300) };
    }
  } else {
    captionLog.info("caption download cap reached; skipping owner captions", { videoId });
  }
  if (owner.status === "error" && isYoutubeQuotaStop(owner.error)) {
    return { ok: false, error: owner.error };
  }
  if (owner.status === "ok" && transcriptIsUsable(owner.text)) {
    return assembleTranscriptResult(owner, null);
  }
  const playerSegments = await fetchPlayerCaptions(videoId);
  const playerText = playerSegments ? segmentsToText(playerSegments) : "";
  if (playerSegments && transcriptIsUsable(playerText)) {
    return assembleTranscriptResult(owner, { text: playerText, segments: playerSegments });
  }
  const segments = await fetchYouTubeTranscriptSegments(videoId);
  const text = segments ? segments.map((segment) => segment.text).join(" ").replace(/\s+/g, " ").trim() : "";
  const timedtext = segments && text ? { text, segments } : null;
  return assembleTranscriptResult(owner, timedtext);
}
