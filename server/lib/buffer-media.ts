/**
 * Buffer legacy REST media fields for updates/create.json.
 * Image URLs must be publicly reachable (Buffer fetches at publish time).
 * photo + thumbnail are both set — some networks require the thumbnail twin.
 */
export function appendBufferMedia(
  params: URLSearchParams,
  opts: { link?: string; imageUrl?: string },
): void {
  const imageUrl = opts.imageUrl?.trim();
  if (imageUrl) {
    params.append("media[photo]", imageUrl);
    params.append("media[thumbnail]", imageUrl);
  }
  const link = opts.link?.trim();
  if (link) {
    params.append("media[link]", link);
  }
}

/** True when the string looks like a usable public http(s) URL for Buffer media. */
export function isPublicHttpUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
