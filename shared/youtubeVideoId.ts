/**
 * Extract a YouTube video id from common URL shapes or a bare 11-char id.
 * Used for safe recording↔event matching (exact id only — no fuzzy titles).
 */
export function extractYoutubeVideoId(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/);
      if (m?.[1]) return m[1];
    }
  } catch {
    return null;
  }
  return null;
}

/** True when two URLs/ids refer to the same YouTube video. */
export function youtubeIdsMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const idA = extractYoutubeVideoId(a);
  const idB = extractYoutubeVideoId(b);
  return !!idA && !!idB && idA === idB;
}
