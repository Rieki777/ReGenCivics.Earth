/**
 * The Interoperability Circle's tools directory: what counts as a repo.
 *
 * The repo field is public, unauthenticated input that ends up rendered as a
 * link, so "looks like a URL" is not enough. A `javascript:` or `data:` URL in
 * an href is a script that runs on click, and React does not escape that for
 * you the way it escapes text. Only http and https are ever returned.
 */

/** Everything a directory entry carries, after cleaning. */
export interface InteropToolEntry {
  repoUrl: string | null;
  agent: string | null;
}

/**
 * Normalise a repo URL, or null if it is not one we will link to.
 *
 * Accepts a bare "github.com/owner/repo" by assuming https, because that is
 * what people paste. Rejects every other scheme, and anything that does not
 * parse at all.
 */
export function cleanRepoUrl(raw: string | undefined | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // A scheme-less paste is the common case; assume https rather than reject.
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // A host with no dot is not a repo someone else can open.
  if (!url.hostname.includes(".")) return null;
  const normalised = url.toString().replace(/\/+$/, "");
  return normalised.length <= 500 ? normalised : null;
}

/** The agent someone runs, as free text: a name, not an identifier. */
export function cleanAgent(raw: string | undefined | null): string | null {
  if (typeof raw !== "string") return null;
  const stripped = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .trim()
    .slice(0, 120);
  return stripped.length > 0 ? stripped : null;
}

/**
 * A short label for a repo, for lists: "owner/repo" where we can tell, else
 * the host. Never the raw URL, which is usually too long to read in a row.
 */
export function repoLabel(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    if (parts.length === 1) return `${u.hostname}/${parts[0]}`;
    return u.hostname;
  } catch {
    return url;
  }
}
